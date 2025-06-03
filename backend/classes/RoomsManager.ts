import {server} from "../classes/ServerFacade";
import {Scene} from "../components/Scene";

export class RoomsManager {

    rooms:any = [];

    createRoom (roomId:string) {
        const existRoom = this.rooms.find((el:any) => el.roomId === roomId);
        if (!existRoom) {
            const newRoom = {
                roomId: roomId,
                scene: new Scene(roomId)
            };
            this.rooms.push(newRoom);
            return true;
        } else {
            return false;
        }
    }

    getRoomScene (roomId:string) {
        const existRoom = this.rooms.find((el:any) => el.roomId === roomId);
        return existRoom && existRoom.scene;
    }
}
