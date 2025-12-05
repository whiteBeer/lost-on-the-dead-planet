import * as PIXI from "pixi.js";
import axios from "axios";
import { Scene } from "./classes/Scene";
import { Control } from "./classes/Control";
import { io, Socket } from "socket.io-client";
import { BackendWeaponsConfig } from "./Types";
import { getRoomId } from "../utils/getRoomId";
import { Cursor } from "./classes/Cursor";
import { Hud } from "./classes/Hud";

export class App {

    private readonly backendUrl:string;
    private pixiApp:PIXI.Application;
    private control:Control | null = null;
    private isInitialized = false;

    public $domEl:HTMLElement;
    public socket:Socket | null = null;
    public weaponsConfig:BackendWeaponsConfig | null = null;

    public scene:Scene | null = null;
    private cursor:Cursor | null = null;
    private hud:Hud | null = null;

    constructor($domEl:HTMLElement) {
        this.$domEl = $domEl;
        this.pixiApp = new PIXI.Application();
        this.backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    }

    async init() {
        if (this.isInitialized) return;
        const roomId = getRoomId();
        await this.pixiApp.init({
            background: "#1099aa",
            resizeTo: window,
            antialias: true
        });

        this.socket = io(this.backendUrl, {
            extraHeaders: { "room-id": roomId }
        });

        try {
            await axios.put(this.backendUrl + "/api/rooms/" + roomId);
        } catch (error) {
            console.log("Room was created early. Join room.");
        }

        this.socket.on("connect", async () => {
            await this.loadGame(roomId);
        });

        this.isInitialized = true;
    }

    // TODO:
    public meDied() {
        this.control?.destroy();
        this.cursor?.destroy();
        this.hud?.destroy();
        this.control = null;
        this.cursor = null;
        this.hud = null;
    }

    public meRespawn() {
        if (!this.control) {
            this.loadPlayer();
        }
    }

    private async loadGame(roomId:string) {
        try {
            const { data: backendScene } = await axios.get(`${this.backendUrl}/api/rooms/${roomId}/scene`);
            this.weaponsConfig = backendScene?.configs?.weapons;

            this.scene = new Scene(this, backendScene);
            this.pixiApp.stage.addChild(this.scene.getPixiObj());

            this.loadPlayer();

            this.pixiApp.ticker.add(this.gameLoop.bind(this));
        } catch (e) {
            console.error("Failed to load scene:", e);
        }
    }

    private loadPlayer() {
        this.control = new Control(this);
        const mePlayer = this.scene?.getMePlayer();
        if (mePlayer) {
            this.scene?.mePlayer?.show();
            this.cursor = new Cursor(this, mePlayer);
            this.pixiApp.stage.addChild(this.cursor.getPixiObj());

            this.hud = new Hud(this, mePlayer);
            this.pixiApp.stage.addChild(this.hud.getPixiObj());
        }
    }

    private gameLoop(ticker:PIXI.Ticker) {
        if (!this.scene || !this.control || !this.scene.mePlayer) return;

        const player = this.scene.mePlayer;
        const deltaSec = ticker.deltaMS / 1000; // Дельта в секундах

        // 1. ОБРАБОТКА ДВИЖЕНИЯ (Векторная логика)
        let dx = 0;
        let dy = 0;

        if (this.control.isKey("KeyW")) dy -= 1;
        if (this.control.isKey("KeyS")) dy += 1;
        if (this.control.isKey("KeyA")) dx -= 1;
        if (this.control.isKey("KeyD")) dx += 1;

        // Нормализация диагонального движения
        if (dx !== 0 || dy !== 0) {
            // Вычисляем длину вектора
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
            const moveX = dx * player.getSpeed() * deltaSec;
            const moveY = dy * player.getSpeed() * deltaSec;
            player.moveTo(player.x + moveX, player.y + moveY);
            this.scene.centerScene();
        }

        // 2. ОБРАБОТКА МЫШИ (Поворот)
        const mouseCoords = this.control.getMouseCoords();
        const isRotationChanged = player.refreshRotationAngleToMouse(mouseCoords);

        // 3. ЗУМ И ПЕРЕМЕЩЕНИЕ КАМЕРЫ (DEBUG)
        // Если зажат пробел - двигаем карту
        const mouseMovement = this.control.getAndResetMouseMovement();
        if (this.control.isSpace()) {
            if (mouseMovement.x !== 0 || mouseMovement.y !== 0) {
                this.scene.incrementTxTy(mouseMovement.x, mouseMovement.y);
            }
        }
        // Если был скрол - зумим
        const scrollDelta = this.control.getAndResetScrollDelta();
        if (scrollDelta !== 0) {
            this.scene.incrementScale(scrollDelta > 0 ? -0.1 : 0.1);
        }

        // 4. СЕТЕВАЯ СИНХРОНИЗАЦИЯ
        // Отправляем данные, только если игрок двигался или поворачивался
        // (Можно добавить throttle, чтобы слать не 60 раз, а 30 раз в сек)
        if (dx !== 0 || dy !== 0 || isRotationChanged) {
            this.socket?.emit("playerMoved", player.getCoords());
        }

        // 5. СТРЕЛЬБА
        // Если мышь зажата -> стреляем
        if (this.control.getIsMousePressed()) {
            player.fire();
        }

        // Перезарядка
        if (this.control.isKey("KeyR")) {
            player.reload();
        }

        // 6. ОБНОВЛЕНИЕ СУЩНОСТЕЙ
        player.weapon?.update(ticker.deltaMS);
        this.cursor?.update(mouseCoords);
        this.hud?.update();
    }

    addTicker(tickerFunc:(ticker:PIXI.Ticker) => void) {
        this.pixiApp.ticker.add(tickerFunc);
    }

    removeTicker(tickerFunc:(ticker:PIXI.Ticker) => void) {
        this.pixiApp.ticker.remove(tickerFunc);
    }

    getScreenWidth() {
        return this.pixiApp.screen.width;
    }

    getView() {
        return this?.pixiApp.canvas;
    }

    destroy() {
        this.control?.destroy();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        // 3. Останавливаем Pixi (освобождаем WebGL контекст)
        // true = удалить canvas из DOM
        // { children: true } = удалить все спрайты и текстуры
        this.pixiApp.destroy(true, { children: true, texture: true });
    }
}