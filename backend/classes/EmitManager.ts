import { Server } from "socket.io";

export class EmitManager {
    private static instance: EmitManager;
    private io: Server | null = null;

    static getInstance(): EmitManager {
        if (!EmitManager.instance) {
            EmitManager.instance = new EmitManager();
        }
        return EmitManager.instance;
    }

    initialize(io: Server): void {
        this.io = io;
    }

    emit(roomId: string, eventName: string, ...data: any[]): void {
        if (!this.io) {
            console.warn("Socket.io server not initialized. Call initialize first.");
            return;
        }
        const room = this.io.to(roomId);
        room.emit.apply(room, [eventName, ...data]);
    }

    emitSceneChanged(roomId: string, sceneData: any): void {
        this.emit(roomId, "sceneChanged", sceneData);
    }
}

export const emitManager = EmitManager.getInstance();