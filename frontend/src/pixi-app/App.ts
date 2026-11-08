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
    phase:"lobby" | "playing" | "won",
    players:BackendPlayer[],
    meReady:boolean,
    isHost:boolean,
    canStart:boolean,
    hostSocketId:string | null
}) => void;
export type JoinRejectedListener = (info:{ reason:string, message:string }) => void;
export type PauseListener = (paused:boolean) => void;
export type PlayerStateListener = (player:BackendPlayer) => void;
export type VictoryListener = (info:{ wave:number, players:BackendPlayer[] }) => void;

export class App {

    private readonly backendUrl:string;
    private readonly apiBasePath:string;
    private pixiApp:PIXI.Application;
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
    private playerStateListener:PlayerStateListener | null = null;
    private inventoryToggleListener:(open?:boolean) => void = () => undefined;
    private victoryListener:VictoryListener | null = null;
    private uiBlocked = false;
    private lastMoveState = "";

    constructor($domEl:HTMLElement) {
        this.$domEl = $domEl;
        this.pixiApp = new PIXI.Application();
        this.backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
        this.apiBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH || "";
    }

    async init() {
        if (this.isInitialized) {
            return;
        }
        const roomId = getRoomId();
        await this.pixiApp.init({
            background: "#3d4a2e",
            resizeTo: window,
            antialias: true
        });

        await ResourcesLoader.loadAssets();

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

        // Не пускаем в уже идущую игру ещё до сокета
        try {
            const { data } = await axios.get(`${this.backendUrl}${this.apiBasePath}/api/rooms/${roomId}/scene`);
            if (data?.phase === "playing" || data?.phase === "won") {
                this.joinRejectedListener?.({
                    reason: "gameInProgress",
                    message: "Игра уже идёт — войти нельзя"
                });
                this.isInitialized = true;
                return;
            }
        } catch (e) {
            console.error("Failed to check room phase:", e);
        }

        this.socket.on("joinRejected", (data:{ reason?:string, message?:string }) => {
            this.joinRejectedListener?.({
                reason: data?.reason || "rejected",
                message: data?.message || "Не удалось войти в комнату"
            });
        });

        this.socket.on("connect", async () => {
            await this.loadGame(roomId);
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

    public onPlayerState(listener:PlayerStateListener) {
        this.playerStateListener = listener;
    }

    public onInventoryToggle(listener:(open?:boolean) => void) {
        this.inventoryToggleListener = listener;
    }

    public onVictory(listener:VictoryListener) {
        this.victoryListener = listener;
    }

    public setUiBlocked(blocked:boolean) {
        this.uiBlocked = blocked;
    }

    public setSprintToggle(on:boolean) {
        if (this.control) this.control.sprintToggle = on;
    }

    public dash() {
        const player = this.scene?.mePlayer;
        if (player) this.socket?.emit("playerDash", { rotation: player.getCoords().rotation });
    }

    public reload() {
        this.scene?.mePlayer?.reload();
    }

    public pickup() {
        this.socket?.emit("pickup");
    }

    public equipInventory(slot:number) {
        this.socket?.emit("inventoryEquip", { slot });
    }

    public moveInventory(from:number, to:number) {
        this.socket?.emit("inventoryMove", { from, to });
    }

    public mergeInventory(from:number, to:number) {
        this.socket?.emit("inventoryMerge", { from, to });
    }

    public dropInventory(slot:number) {
        this.socket?.emit("inventoryDrop", { slot });
    }

    public getWeaponName(id:string) {
        return this.weaponsConfig?.[id]?.name || id;
    }

    public setReady(ready = true) {
        this.socket?.emit("playerReady", { ready });
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

    public pickPerk(perkId:string) {
        this.socket?.emit("pickPerk", { perkId });
        this.notifyPerkOffer(null);
    }

    private notifyLobby(
        phase:"lobby" | "playing" | "won",
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
            this.socket?.on("gameWon", (data:{ wave?:number, players?:BackendPlayer[] }) => {
                if (this.scene) {
                    this.scene.phase = "won";
                    this.scene.paused = false;
                }
                this.victoryListener?.({ wave: data.wave || 10, players: data.players || [] });
            });
            this.socket?.on("playerStats", (data:{ player?:BackendPlayer }) => {
                const player = data.player;
                if (player && player.socketId === this.socket?.id) {
                    this.playerStateListener?.(player);
                }
            });
            this.socket?.on("lobbyUpdated", (data:{
                phase?: "lobby" | "playing" | "won",
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
                phase?: "lobby" | "playing" | "won",
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
            this.socket?.on("sceneReset", (data: {
                phase?: "lobby" | "playing" | "won",
                players?:BackendPlayer[],
                hostSocketId?:string | null,
                canStart?:boolean
            }) => {
                if (this.scene) this.scene.paused = false;
                this.pauseListener?.(false);
                if (data.phase === "lobby") {
                    this.notifyLobby(
                        "lobby",
                        data.players || [],
                        data.hostSocketId ?? null,
                        !!data.canStart
                    );
                }
            });
            this.pixiApp.stage.addChild(this.scene.getPixiObj());

            this.loadPlayer();
            const initialMe = backendScene.players?.find((p:BackendPlayer) => p.socketId === this.socket?.id);
            if (initialMe) this.playerStateListener?.(initialMe);
            this.notifyLobby(
                backendScene.phase === "playing" ? "playing" : "lobby",
                backendScene.players || [],
                backendScene.hostSocketId ?? null,
                !!backendScene.canStart
            );

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
        // HUD/баннер живут даже без Control (смерть / пауза)
        this.hud?.update(ticker.deltaMS);

        if (!this.scene || !this.control || !this.scene.mePlayer) return;
        if (this.scene.phase !== "playing" || this.scene.paused) return;

        const player = this.scene.mePlayer;
        const deltaSec = ticker.deltaMS / 1000;

        if (this.control.consumeKey("Tab") || this.control.consumeKey("KeyI")) {
            this.inventoryToggleListener();
        }
        if (!this.uiBlocked) {
            if (this.control.consumeKey("Space")) this.dash();
            if (this.control.consumeKey("KeyE")) this.pickup();
            if (this.control.consumeKey("KeyR")) player.reload();
        }

        const movement = this.uiBlocked ? { x: 0, y: 0 } : this.control.getMoveVector();
        const dx = movement.x;
        const dy = movement.y;
        const sprinting = !this.uiBlocked && this.control.sprinting && player.stamina > 0;
        const aiming = !this.uiBlocked && this.control.aimDown;
        const speed = player.getBaseSpeed() * (sprinting && !aiming ? 1.55 : 1) * (aiming ? 0.72 : 1);

        if (dx !== 0 || dy !== 0) {
            player.animationPlay();
            player.moveTo(
                player.x + dx * speed * deltaSec,
                player.y + dy * speed * deltaSec
            );
            this.scene.centerScene();
        } else {
            player.animationStop();
        }

        const mouseCoords = this.control.getMouseCoords();
        let isRotationChanged = false;
        const touchAim = this.control.getAimAngle();
        if (!this.uiBlocked && touchAim !== null && this.control.isTouch) {
            const oldRotation = player.getCoords().rotation;
            player.moveTo(player.x, player.y, touchAim);
            isRotationChanged = oldRotation !== touchAim;
        } else if (!this.uiBlocked && !this.control.isTouch) {
            isRotationChanged = player.refreshRotationAngleToMouse(mouseCoords);
        }

        const mouseMovement = this.control.getAndResetMouseMovement();
        void mouseMovement;
        const scrollDelta = this.control.getAndResetScrollDelta();
        if (scrollDelta !== 0) {
            this.scene.incrementScale(scrollDelta > 0 ? -0.1 : 0.1);
        }

        const moveState = `${sprinting}:${aiming}`;
        if (dx !== 0 || dy !== 0 || isRotationChanged || moveState !== this.lastMoveState) {
            this.lastMoveState = moveState;
            this.socket?.emit("playerMoved", {
                ...player.getCoords(),
                sprinting,
                aiming
            });
        }

        if (!this.uiBlocked && this.control.isFiring) {
            player.fire();
        }

        player.weapon?.update(ticker.deltaMS);
        this.cursor?.update(mouseCoords);
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
