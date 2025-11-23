import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { RoomsManager } from "./classes/RoomsManager";
import { PlayerJSON } from "./types";
import { emitManager } from "./classes/EmitManager";

export class AppSocketServer {
    private io: Server;
    private roomsManager: RoomsManager;

    constructor(httpServer: HttpServer, roomsManager: RoomsManager) {
        this.roomsManager = roomsManager;
        this.io = new Server(httpServer, {
            cors: { origin: "*" }
        });
        emitManager.initialize(this.io);
        this.setupSocketHandlers();
    }

    emit (roomId:string, eventName:string, ...data:any[]) {
        // console.log("WebSocket emit: ", eventName, data);
        const room = this.io.to(roomId);
        room.emit.apply(room, [eventName, ...data]);
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