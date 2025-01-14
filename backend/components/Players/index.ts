import { Player } from "../../types";
import { Scene } from "../Scene";
import { config } from "../../config";

export class Players {

    scene:Scene;
    playerColors:string[] = config.playerColors || [];
    players:Player[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    getPlayers () {
        return this.players;
    }

    addPlayer (socketId:string) {
        const playersColors = this.players.map((el:Player) => el.color);
        const color = this.playerColors.find((el:string) => {
            return playersColors.indexOf(el) === -1;
        });
        if (color) {
            const newPlayer = {
                socketId: socketId,
                color: color,
                pageX: Math.round(Math.random() * this.scene.width),
                pageY: Math.round(Math.random() * this.scene.height),
                rotation: Math.random() * 6
            };
            this.players.push(newPlayer);
            return newPlayer;
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