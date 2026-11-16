import { Server as SocketIOServer } from "socket.io";

export class EmitManager {
    private io:SocketIOServer | null = null;

    constructor(io:SocketIOServer) {
        this.io = io;
    }

    emit(roomId:string, eventName:string, ...data:any[]):void {
        if (!this.io) {
            console.warn("Socket.io server not initialized. Call initialize first.");
            return;
        }
        const room = this.io.to(roomId);
        room.emit.apply(room, [eventName, ...data]);
    }

    emitVolatile(roomId:string, eventName:string, data:object):void {
        if (!this.io) {
            console.warn("Socket.io server not initialized. Call initialize first.");
            return;
        }
        this.io.to(roomId).volatile.emit(eventName, data);
    }

    emitSceneChanged(roomId:string, sceneData:any):void {
        this.emit(roomId, "sceneChanged", sceneData);
    }
}