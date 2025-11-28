import {App} from "../../App";
import {BackendPlayer} from "../../Types";
import Player from "./Player";

interface IPlayerDisconnected {
    socketId: string;
}

export class PlayersCollection {

    app:App;

    players:Player[] = [];

    constructor (app:App) {
        this.app = app;

        this.app.socket?.on("playersUpdated", (backendPlayers:BackendPlayer[]) => {
            this.initPlayers(backendPlayers);
        });

        this.app.socket?.on("playerMoved", (params:BackendPlayer) => {
            if (params.socketId !== this.app.socket?.id) {
                const player = this.players.find(el => el.socketId === params.socketId);
                if (player) {
                    player.moveTo(params.pageX, params.pageY, params.rotation);
                } else {
                    const anotherPlayer = new Player(app, params);
                    this.players.push(anotherPlayer);
                    app.pixiApp.stage.addChild(anotherPlayer.pixiObj);
                }
            }
        });

        this.app.socket?.on("playerDisconnected", (params:IPlayerDisconnected) => {
            const player = this.players.find(el => el.socketId === params.socketId);
            if (player) {
                player.remove();
                this.players = this.players.filter(el => el.socketId !== params.socketId);
            }
        });
    }

    initPlayers (backendPlayers:BackendPlayer[]) {
        let mePlayer;
        backendPlayers.forEach((player: BackendPlayer) => {
            if (this.players.map(el => el.socketId).indexOf(player.socketId) === -1) {
                const p = new Player(this.app, player);
                this.players.push(p);
                this.app.pixiApp.stage.addChild(p.pixiObj);
                if (p.socketId === this.app.socket?.id) {
                    mePlayer = p;
                }
            }
        });
        return mePlayer;
    }

    getPlayers () {
        return this.players;
    }
}