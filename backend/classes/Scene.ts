import { config } from "../config";
import { Player } from "../types";

export class BackendScene {

    playerColors:string[] = config.playerColors;
    players:Player[] = [];

    addPlayer (socketId:string) {
        const playersColors = this.players.map((el:Player) => el.color);
        const color = this.playerColors.find((el:string) => {
            return playersColors.indexOf(el) === -1;
        });
        if (color) {
            this.players.push({
                socketId: socketId,
                color: color
            });
        } else {
            console.log("Cannot find color for player");
        }
    }

    updatePlayer (socketId:string, params:Player) {
        let currentPlayerIndex = -1;
        this.players = this.players.map((el:Player, i:number) => {
            if (el.socketId === socketId) {
                currentPlayerIndex = i;
                return {
                    ...el,
                    pageX: params.pageX,
                    pageY: params.pageY,
                    rotation: params.rotation
                };
            } else {
                return el;
            }
        });

        return currentPlayerIndex;
    }

    deletePlayer (socketId:string) {
        this.players = this.players.filter((it:Player) => it.socketId !== socketId);
    }
}