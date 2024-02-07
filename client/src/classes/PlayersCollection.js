import * as PIXI from "pixi.js";
import {io} from "socket.io-client";
import Player from "./Player";

export class PlayersCollection {

    app = null;
    socket = null;
    players = [];

    constructor (app, mePlayer) {
        this.app = app;
        this.players = [mePlayer];

        app.stage.addChild(mePlayer.pixiObj);

        this.socket = io.connect('http://localhost:7789');

        this.socket.emit('playerMoved', mePlayer.getCoords());

        this.socket.on('allPlayers', (backendPlayers) => {
            backendPlayers.forEach(player => {
                if (player.socketId !== this.socket.id) {
                    let anotherPlayer = new Player(app, {
                        x: player.pageX,
                        y: player.pageY,
                        color: player.color,
                        socketId: player.socketId
                    });
                    this.players.push(anotherPlayer);
                    app.stage.addChild(anotherPlayer.pixiObj);
                }
            });
        });

        this.socket.on('playerMoved', (params) => {
            if (params.socketId !== this.socket.id) {
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
                    app.stage.addChild(anotherPlayer.pixiObj);
                }
            } else {
                mePlayer.setColor(params.color);
            }
        });

        this.socket.on('userDisconnected', (params) => {
            let player = this.players.find(el => el.socketId === params.socketId);
            if (player) {
                player.remove();
                this.players = this.players.filter(el => el.socketId !== params.socketId);
            }
        });
    }
}

export default PlayersCollection;