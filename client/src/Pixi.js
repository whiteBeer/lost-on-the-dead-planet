import * as PIXI from "pixi.js";
import Player from "./classes/Player";
import Control from "./classes/Control";
import {io} from "socket.io-client";

let players = [];

export function Pixi () {
    const socket = io.connect('http://178.21.11.153:7789');
    const app = new PIXI.Application({
        background: '#1099bb',
        resizeTo: window,
    });

    const mePlayer = new Player(app, {color: "grey"});
    players.push(mePlayer);
    const control = new Control(app);

    app.stage.addChild(mePlayer.pixiObj);

    control.onKey("KeyW", (delta) => {
        mePlayer.moveY(-mePlayer.speed * delta);
        socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onKey("KeyS", (delta) => {
        mePlayer.moveY(mePlayer.speed * delta);
        socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onKey("KeyA", (delta) => {
        mePlayer.moveX(-mePlayer.speed * delta);
        socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onKey("KeyD", (delta) => {
        mePlayer.moveX(mePlayer.speed * delta);
        socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onMouseMove(() => {
        socket.emit('playerMoved', mePlayer.getCoords());
    });

    app.ticker.add((delta) => {
        mePlayer.refreshRotationAngleToMouse(control.getMouseCoords());
    });

    /////

    socket.emit('playerMoved', mePlayer.getCoords());
    socket.on('allPlayers', (backendPlayers) => {
        backendPlayers.forEach(player => {
            if (player.socketId !== socket.id) {
                let anotherPlayer = new Player(app, {
                    x: player.pageX,
                    y: player.pageY,
                    color: player.color,
                    socketId: player.socketId
                });
                players.push(anotherPlayer);
                app.stage.addChild(anotherPlayer.pixiObj);
            }
        });
    });

    socket.on('playerMoved', (params) => {
        if (params.socketId !== socket.id) {
            let player = players.find(el => el.socketId === params.socketId);
            if (player) {
                player.moveTo(params.pageX, params.pageY, params.rotation);
            } else {
                let anotherPlayer = new Player(app, {
                    x: params.pageX,
                    y: params.pageY,
                    color: params.color,
                    socketId: params.socketId
                });
                players.push(anotherPlayer);
                app.stage.addChild(anotherPlayer.pixiObj);
            }
        } else {
            mePlayer.setColor(params.color);
        }
    });

    socket.on('userDisconnected', (params) => {
        let player = players.find(el => el.socketId === params.socketId);
        if (player) {
            player.remove();
            players = players.filter(el => el.socketId !== params.socketId);
        }
    });


    return app.view;
}

export default Pixi;