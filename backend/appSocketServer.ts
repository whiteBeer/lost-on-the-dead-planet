import { Server as SocketIOServer, Socket } from "socket.io";
import { RoomsManager } from "./classes/RoomsManager";
import { PlayerJSON } from "./types";
import { EmitManager } from "./classes/EmitManager";
import { WEAPONS } from "./configs/Weapons";

export class AppSocketServer {
    private io:SocketIOServer;
    private roomsManager:RoomsManager;

    constructor(io:SocketIOServer, roomsManager:RoomsManager, emitManager:EmitManager) {
        this.io = io;
        this.roomsManager = roomsManager;
        this.setupSocketHandlers();
    }

    private setupSocketHandlers():void {
        this.io.on("connection", (socket:Socket) => {
            const roomId = (socket.handshake.headers["room-id"] as string) || "";
            const roomScene = this.roomsManager.getRoomScene(roomId);

            if (roomScene) {
                this.handleGameConnection(socket, roomId, roomScene);
            } else {
                socket.disconnect();
            }
        });
    }

    private triggerReload(player:any, roomId:string, socketId:string) {
        const weapon = player.weapon;

        const started = weapon.reload((newAmmo:number) => {
            this.emitToRoom(roomId, "playersReloadFinished", {
                socketId: socketId,
                newAmmo: newAmmo
            });
        });

        if (started) {
            this.emitToRoom(roomId, "playersReloadStarted", {
                socketId: socketId,
                duration: weapon.getReloadTime()
            });
        }
    }

    private handleGameConnection(socket:Socket, roomId:string, roomScene:any):void {
        socket.join(roomId);

        if (!roomScene.isJoinable()) {
            roomScene.addSpectator(socket.id);
            socket.on("disconnect", () => {
                roomScene.removeSpectator(socket.id);
            });
            return;
        }
        const scenePlayers = roomScene.playersCollection;
        const newPlayer = scenePlayers.addPlayer(socket.id);

        if (newPlayer) {
            console.log("Connected: " + socket.id, newPlayer.toJSON());

            socket.on("playerReady", (params:{ ready?:boolean } = {}) => {
                const ready = params?.ready !== false;
                roomScene.setPlayerReady(socket.id, ready);
            });

            socket.on("startGame", () => {
                roomScene.startGameByHost(socket.id);
            });

            socket.on("togglePause", () => {
                if (!roomScene.isLobby()) {
                    roomScene.togglePause();
                }
            });

            socket.on("playerMoved", (params:PlayerJSON) => {
                if (!roomScene.isLobby() && !roomScene.isPaused()) {
                    this.handlePlayerMoved(socket, roomId, scenePlayers, params);
                }
            });

            socket.on("playerReload", () => {
                if (roomScene.isLobby() || roomScene.isPaused()) return;
                const player = roomScene.playersCollection.getPlayerById(socket.id);
                if (player) {
                    this.triggerReload(player, roomId, socket.id);
                }
            });

            socket.on("missileCreate", (params:any) => {
                if (roomScene.isLobby() || roomScene.isPaused()) return;
                this.handleMissileCreate(roomScene, params, socket.id);
            });

            socket.on("pickup", () => {
                if (roomScene.isLobby() || roomScene.isPaused()) return;
                roomScene.pickupsCollection.tryPickup(socket.id);
            });

            socket.on("pickPerk", (params:{ perkId?:string }) => {
                if (roomScene.isLobby() || roomScene.isPaused()) return;
                const player = roomScene.playersCollection.getPlayerById(socket.id);
                if (player && params?.perkId) {
                    player.pickPerk(params.perkId);
                }
            });

            socket.on("disconnect", () => {
                this.handlePlayerDisconnect(socket, roomId, scenePlayers);
            });

            this.emitToRoom(roomId, "playersUpdated", scenePlayers.getPlayersJSON());
            roomScene.emitLobbyState();
        } else {
            socket.emit("joinRejected", {
                reason: "roomFull",
                message: "Комната заполнена"
            });
            socket.disconnect(true);
        }
    }

    private handlePlayerMoved(socket:Socket, roomId:string, scenePlayers:any, params:PlayerJSON):void {
        const currentPlayerIndex = scenePlayers.updatePlayer(socket.id, params);
        if (currentPlayerIndex !== -1) {
            this.emitToRoom(roomId, "playersMoved", scenePlayers.getPlayersJSON()[currentPlayerIndex]);
        }
    }

    private handleMissileCreate(roomScene:any, params:any, socketId:string):void {
        const player = roomScene.playersCollection.getPlayerById(socketId);
        if (!player || player.isDead) {
            return;
        }

        const canShoot = player.weapon.tryShoot();

        if (!canShoot) {
            if (player.weapon.ammo <= 0 && !player.weapon.isReloading) {
                this.triggerReload(player, roomScene.getRoomId(), socketId);
            }
            return;
        }

        if (player.stats.selfDamage > 0) {
            player.takeDamage(player.stats.selfDamage);
        }

        const config = WEAPONS[player.weapon.id];
        const pellets = config?.pellets || 1;
        const cone = config?.pelletCone || 0;
        const extra = player.weapon.getExtraBullets();
        const totalBullets = pellets + extra;
        const baseRotation = player.weapon.applySpread(params.rotation);

        for (let i = 0; i < totalBullets; i++) {
            let rotation = baseRotation;
            if (pellets > 1) {
                const t = totalBullets === 1 ? 0 : (i / (totalBullets - 1)) - 0.5;
                rotation = baseRotation + t * cone;
            } else if (extra > 0 && i > 0) {
                rotation = baseRotation + (Math.random() - 0.5) * 0.15;
            }

            roomScene.missilesCollection.createMissile({
                ...params,
                weaponType: player.weapon.id,
                rotation,
                ownerId: socketId,
                damage: player.weapon.getDamage(),
                speedInSecond: player.weapon.getBulletSpeed(),
                range: player.weapon.getRange(),
                pierce: player.weapon.getPierce()
            });
        }

        this.emitToRoom(roomScene.getRoomId(), "playerStats", {
            player: player.toJSON()
        });

        if (player.weapon.ammo <= 0 && !player.weapon.isReloading) {
            this.triggerReload(player, roomScene.getRoomId(), socketId);
        }
    }

    private handlePlayerDisconnect(socket:Socket, roomId:string, scenePlayers:any):void {
        scenePlayers.deletePlayer(socket.id);
        this.emitToRoom(roomId, "playersDisconnected", { socketId: socket.id });
        console.log("Disconnected ", socket.id);

        // Последний игрок ушёл — комнату закрываем сразу, зрителей тоже
        if (scenePlayers.getPlayers().length === 0) {
            console.log("Room removed (empty): ", roomId);
            this.io.to(roomId).emit("joinRejected", {
                reason: "roomClosed",
                message: "Комната закрыта"
            });
            this.io.in(roomId).disconnectSockets(true);
            this.roomsManager.removeRoom(roomId);
        }
    }

    public emitToRoom(roomId:string, eventName:string, data:any):void {
        this.io.to(roomId).emit(eventName, data);
    }
}
