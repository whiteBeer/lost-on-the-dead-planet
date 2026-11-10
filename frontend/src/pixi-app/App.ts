import * as PIXI from "pixi.js";
import axios from "axios";
import { Scene } from "./classes/Scene";
import { Control } from "./classes/Control";
import { io, Socket } from "socket.io-client";
import { BackendPerkOffer, BackendPlayer, BackendWeaponsConfig } from "./Types";
import { getRoomId } from "../utils/getRoomId";
import { Cursor } from "./classes/Cursor";
import { Hud } from "./classes/Hud";
import { ResourcesLoader } from "./classes/ResourcesLoader";

export type PerkOfferListener = (perks:BackendPerkOffer[] | null) => void;
export type DeathListener = (info:{ level:number, exp:number }) => void;
export type ArenaOverListener = (info:{ reason:string }) => void;
export type LobbyListener = (state:{
    phase:"lobby" | "playing",
    players:BackendPlayer[],
    meReady:boolean,
    isHost:boolean,
    canStart:boolean,
    hostSocketId:string | null
}) => void;
export type JoinRejectedListener = (info:{ reason:string, message:string }) => void;
export type PauseListener = (paused:boolean) => void;
export type SpectatorListener = (watching:boolean) => void;

export class App {

    private readonly backendUrl:string;
    private readonly apiBasePath:string;
    private pixiApp:PIXI.Application | null;
    private control:Control | null = null;
    private isInitialized = false;

    public $domEl:HTMLElement;
    public socket:Socket | null = null;
    public weaponsConfig:BackendWeaponsConfig | null = null;

    public scene:Scene | null = null;
    private cursor:Cursor | null = null;
    private hud:Hud | null = null;
    private perkOfferListener:PerkOfferListener | null = null;
    private deathListener:DeathListener | null = null;
    private arenaOverListener:ArenaOverListener | null = null;
    private lobbyListener:LobbyListener | null = null;
    private joinRejectedListener:JoinRejectedListener | null = null;
    private pauseListener:PauseListener | null = null;
    private spectatorListener:SpectatorListener | null = null;
    private spectating = false;
    private pendingName:string | null = null;
    private nameSentForSocket:string | null = null;
    private destroyed = false;

    constructor($domEl:HTMLElement) {
        this.$domEl = $domEl;
        this.pixiApp = new PIXI.Application();
        this.backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
        this.apiBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH || "";
    }

    async init() {
        if (this.isInitialized || this.destroyed) {
            return;
        }
        const roomId = getRoomId();
        if (!this.pixiApp) {
            this.pixiApp = new PIXI.Application();
        }
        await this.pixiApp.init({
            background: "#3d4a2e",
            resizeTo: window,
            antialias: true
        });
        if (this.destroyed) {
            return;
        }

        await ResourcesLoader.loadAssets();
        if (this.destroyed) {
            return;
        }

        this.socket = io(this.backendUrl, {
            path: this.apiBasePath + "/socket.io",
            extraHeaders: { "room-id": roomId },
            autoConnect: false
        });

        try {
            await axios.put(this.backendUrl + this.apiBasePath + "/api/rooms/" + roomId);
        } catch (error) {
            console.log("Room was created early. Join room.");
        }
        if (this.destroyed) {
            this.socket?.disconnect();
            this.socket = null;
            return;
        }

        this.socket.on("joinRejected", (data:{ reason?:string, message?:string }) => {
            this.joinRejectedListener?.({
                reason: data?.reason || "rejected",
                message: data?.message || "Не удалось войти в комнату"
            });
        });

        this.socket.on("connect", async () => {
            if (this.destroyed) {
                this.socket?.disconnect();
                return;
            }
            await this.loadGame(roomId);
            if (this.destroyed) {
                return;
            }
            // Игрок уже в комнате — сразу шлём имя из localStorage / лобби
            await this.flushPlayerName();
        });

        this.socket.connect();
        this.isInitialized = true;
    }

    public onPerkOffer(listener:PerkOfferListener) {
        this.perkOfferListener = listener;
    }

    public notifyPerkOffer(perks:BackendPerkOffer[] | null) {
        this.perkOfferListener?.(perks);
    }

    public onDeath(listener:DeathListener) {
        this.deathListener = listener;
    }

    public onArenaOver(listener:ArenaOverListener) {
        this.arenaOverListener = listener;
    }

    public onLobby(listener:LobbyListener) {
        this.lobbyListener = listener;
    }

    public onJoinRejected(listener:JoinRejectedListener) {
        this.joinRejectedListener = listener;
    }

    public onPause(listener:PauseListener) {
        this.pauseListener = listener;
    }

    public onSpectator(listener:SpectatorListener) {
        this.spectatorListener = listener;
    }

    public watch() {
        this.spectating = true;
        this.spectatorListener?.(true);
        this.scene?.followLive();
    }

    public setReady(ready = true) {
        this.socket?.emit("playerReady", { ready });
    }

    public setPlayerName(name:string) {
        this.pendingName = String(name || "").trim().slice(0, 16);
        void this.flushPlayerName();
    }

    private async flushPlayerName() {
        const name = this.pendingName;
        const socketId = this.socket?.id;
        if (!socketId || name === null) {
            return;
        }
        // Не дублируем тот же PUT для того же сокета
        if (this.nameSentForSocket === `${socketId}:${name}`) {
            return;
        }
        const roomId = getRoomId();
        try {
            await axios.put(
                `${this.backendUrl}${this.apiBasePath}/api/rooms/${roomId}/players/${encodeURIComponent(socketId)}/name`,
                { name }
            );
            this.nameSentForSocket = `${socketId}:${name}`;
        } catch (e) {
            console.error("Failed to set player name:", e);
        }
    }

    public startGame() {
        this.socket?.emit("startGame");
    }

    public togglePause() {
        this.socket?.emit("togglePause");
    }

    public isPlaying() {
        return this.scene?.phase === "playing";
    }

    public isPaused() {
        return !!this.scene?.paused;
    }

    public getControl() {
        return this.control;
    }

    public reloadWeapon() {
        this.scene?.mePlayer?.reload();
    }

    public pickPerk(perkId:string) {
        this.socket?.emit("pickPerk", { perkId });
        this.notifyPerkOffer(null);
    }

    private notifyLobby(
        phase:"lobby" | "playing",
        players:BackendPlayer[],
        hostSocketId:string | null = null,
        canStart = false
    ) {
        const meId = this.socket?.id || "";
        const me = players.find(p => p.socketId === meId);
        const hostId = hostSocketId;
        this.lobbyListener?.({
            phase,
            players,
            meReady: !!me?.isReady,
            isHost: !!meId && meId === hostId,
            canStart,
            hostSocketId: hostId
        });
    }

    public meDied() {
        const me = this.scene?.mePlayer;
        this.deathListener?.({
            level: me?.level || 1,
            exp: me?.exp || 0
        });
        this.control?.destroy();
        this.cursor?.destroy();
        this.hud?.destroy();
        this.control = null;
        this.cursor = null;
        this.hud = null;
    }

    public meRespawn() {
        this.scene?.mePlayer?.show();
        if (!this.control) {
            this.loadPlayer();
        }
    }

    private async loadGame(roomId:string) {
        if (this.destroyed || !this.socket) {
            return;
        }
        try {
            const { data: backendScene } = await axios.get(`${this.backendUrl}${this.apiBasePath}/api/rooms/${roomId}/scene`);
            this.weaponsConfig = backendScene?.configs?.weapons;

            this.scene = new Scene(this, backendScene);
            this.socket?.on("gameOver", (data:{ reason?:string }) => {
                if (this.scene) {
                    this.scene.wave = 0;
                    this.scene.waveAnnouncing = false;
                }
                this.arenaOverListener?.({ reason: data?.reason || "allDead" });
            });
            this.socket?.on("lobbyUpdated", (data:{
                phase?:"lobby" | "playing",
                players?:BackendPlayer[],
                hostSocketId?:string | null,
                canStart?:boolean
            }) => {
                const phase = data.phase || "lobby";
                if (this.scene) this.scene.phase = phase;
                this.notifyLobby(
                    phase,
                    data.players || [],
                    data.hostSocketId ?? null,
                    !!data.canStart
                );
            });
            this.socket?.on("gameStarted", (data:{
                phase?:"lobby" | "playing",
                players?:BackendPlayer[],
                hostSocketId?:string | null
            }) => {
                if (this.scene) {
                    this.scene.phase = "playing";
                    this.scene.paused = false;
                }
                this.pauseListener?.(false);
                this.notifyLobby(
                    "playing",
                    data.players || [],
                    data.hostSocketId ?? null,
                    false
                );
            });
            this.socket?.on("gamePaused", (data:{ paused?:boolean }) => {
                const paused = !!data.paused;
                if (this.scene) this.scene.paused = paused;
                this.pauseListener?.(paused);
            });
            this.socket?.on("sceneReset", (data:{
                phase?:"lobby" | "playing",
                players?:BackendPlayer[],
                hostSocketId?:string | null,
                canStart?:boolean
            }) => {
                if (this.scene) this.scene.paused = false;
                this.pauseListener?.(false);
                if (data.phase === "lobby") {
                    this.spectating = false;
                    this.spectatorListener?.(false);
                    this.notifyLobby(
                        "lobby",
                        data.players || [],
                        data.hostSocketId ?? null,
                        !!data.canStart
                    );
                    if (this.scene?.mePlayer && !this.control) {
                        this.meRespawn();
                    }
                }
            });
            this.pixiApp?.stage.addChild(this.scene.getPixiObj());

            this.loadPlayer();
            if (!this.scene.mePlayer && backendScene.phase === "playing") {
                this.spectating = true;
                this.spectatorListener?.(true);
                this.scene.followLive();
            }
            this.notifyLobby(
                backendScene.phase === "playing" ? "playing" : "lobby",
                backendScene.players || [],
                backendScene.hostSocketId ?? null,
                !!backendScene.canStart
            );

            this.pixiApp?.ticker.add(this.gameLoop.bind(this));
        } catch (e) {
            console.error("Failed to load scene:", e);
        }
    }

    private loadPlayer() {
        const mePlayer = this.scene?.mePlayer;
        if (!mePlayer) {
            return;
        }
        this.control = new Control(this);
        mePlayer.show();
        this.cursor = new Cursor(this, mePlayer);
        this.pixiApp?.stage.addChild(this.cursor.getPixiObj());
        this.hud = new Hud(this, mePlayer);
        this.pixiApp?.stage.addChild(this.hud.getPixiObj());
    }

    private gameLoop(ticker:PIXI.Ticker) {
        // HUD/баннер живут даже без Control (смерть / пауза)
        this.hud?.update(ticker.deltaMS);

        if (this.spectating) {
            this.scene?.followLive();
            return;
        }

        if (!this.scene || !this.control || !this.scene.mePlayer) return;
        if (this.scene.phase !== "playing" || this.scene.paused) return;

        const player = this.scene.mePlayer;
        const deltaSec = ticker.deltaMS / 1000;
        const move = this.control.moveVector();
        const dx = move.x;
        const dy = move.y;

        if (dx !== 0 || dy !== 0) {
            player.animationPlay();
            player.moveTo(
                player.x + dx * player.getSpeed() * deltaSec,
                player.y + dy * player.getSpeed() * deltaSec
            );
            this.scene.centerScene();
        } else {
            player.animationStop();
        }

        const mouseCoords = this.control.getMouseCoords();
        let isRotationChanged = false;
        if (this.control.isTouch) {
            const aim = this.control.aimAngle;
            if (aim !== null) {
                isRotationChanged = player.setRotation(aim);
            }
        } else {
            isRotationChanged = player.refreshRotationAngleToMouse(mouseCoords);
        }

        const mouseMovement = this.control.getAndResetMouseMovement();
        if (!this.control.isTouch && this.control.isSpace()) {
            if (mouseMovement.x !== 0 || mouseMovement.y !== 0) {
                this.scene.incrementTxTy(mouseMovement.x, mouseMovement.y);
            }
        }
        const scrollDelta = this.control.getAndResetScrollDelta();
        if (!this.control.isTouch && scrollDelta !== 0) {
            this.scene.incrementScale(scrollDelta > 0 ? -0.1 : 0.1);
        }

        if (dx !== 0 || dy !== 0 || isRotationChanged) {
            this.socket?.emit("playerMoved", player.getCoords());
        }

        if (this.control.isFiring) {
            player.fire();
        }

        if (this.control.isKey("KeyR")) {
            player.reload();
        }

        player.weapon?.update(ticker.deltaMS);
        this.cursor?.update(mouseCoords);
    }

    addTicker(tickerFunc:(ticker:PIXI.Ticker) => void) {
        this.pixiApp?.ticker.add(tickerFunc);
    }

    removeTicker(tickerFunc:(ticker:PIXI.Ticker) => void) {
        this.pixiApp?.ticker.remove(tickerFunc);
    }

    getScreenWidth() {
        return this.pixiApp?.screen.width || 0;
    }

    getView() {
        return this.pixiApp?.canvas as HTMLCanvasElement;
    }

    destroy() {
        this.destroyed = true;
        this.control?.destroy();
        this.control = null;
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        if (!this.pixiApp) {
            return;
        }
        try {
            // true = удалить canvas из DOM; { children: true } = спрайты и текстуры
            this.pixiApp.destroy(true, { children: true, texture: true });
        } catch (e) {
            console.error("Failed to destroy pixi:", e);
        }
        this.pixiApp = null;
        this.isInitialized = false;
    }
}
