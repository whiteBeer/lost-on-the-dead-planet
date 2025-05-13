import * as PIXI from "pixi.js";
import {App} from "../../App";
import {BackendPlayer} from "../../Types";
import Player from "./Player";

export class PlayersCollection {

    app:App;

    players:Player[] = [];

    constructor (app:App) {
        this.app = app;

        this.app.socket?.on("allPlayers", (backendPlayers:BackendPlayer[]) => {
            backendPlayers.forEach((player: BackendPlayer) => {
                if (this.players.map(el => el.socketId).indexOf(player.socketId) === -1) {
                    const p = new Player(app, player);
                    this.players.push(p);
                    app.pixiApp.stage.addChild(p.pixiObj);
                    if (p.socketId === this.app.socket.id) {
                        this.app.scene?.setMePlayer(p);
                    }
                }
            });
        });

        this.app.socket?.on("playerMoved", (params:BackendPlayer) => {
            if (params.socketId !== this.app.socket.id) {
                const player = this.players.find(el => el.socketId === params.socketId);
                if (player) {
                    player.moveTo(params.pageX, params.pageY, params.rotation);
                } else {
                    const anotherPlayer = new Player(app, {
                        x: params.pageX,
                        y: params.pageY,
                        color: params.color,
                        socketId: params.socketId
                    });
                    this.players.push(anotherPlayer);
                    app.pixiApp.stage.addChild(anotherPlayer.pixiObj);
                }
            }
        });

        this.app.socket?.on("playerDisconnected", (params:any) => {
            const player = this.players.find(el => el.socketId === params.socketId);
            if (player) {
                player.remove();
                this.players = this.players.filter(el => el.socketId !== params.socketId);
            }
        });
    }

    getPlayers () {
        return this.players;
    }
}