import { Server as SocketIOServer, Socket } from "socket.io";
import { RoomsManager } from "./classes/RoomsManager";
import { PlayerJSON } from "./types";
import { EmitManager } from "./classes/EmitManager";

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
                duration: weapon.config.reloadTime
            });
        }
    }

    private handleGameConnection(socket:Socket, roomId:string, roomScene:any):void {
        socket.join(roomId);
        const scenePlayers = roomScene.playersCollection;
        const newPlayer = scenePlayers.addPlayer(socket.id);

        if (newPlayer) {
            console.log("Connected: " + socket.id, newPlayer.toJSON());

            socket.on("playerMoved", (params:PlayerJSON) => {
                this.handlePlayerMoved(socket, roomId, scenePlayers, params);
            });

            socket.on("playerReload", () => {
                const player = roomScene.playersCollection.getPlayerById(socket.id);
                if (player) {
                    this.triggerReload(player, roomId, socket.id);
                }
            });

            socket.on("missileCreate", (params:any) => {
                this.handleMissileCreate(roomScene, params, socket.id);
            });

            socket.on("disconnect", () => {
                this.handlePlayerDisconnect(socket, roomId, scenePlayers);
            });

            this.emitToRoom(roomId, "playersUpdated", scenePlayers.getPlayersJSON());
        }
    }

    private handlePlayerMoved(socket:Socket, roomId:string, scenePlayers:any, params:PlayerJSON):void {
        const currentPlayerIndex = scenePlayers.updatePlayer(socket.id, params);
        if (currentPlayerIndex !== -1) {
            this.emitToRoom(roomId, "playerMoved", scenePlayers.getPlayersJSON()[currentPlayerIndex]);
        }
    }

    private handleMissileCreate(roomScene:any, params:any, socketId:string):void {
        const player = roomScene.playersCollection.getPlayerById(socketId);
        if (!player) {
            return;
        }

        const canShoot = player.weapon.tryShoot();

        if (!canShoot) {
            if (player.weapon.ammo <= 0 && !player.weapon.isReloading) {
                this.triggerReload(player, roomScene.getRoomId(), socketId);
            }
            return;
        }

        const spreadRotation = player.weapon.applySpread(params.rotation);

        roomScene.missilesCollection.createMissile({
            ...params,
            weaponType: player.weapon.id,
            rotation: spreadRotation,
            ownerId: socketId
        });
    }

    private handlePlayerDisconnect(socket:Socket, roomId:string, scenePlayers:any):void {
        scenePlayers.deletePlayer(socket.id);
        this.emitToRoom(roomId, "playerDisconnected", { socketId: socket.id });
        console.log("Disconnected ", socket.id);

        if (scenePlayers.getPlayers().length === 0) {
            setTimeout(() => {
                const room = this.roomsManager.getRoomScene(roomId);
                if (room && room.playersCollection.getPlayers().length === 0) {
                    console.log("Room removed: ", roomId);
                    this.roomsManager.removeRoom(roomId);
                }
            }, 60000);
        }
    }

    public emitToRoom(roomId:string, eventName:string, data:any):void {
        this.io.to(roomId).emit(eventName, data);
    }
}