import * as PIXI from "pixi.js";
import Scene from "./classes/Scene";
import Control from "./classes/Control";
import {io} from "socket.io-client";

export class App {

    pixiApp = null;

    socket = null;
    scene = null;
    control = null;

    constructor (env) {

        this.pixiApp = new PIXI.Application({
            background: '#1099bb',
            resizeTo: window,
        });

        const socketUrl = env === "dev" ? 'http://localhost:7789' : 'http://178.21.11.153:7789';
        this.socket = io.connect(socketUrl);
        this.control = new Control(this);
        this.scene = new Scene(this);

        this.control.onKey("KeyW", (delta) => {
            this.scene.mePlayer.moveY(-this.scene.mePlayer.speed * delta);
            this.socket.emit('playerMoved', this.scene.mePlayer.getCoords());
        });
        this.control.onKey("KeyS", (delta) => {
            this.scene.mePlayer.moveY(this.scene.mePlayer.speed * delta);
            this.socket.emit('playerMoved', this.scene.mePlayer.getCoords());
        });
        this.control.onKey("KeyA", (delta) => {
            this.scene.mePlayer.moveX(-this.scene.mePlayer.speed * delta);
            this.socket.emit('playerMoved', this.scene.mePlayer.getCoords());
        });
        this.control.onKey("KeyD", (delta) => {
            this.scene.mePlayer.moveX(this.scene.mePlayer.speed * delta);
            this.socket.emit('playerMoved', this.scene.mePlayer.getCoords());
        });
        this.control.onMouseMove(() => {
            this.socket.emit('playerMoved', this.scene.mePlayer.getCoords());
        });
        this.control.onMousePressed(() => {
            this.scene.mePlayer.fire();
        });

        this.pixiApp.ticker.add((delta) => {
            if (document.querySelector('#game').matches(':hover')) {
                this.scene.mePlayer.refreshRotationAngleToMouse(this.control.getMouseCoords());
            }
        });


        return this.pixiApp.view;
    }
}