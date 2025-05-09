import {PlayerJSON} from "../../types";
import {Scene} from "../Scene";
import {config} from "../../config";

export class Players {

    scene:Scene;
    playerColors:string[] = config.playerColors || [];
    players:PlayerJSON[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    getPlayers () {
        return this.players;
    }

    addPlayer (socketId:string) {
        const playersColors = this.players.map((el:PlayerJSON) => el.color);
        const color = this.playerColors.find((el:string) => {
            return playersColors.indexOf(el) === -1;
        });
        if (color) {
            const newPlayer = {
                socketId: socketId,
                color: color,
                length: 40,
                width: 16,
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

    updatePlayer (socketId:string, params:PlayerJSON) {
        let currentPlayerIndex = -1;
        this.players = this.players.map((el:PlayerJSON, i:number) => {
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
        this.players = this.players.filter((it:PlayerJSON) => it.socketId !== socketId);
    }
}