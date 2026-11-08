import * as PIXI from "pixi.js";
import Player from "./players/Player";
import { PlayersCollection } from "./players";
import { EnemiesCollection } from "./enemies";
import { MissilesCollection } from "./missiles";
import { PickupsCollection } from "./pickups";
import { App } from "../App";
import { BackendScene } from "../Types";
import { ResourcesLoader } from "./ResourcesLoader";
import { Effects } from "./Effects";

export class Scene {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;

    width:number;
    height:number;
    scale = 1.2;
    tx = 0;
    ty = 0;
    marginX = 0;
    marginY = 0;
    /** Отступ рамки арены со всех сторон (совпадает с серверным клампом). */
    edgePadX = 100;
    edgePadY = 100;

    mePlayer:Player | null = null;
    playersCollection:PlayersCollection;
    enemiesCollection:EnemiesCollection;
    missilesCollection:MissilesCollection;
    pickupsCollection:PickupsCollection;
    effects:Effects;

    groundLayer:PIXI.Container;
    corpsesLayer:PIXI.Container;
    entitiesLayer:PIXI.Container;
    fxLayer:PIXI.Container;

    wave = 0;
    waveAnnouncing = false;
    phase:"lobby" | "playing" | "won" = "lobby";
    paused = false;

    constructor(app:App, backendScene:BackendScene) {
        this.app = app;

        this.width = backendScene.width;
        this.height = backendScene.height;
        this.edgePadX = backendScene.edgePadX ?? backendScene.edgePadY ?? 100;
        this.edgePadY = backendScene.edgePadY ?? 100;
        this.wave = backendScene.wave || 0;
        this.waveAnnouncing = !!backendScene.waveAnnouncing;
        this.phase = backendScene.phase === "playing" || backendScene.phase === "won"
            ? backendScene.phase
            : "lobby";
        this.paused = !!backendScene.paused;

        this.groundLayer = new PIXI.Container();
        this.corpsesLayer = new PIXI.Container();
        this.entitiesLayer = new PIXI.Container();
        this.fxLayer = new PIXI.Container();

        this.pixiObj = this.initGraphics();

        this.playersCollection = new PlayersCollection(app, this);
        this.enemiesCollection = new EnemiesCollection(app, this, backendScene);
        this.missilesCollection = new MissilesCollection(app, this, backendScene);
        this.pickupsCollection = new PickupsCollection(app, this, backendScene);
        this.effects = new Effects(app, this.fxLayer);

        const mePlayer = this.playersCollection.initPlayers(backendScene.players);
        if (mePlayer) {
            this.setMePlayer(mePlayer);
        } else {
            throw new Error("Me player not found");
        }

        this.app.socket?.on("sceneChanged", (newScene:BackendScene) => {
            this.playersCollection.updatePlayers(newScene.players);
            this.enemiesCollection.enemiesFromBackendScene(newScene);
            this.pickupsCollection.fromBackendScene(newScene);
            this.wave = newScene.wave || this.wave;
        });

        this.app.socket?.on("sceneReset", (newScene:BackendScene) => {
            this.clearCorpses();
            this.playersCollection.updatePlayers(newScene.players);
            this.enemiesCollection.enemiesFromBackendScene(newScene);
            this.pickupsCollection.fromBackendScene(newScene);
            this.wave = newScene.wave || 0;
            this.phase = newScene.phase === "playing" || newScene.phase === "won"
                ? newScene.phase
                : "lobby";
            this.paused = false;
        });

        this.app.socket?.on("gamePaused", (data:{ paused?:boolean }) => {
            this.paused = !!data.paused;
        });

        this.app.socket?.on("waveStarted", (data:{ wave:number, announcing?:boolean }) => {
            this.wave = data.wave;
            this.waveAnnouncing = data.announcing !== false;
        });

        this.app.socket?.on("waveCleared", () => {
            this.waveAnnouncing = false;
        });

        this.app.socket?.on("enemyDied", (data:{
            x:number, y:number, tint?:number, spriteKey?:string,
            width?:number, height?:number
        }) => {
            this.addCorpse(data.x, data.y, data.spriteKey, data.tint, data.width, data.height);
        });
    }

    getPixiObj() {
        return this.pixiObj;
    }

    addToScene(pixiObj:PIXI.Container<PIXI.ContainerChild>) {
        this.entitiesLayer.addChild(pixiObj);
    }

    removeFromScene(pixiObj:PIXI.Container<PIXI.ContainerChild>) {
        if (pixiObj.parent) {
            pixiObj.parent.removeChild(pixiObj);
        }
    }

    setMePlayer(mePlayer:Player) {
        this.mePlayer = mePlayer;
        this.centerScene();
    }

    getMePlayer() {
        if (this.mePlayer) {
            return this.mePlayer;
        } else {
            throw new Error("Me player not found");
        }
    }

    incrementTxTy(dtx:number, dty:number) {
        this.tx += dtx;
        this.ty += dty;
        this.updateScene();
    }

    incrementScale(val:number) {
        this.scale = Math.max(0.4, Math.min(2.5, this.scale + val));
        this.centerScene();
    }

    centerScene() {
        if (this.mePlayer) {
            this.tx = (window.innerWidth / 2) - this.mePlayer.x * this.scale;
            this.ty = (window.innerHeight / 2) - this.mePlayer.y * this.scale;

            const maxTx = this.marginX * this.scale;
            const minTx = window.innerWidth - this.width * this.scale - this.marginX * this.scale;
            const maxTy = this.marginY * this.scale;
            const minTy = window.innerHeight - this.height * this.scale - this.marginY * this.scale;

            if (this.width * this.scale > window.innerWidth) {
                this.tx = Math.min(maxTx, Math.max(minTx, this.tx));
            }
            if (this.height * this.scale > window.innerHeight) {
                this.ty = Math.min(maxTy, Math.max(minTy, this.ty));
            }
            this.updateScene();
        }
    }

    updateScene() {
        this.pixiObj.scale = this.scale;
        this.pixiObj.x = this.tx;
        this.pixiObj.y = this.ty;
    }

    addCorpse(
        x:number, y:number, spriteKey?:string, tint?:number,
        width?:number, height?:number
    ) {
        const size = Math.max(width || 0, height || 0, 1);
        const group = new PIXI.Container();
        group.position.set(x, y);

        this.addDeathBloodStains(group, size);

        const tex = spriteKey ? ResourcesLoader.getTexture(spriteKey) : null;
        if (tex) {
            const sprite = new PIXI.Sprite(tex);
            sprite.anchor.set(0.5);
            ResourcesLoader.fitSprite(sprite, size);
            sprite.tint = 0x555555;
            sprite.alpha = 0.75;
            if (tint) {
                sprite.tint = this.darkenTint(tint);
            }
            sprite.rotation = Math.random() * Math.PI * 2;
            group.addChild(sprite);
        } else {
            const blob = new PIXI.Graphics();
            blob.ellipse(0, 0, size * 0.4, size * 0.26).fill({
                color: tint || 0x442222,
                alpha: 0.7
            });
            group.addChild(blob);
        }

        this.corpsesLayer.addChild(group);

        while (this.corpsesLayer.children.length > 120) {
            const oldest = this.corpsesLayer.children[0];
            this.corpsesLayer.removeChild(oldest);
            oldest.destroy({ children: true });
        }
    }

    /** Пятна крови под/вокруг трупа — остаются, пока жив corpse-слой. */
    private addDeathBloodStains(group:PIXI.Container, size:number) {
        const scale = Math.max(0.55, Math.min(1.6, size / 90));
        const stains = new PIXI.Graphics();

        // Крупное пятно под телом
        stains.ellipse(
            (Math.random() - 0.5) * 6 * scale,
            (Math.random() - 0.5) * 4 * scale,
            (18 + Math.random() * 14) * scale,
            (11 + Math.random() * 8) * scale
        ).fill({ color: 0x2a0606, alpha: 0.88 });

        stains.ellipse(
            (Math.random() - 0.5) * 10 * scale,
            (Math.random() - 0.5) * 8 * scale,
            (10 + Math.random() * 8) * scale,
            (6 + Math.random() * 5) * scale
        ).fill({ color: 0x5a0c0c, alpha: 0.75 });

        // Разбрызги вокруг
        const splashCount = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < splashCount; i++) {
            const ang = Math.random() * Math.PI * 2;
            const dist = (12 + Math.random() * 28) * scale;
            const sx = Math.cos(ang) * dist;
            const sy = Math.sin(ang) * dist * 0.75;
            const rw = (3 + Math.random() * 7) * scale;
            const rh = (2 + Math.random() * 4) * scale;
            stains.ellipse(sx, sy, rw, rh).fill({
                color: Math.random() > 0.45 ? 0x7a1010 : 0x3d0808,
                alpha: 0.55 + Math.random() * 0.3
            });
        }

        // Мелкие капли
        for (let i = 0; i < 6; i++) {
            const ang = Math.random() * Math.PI * 2;
            const dist = (8 + Math.random() * 36) * scale;
            stains.circle(
                Math.cos(ang) * dist,
                Math.sin(ang) * dist * 0.8,
                (0.8 + Math.random() * 2.2) * scale
            ).fill({ color: 0x9b1515, alpha: 0.7 });
        }

        stains.rotation = Math.random() * Math.PI * 2;
        group.addChild(stains);
    }

    clearCorpses() {
        [...this.corpsesLayer.children].forEach(child => {
            this.corpsesLayer.removeChild(child);
            child.destroy({ children: true });
        });
    }

    private darkenTint(tint:number) {
        const r = ((tint >> 16) & 0xff) * 0.35;
        const g = ((tint >> 8) & 0xff) * 0.35;
        const b = (tint & 0xff) * 0.35;
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    private initGraphics() {
        const container = new PIXI.Container();
        const groundTex = ResourcesLoader.getTexture("ground");
        // Расширяем текстуру далеко за арену, чтобы по краям экрана не было синей пустоты
        const pad = 2500;
        const tile = 512;

        if (groundTex) {
            for (let x = -pad; x < this.width + pad; x += tile) {
                for (let y = -pad; y < this.height + pad; y += tile) {
                    const sprite = new PIXI.Sprite(groundTex);
                    sprite.x = x;
                    sprite.y = y;
                    sprite.width = tile;
                    sprite.height = tile;
                    this.groundLayer.addChild(sprite);
                }
            }
        } else {
            const rect = new PIXI.Graphics();
            rect.rect(-pad, -pad, this.width + pad * 2, this.height + pad * 2).fill(0x3a4a2a);
            this.groundLayer.addChild(rect);
        }

        // Затемнение за игровой зоной: edgePadX / edgePadY со всех сторон
        const padX = this.edgePadX;
        const padY = this.edgePadY;
        const outside = new PIXI.Graphics();
        const dim = { color: 0x000000, alpha: 0.38 };
        outside.rect(-pad, -pad, this.width + pad * 2, pad + padY).fill(dim);
        outside.rect(-pad, this.height - padY, this.width + pad * 2, pad + padY).fill(dim);
        outside.rect(-pad, padY, pad + padX, this.height - padY * 2).fill(dim);
        outside.rect(this.width - padX, padY, pad + padX, this.height - padY * 2).fill(dim);
        this.groundLayer.addChild(outside);

        const border = new PIXI.Graphics();
        border
            .rect(padX, padY, this.width - padX * 2, this.height - padY * 2)
            .stroke({ color: 0x1a1a1a, width: 3, alpha: 0.85 });
        this.groundLayer.addChild(border);

        container.addChild(this.groundLayer);
        container.addChild(this.corpsesLayer);
        container.addChild(this.entitiesLayer);
        container.addChild(this.fxLayer);

        this.tx = window.innerWidth / 2 - this.width / 2;
        this.ty = window.innerHeight / 2 - this.height / 2;
        container.x = this.tx;
        container.y = this.ty;
        container._zIndex = -1;

        return container;
    }
}
