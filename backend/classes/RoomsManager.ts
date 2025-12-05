import { Scene } from "../components/Scene";

export class RoomsManager {

    private rooms:Map<string, Scene> = new Map();

    public createRoom(roomId:string) {
        if (this.rooms.has(roomId)) {
            return null;
        }

        const newScene = new Scene(roomId);
        this.rooms.set(roomId, newScene);

        console.log(`Room created: ${roomId}. Total rooms: ${this.rooms.size}`);
        return newScene;
    }

    public  getRoomScene(roomId:string) {
        return this.rooms.get(roomId);
    }

    public removeRoom(roomId:string):void {
        const scene = this.rooms.get(roomId);
        if (scene) {
            if (typeof (scene as any).destroy === "function") {
                (scene as any).destroy();
            }

            this.rooms.delete(roomId);
            console.log(`Room deleted: ${roomId}. Total rooms: ${this.rooms.size}`);
        }
    }
}
