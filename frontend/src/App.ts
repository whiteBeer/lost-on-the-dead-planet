import * as PIXI from "pixi.js";
import axios from "axios";
import {Toolbar} from "./Toolbar";
import {Scene} from "./classes/Scene";
import {Control} from "./classes/Control";
import {io, Socket} from "socket.io-client";

export class App {

    pixiApp:PIXI.Application;
    backendUrl:string;
    socket:Socket;
    toolbar:Toolbar|null = null;
    scene:Scene|null = null;
    control:Control|null = null;
    move2ButtonsKof = 0.7071; // cos(45)

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
        this.toolbar = new Toolbar(this);
        this.control = new Control(this);
        this.scene = new Scene(this, backendScene);

        this.control.onKey("KeyW", (ticker:PIXI.Ticker) => {
            if (this.scene?.mePlayer) {
                let dy = -this.scene?.mePlayer.speedInSecond * ticker.deltaMS / 1000;
                let dx = 0;
                if (this.control?.isKey("KeyA") || this.control?.isKey("KeyD")) {
                    dy *= this.move2ButtonsKof;
                    dx = (this.control?.isKey("KeyD") ? -1 : 1) * dy;
                    this.scene?.mePlayer?.moveX(dx);
                }
                this.scene?.mePlayer?.moveY(dy);
                this.socket.emit("playerMoved", this.scene?.mePlayer.getCoords());
            }
        });
        this.control.onKey("KeyS", (ticker:PIXI.Ticker) => {
            if (this.scene?.mePlayer) {
                let dy = this.scene?.mePlayer.speedInSecond * ticker.deltaMS / 1000;
                let dx = 0;
                if (this.control?.isKey("KeyD") || this.control?.isKey("KeyA")) {
                    dy *= this.move2ButtonsKof;
                    dx = (this.control?.isKey("KeyA") ? -1 : 1) * dy;
                    this.scene?.mePlayer?.moveX(dx);
                }
                this.scene?.mePlayer?.moveY(dy);
                this.socket.emit("playerMoved", this.scene?.mePlayer.getCoords());
            }
        });
        this.control.onKey("KeyA", (ticker:PIXI.Ticker) => {
            if (this.scene?.mePlayer && !this.control?.isKey("KeyW") && !this.control?.isKey("KeyS")) {
                const dx = -this.scene?.mePlayer.speedInSecond * ticker.deltaMS / 1000;
                this.scene?.mePlayer?.moveX(dx);
                this.socket.emit("playerMoved", this.scene?.mePlayer.getCoords());
            }
        });
        this.control.onKey("KeyD", (ticker:PIXI.Ticker) => {
            if (this.scene?.mePlayer && !this.control?.isKey("KeyS") && !this.control?.isKey("KeyW")) {
                const dx = this.scene?.mePlayer.speedInSecond * ticker.deltaMS / 1000;
                this.scene?.mePlayer?.moveX(dx);
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