import * as PIXI from "pixi.js";
import axios from "axios";
import {Scene} from "./classes/Scene";
import {Control} from "./classes/Control";
import {io, Socket} from "socket.io-client";

export class App {

    pixiApp:PIXI.Application;
    backendUrl:string;
    socket:Socket;
    scene:Scene|null = null;
    control:Control|null = null;

    constructor (env:string)  {
        this.pixiApp = new PIXI.Application();
        this.backendUrl = env === "dev" ? "http://localhost:7789" : "http://178.21.11.153:7789";
        this.socket = io(this.backendUrl);
    }

    async init () {
        const backendScene = (await axios.get(this.backendUrl + "/api/scene")).data;
        await this.pixiApp.init({
            background: "#1099aa",
            resizeTo: window
        });
        this.control = new Control(this);
        this.scene = new Scene(this, backendScene);

        this.control.onKey("KeyW", (delta:number) => {
            if (this.scene?.mePlayer) {
                this.scene?.mePlayer?.moveY(-this.scene?.mePlayer.speed * delta);
                this.socket.emit("playerMoved", this.scene?.mePlayer.getCoords());
            }
        });
        this.control.onKey("KeyS", (delta:number) => {
            if (this.scene?.mePlayer) {
                this.scene?.mePlayer?.moveY(this.scene?.mePlayer.speed * delta);
                this.socket.emit("playerMoved", this.scene?.mePlayer.getCoords());
            }
        });
        this.control.onKey("KeyA", (delta:number) => {
            if (this.scene?.mePlayer) {
                this.scene?.mePlayer?.moveX(-this.scene?.mePlayer.speed * delta);
                this.socket.emit("playerMoved", this.scene?.mePlayer.getCoords());
            }
        });
        this.control.onKey("KeyD", (delta:number) => {
            if (this.scene?.mePlayer) {
                this.scene?.mePlayer?.moveX(this.scene?.mePlayer.speed * delta);
                this.socket.emit("playerMoved", this.scene?.mePlayer.getCoords());
            }
        });
        this.control.onMouseMove((e:MouseEvent) => {
            if (this.control?.isSpace()) {
                this.scene?.incrementTxTy(e.movementX, e.movementY);
            } else {
                if (this.scene?.mePlayer) {
                    this.socket.emit("playerMoved", this.scene?.mePlayer.getCoords());
                }
            }
        });
        this.control.onMousePressed(() => {
            if (this.scene?.mePlayer) {
                this.scene?.mePlayer.fire();
            }
        });
        this.control.onMouseWheel((wheelDirection) => {
            if (this.scene) {
                if (wheelDirection === "down") {
                    this.scene.incrementScale(-0.1);
                } else {
                    this.scene.incrementScale(0.1);
                }
            }
        });


        this.pixiApp.ticker.add(() => {
            if (this.scene?.mePlayer && this.control) {
                this.scene?.mePlayer.refreshRotationAngleToMouse(this.control.getMouseCoords());
            }
        });
    }

    getView () {
        return this?.pixiApp.canvas;
    }
}