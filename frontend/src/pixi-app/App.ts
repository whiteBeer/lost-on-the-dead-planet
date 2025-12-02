import * as PIXI from "pixi.js";
import axios from "axios";
import { Scene } from "./classes/Scene";
import { Control } from "./classes/Control";
import { io, Socket } from "socket.io-client";
import { BackendWeaponsConfig } from "./Types";
import { getRoomId } from "../utils/getRoomId";

export class App {

    pixiApp: PIXI.Application;
    $domEl: HTMLElement;
    backendUrl: string;
    socket: Socket | null = null;
    scene: Scene | null = null;
    control: Control | null = null;
    weaponsConfig: BackendWeaponsConfig | null = null;
    move2ButtonsKof = 0.7071; // cos(45)

    constructor($domEl: HTMLElement) {
        this.$domEl = $domEl;
        this.pixiApp = new PIXI.Application();
        this.backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    }

    disconnect() {
        this.socket?.disconnect();
    }

    async init() {
        const roomId = getRoomId();
        await this.pixiApp.init({
            background: "#1099aa",
            resizeTo: window
        });

        this.socket = io(this.backendUrl, {
            extraHeaders: {
                "room-id": roomId
            }
        });

        try {
            await axios.put(this.backendUrl + "/api/rooms/" + roomId);
        } catch (error) {
            console.log("Room was created early. Join room.");
        }

        this.socket.on("connect", async () => {
            const backendScene = (await axios.get(this.backendUrl + "/api/rooms/" + roomId + "/scene")).data;
            this.weaponsConfig = backendScene?.configs?.weapons;
            this.control = new Control(this);
            this.scene = new Scene(this, backendScene);

            this.control.onKey("KeyW", (ticker: PIXI.Ticker) => {
                if (this.scene?.mePlayer) {
                    let dy = -this.scene?.mePlayer.speedInSecond * ticker.deltaMS / 1000;
                    let dx = 0;
                    if (this.control?.isKey("KeyA") || this.control?.isKey("KeyD")) {
                        dy *= this.move2ButtonsKof;
                        dx = (this.control?.isKey("KeyD") ? -1 : 1) * dy;
                        this.scene?.mePlayer?.moveX(dx);
                    }
                    this.scene?.mePlayer?.moveY(dy);
                    this.socket?.emit("playerMoved", this.scene?.mePlayer.getCoords());
                }
            });
            this.control.onKey("KeyS", (ticker: PIXI.Ticker) => {
                if (this.scene?.mePlayer) {
                    let dy = this.scene?.mePlayer.speedInSecond * ticker.deltaMS / 1000;
                    let dx = 0;
                    if (this.control?.isKey("KeyD") || this.control?.isKey("KeyA")) {
                        dy *= this.move2ButtonsKof;
                        dx = (this.control?.isKey("KeyA") ? -1 : 1) * dy;
                        this.scene?.mePlayer?.moveX(dx);
                    }
                    this.scene?.mePlayer?.moveY(dy);
                    this.socket?.emit("playerMoved", this.scene?.mePlayer.getCoords());
                }
            });
            this.control.onKey("KeyA", (ticker: PIXI.Ticker) => {
                if (this.scene?.mePlayer && !this.control?.isKey("KeyW") && !this.control?.isKey("KeyS")) {
                    const dx = -this.scene?.mePlayer.speedInSecond * ticker.deltaMS / 1000;
                    this.scene?.mePlayer?.moveX(dx);
                    this.socket?.emit("playerMoved", this.scene?.mePlayer.getCoords());
                }
            });
            this.control.onKey("KeyD", (ticker: PIXI.Ticker) => {
                if (this.scene?.mePlayer && !this.control?.isKey("KeyS") && !this.control?.isKey("KeyW")) {
                    const dx = this.scene?.mePlayer.speedInSecond * ticker.deltaMS / 1000;
                    this.scene?.mePlayer?.moveX(dx);
                    this.socket?.emit("playerMoved", this.scene?.mePlayer.getCoords());
                }
            });
            this.control.onKey("KeyR", () => {
                if (this.scene?.mePlayer) {
                    this.scene.mePlayer.reload();
                }
            });
            this.control.onMouseMove((e: MouseEvent) => {
                if (this.control?.isSpace()) {
                    this.scene?.incrementTxTy(e.movementX, e.movementY);
                } else {
                    if (this.scene?.mePlayer) {
                        this.socket?.emit("playerMoved", this.scene?.mePlayer.getCoords());
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
        });

        this.pixiApp.ticker.add((ticker) => {
            if (this.scene && this.control) {
                if (this.scene.mePlayer) {
                    this.scene.mePlayer.refreshRotationAngleToMouse(this.control.getMouseCoords());
                    this.scene.mePlayer.weapon.update(ticker.deltaMS);
                    this.scene.cursor.update(this.control.getMouseCoords());
                    this.scene.hud.update();
                }
            }
        });
    }

    getCanvasOffsetTop() {
        return this.$domEl.offsetTop || 0;
    }

    getCanvasOffsetLeft() {
        return this.$domEl.offsetLeft || 0;
    }

    getView() {
        return this?.pixiApp.canvas;
    }
}