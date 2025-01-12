import { Server } from "socket.io";

import { config } from "../config";
import { Player } from "../types";
import { Enemies } from "./Enemies";
import { Missiles } from "./Missiles";

export class BackendScene {

    io:Server;

    width = 1000;
    height = 1000;
    playerColors:string[] = config.playerColors;
    players:Player[] = [];
    enemiesCollection:Enemies;
    missilesCollection:Missiles;

    constructor(io:Server) {
        this.io = io;
        this.enemiesCollection = new Enemies(this);
        this.missilesCollection = new Missiles(this);
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
                pageX: Math.round(Math.random() * this.width),
                pageY: Math.round(Math.random() * this.height),
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