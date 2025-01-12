import * as PIXI from "pixi.js";
import Scene from "./classes/Scene";
import Player from "./classes/Player";
import Players from "./classes/PlayersCollection";
import Enemies from "./classes/EnemiesCollection";
import Control from "./classes/Control";
import {io} from "socket.io-client";

export function App (env) {

    const socketUrl = env === "dev" ? 'http://localhost:7789' : 'http://178.21.11.153:7789';
    const socket = io.connect(socketUrl);

    const app = new PIXI.Application({
        background: '#1099bb',
        resizeTo: window,
    });
    app.socket = socket;
    const scene = new Scene(app);
    const mePlayer = new Player(app, {color: "#99B"});
    const players = new Players(app, mePlayer);
    const enemies = new Enemies(app, socket);
    const control = new Control(app);

    control.onKey("KeyW", (delta) => {
        mePlayer.moveY(-mePlayer.speed * delta);
        app.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onKey("KeyS", (delta) => {
        mePlayer.moveY(mePlayer.speed * delta);
        app.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onKey("KeyA", (delta) => {
        mePlayer.moveX(-mePlayer.speed * delta);
        app.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onKey("KeyD", (delta) => {
        mePlayer.moveX(mePlayer.speed * delta);
        app.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onMouseMove(() => {
        app.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onMousePressed(() => {
        mePlayer.fire();
    });

    app.ticker.add((delta) => {
        if (document.querySelector('#game').matches(':hover')) {
            mePlayer.refreshRotationAngleToMouse(control.getMouseCoords());
        }
    });


    return app.view;
}

export default App;