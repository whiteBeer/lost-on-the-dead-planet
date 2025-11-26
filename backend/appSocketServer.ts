import { Server as SocketIOServer, Socket } from "socket.io";
import { RoomsManager } from "./classes/RoomsManager";
import { PlayerJSON } from "./types";
import { EmitManager } from "./classes/EmitManager";

export class AppSocketServer {
    private io: SocketIOServer;
    private roomsManager: RoomsManager;

    constructor(io: SocketIOServer, roomsManager: RoomsManager, emitManager: EmitManager) {
        this.io = io;
        this.roomsManager = roomsManager;
        this.setupSocketHandlers();
    }

    private setupSocketHandlers(): void {
        this.io.on("connection", (socket: Socket) => {
            const roomId = (socket.handshake.headers["room-id"] as string) || "";
            const roomScene = this.roomsManager.getRoomScene(roomId);

            if (roomScene) {
                this.handleGameConnection(socket, roomId, roomScene);
            } else {
                socket.disconnect();
            }
        });
    }

    private handleGameConnection(socket: Socket, roomId: string, roomScene: any): void {
        socket.join(roomId);
        const scenePlayers = roomScene.playersCollection;
        const newPlayer = scenePlayers.addPlayer(socket.id);

        if (newPlayer) {
            console.log("Connected: " + socket.id, newPlayer);

            socket.on("playerMoved", (params: PlayerJSON) => {
                this.handlePlayerMoved(socket, roomId, scenePlayers, params);
            });

            socket.on("missileCreate", (params: any) => {
                this.handleMissileCreate(roomScene, params, socket.id);
            });

            socket.on("disconnect", () => {
                this.handlePlayerDisconnect(socket, roomId, scenePlayers);
            });

            this.emitToRoom(roomId, "allPlayers", scenePlayers.getPlayers());
        }
    }

    private handlePlayerMoved(socket: Socket, roomId: string, scenePlayers: any, params: PlayerJSON): void {
        const currentPlayerIndex = scenePlayers.updatePlayer(socket.id, params);
        if (currentPlayerIndex !== -1) {
            this.emitToRoom(roomId, "playerMoved", scenePlayers.getPlayers()[currentPlayerIndex]);
        }
    }

    private handleMissileCreate(roomScene: any, params: any, socketId: string): void {
        roomScene.missilesCollection.createMissile({
            ...params,
            ownerId: socketId
        });
    }

    private handlePlayerDisconnect(socket: Socket, roomId: string, scenePlayers: any): void {
        scenePlayers.deletePlayer(socket.id);
        this.emitToRoom(roomId, "playerDisconnected", { socketId: socket.id });
        console.log("Disconnected ", socket.id);

        if (scenePlayers.getPlayers().length === 0) {
            setTimeout(() => {
                const room = this.roomsManager.getRoomScene(roomId);
                if (room && room.playersCollection.getPlayers().length === 0) {
                    this.roomsManager.removeRoom(roomId);
                }
            }, 60000);
        }
    }

    public emitToRoom(roomId: string, eventName: string, data: any): void {
        this.io.to(roomId).emit(eventName, data);
    }
}