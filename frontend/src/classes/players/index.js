import * as PIXI from "pixi.js";
import Player from "./Player";

export class PlayersCollection {

    app = null;
    socket = null;
    players = [];
    mePlayer = null;

    constructor (app, mePlayer) {
        this.app = app;
        this.mePlayer = mePlayer;
        this.players = [mePlayer];

        app.pixiApp.stage.addChild(mePlayer.pixiObj);

        this.app.socket.on('allPlayers', (backendPlayers) => {
            backendPlayers.forEach(player => {
                if (
                    player.socketId !== this.app.socket.id &&
                    !this.players.find(el => el.socketId === player.socketId)
                ) {
                    let anotherPlayer = new Player(app, {
                        x: player.pageX,
                        y: player.pageY,
                        color: player.color,
                        socketId: player.socketId
                    });
                    this.players.push(anotherPlayer);
                    app.pixiApp.stage.addChild(anotherPlayer.pixiObj);
                } else {
                    this.mePlayer.setColor(player.color);
                    this.mePlayer.moveTo(player.pageX, player.pageY, player.rotation);
                    this.mePlayer.show();
                }
            });
        });

        this.app.socket.on('playerMoved', (params) => {
            if (params.socketId !== this.app.socket.id) {
                let player = this.players.find(el => el.socketId === params.socketId);
                if (player) {
                    player.moveTo(params.pageX, params.pageY, params.rotation);
                } else {
                    let anotherPlayer = new Player(app, {
                        x: params.pageX,
                        y: params.pageY,
                        color: params.color,
                        socketId: params.socketId
                    });
                    this.players.push(anotherPlayer);
                    app.pixiApp.stage.addChild(anotherPlayer.pixiObj);
                }
            } else {
                mePlayer.setColor(params.color);
            }
        });

        this.app.socket.on('playerDisconnected', (params) => {
            let player = this.players.find(el => el.socketId === params.socketId);
            if (player) {
                player.remove();
                this.players = this.players.filter(el => el.socketId !== params.socketId);
            }
        });
    }
}