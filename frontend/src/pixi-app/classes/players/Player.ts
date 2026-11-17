import * as PIXI from "pixi.js";
import Weapon from "./Weapon";
import { App } from "../../App";
import { BackendPlayer, IMouseCoords } from "../../Types";
import { ResourcesLoader } from "../ResourcesLoader";

export class Player {

    public x = -1;
    public y = -1;
    public socketId = "";
    public clientId = "";
    public name = "Игрок";
    private color = "#ffffff";
    public weapon:Weapon;

    private app:App;
    private pixiObj:PIXI.Container;
    private bodyContainer:PIXI.Container | null = null;
    private speedInSecond = 150;
    private radius = 0;
    private rotation = 0;
    /** Шаг союзника по последней прямой, в пикселях на кадр при 60 Гц. */
    private dx = 0;
    private dy = 0;
    private tickerFunc:(ticker:PIXI.Ticker) => void;

    public health = 0;
    public maxHealth = 0;
    public level = 1;
    public dodge = 0;
    public crit = 0;
    public miss = 0;
    public armor = 0;
    public exp = 0;

    private bodySprite:PIXI.AnimatedSprite|null = null;
    private legsSprite:PIXI.AnimatedSprite|null = null;
    private nameLabel:PIXI.Text|null = null;
    private glow:PIXI.Graphics|null = null;
    private glowColor = 0xffffff;
    private hurtUntil = 0;
    private glowHurt = false;

    constructor(app:App, params:BackendPlayer) {
        this.app = app;
        this.socketId = params.socketId || "me";
        this.pixiObj = new PIXI.Container();

        const weaponConfig = this.app.weaponsConfig ? this.app.weaponsConfig[params.weapon.id] : null;
        if (!weaponConfig) {
            throw new Error(`Weapon config not found for ID: ${params.weapon.id}`);
        }
        this.weapon = new Weapon(app, this, weaponConfig);

        this.update(params);

        this.pixiObj = this.initGraphics();
        this.setDisplayName(params.name);
        this.applyTransform();
        this.tickerFunc = (ticker) => {
            this.stepRemote(ticker);
            this.syncGlow();
        };
        this.app.addTicker(this.tickerFunc);
    }

    public animationPlay():void {
        if (this.bodySprite && !this.bodySprite.playing) {
            this.bodySprite.play();
        }
    }

    public animationStop():void {
        if (this.bodySprite && this.bodySprite.playing) {
            this.bodySprite.stop();
        }
    }

    update(params:BackendPlayer, opts:{ syncTransform?:boolean } = {}) {
        if (params.clientId) this.clientId = params.clientId;
        if (params.socketId) this.socketId = params.socketId;
        if (params.color) this.color = params.color;
        // Позицию союзника ведёт playersMoved. Полный JSON ставит её только при респауне и первой постановке.
        const syncTransform = opts.syncTransform === true
            || this.x < 0
            || this.y < 0;
        if (syncTransform) {
            this.x = params.pageX;
            this.y = params.pageY;
            this.rotation = params.rotation;
            if (opts.syncTransform === true) {
                this.dx = 0;
                this.dy = 0;
            }
            this.applyTransform();
        }
        const damaged = this.health > 0 && params.health < this.health;
        this.health = params.health;
        this.maxHealth = params.maxHealth;
        this.radius = params.radius;
        this.level = params.level || this.level;
        if (typeof params.dodge === "number") {
            this.dodge = params.dodge;
        }
        if (typeof params.crit === "number") {
            this.crit = params.crit;
        }
        if (typeof params.miss === "number") {
            this.miss = params.miss;
        }
        if (typeof params.armor === "number") {
            this.armor = params.armor;
        }
        this.exp = params.exp || 0;
        if (params.speed) {
            this.speedInSecond = params.speed;
        }
        if (damaged) {
            this.hurtUntil = performance.now() + 250;
        }
        this.setHealth(this.health);
        if (params.isDead) this.hide();
        else this.show();
        if (params.name !== undefined) {
            this.setDisplayName(params.name);
        }
        if (params.weapon) {
            if (params.weapon.id && params.weapon.id !== this.weapon.id) {
                const cfg = this.app.weaponsConfig?.[params.weapon.id];
                if (cfg) {
                    this.weapon.switchConfig(params.weapon.id, cfg);
                }
            }
            this.weapon.updateState(params.weapon);
        }
        if (this.nameLabel) {
            this.nameLabel.y = -(this.radius || 13) - 12;
        }
    }

    setHealth(health:number) {
        if (health < this.health) {
            this.hurtUntil = performance.now() + 200;
        }
        this.health = health;
        this.pixiObj.alpha = 1;
        this.syncGlow();
    }

    remove() {
        this.app.removeTicker(this.tickerFunc);
        if (this.pixiObj.parent) {
            this.pixiObj.parent.removeChild(this.pixiObj);
        }
    }

    applyRemoteMove(snap:{
        pageX:number,
        pageY:number,
        rotation:number,
        moveRotation:number,
        speedInSecond:number,
        updatedAt:string
    }, serverCurrentDateTime:string) {
        const dirCos = Math.cos(snap.moveRotation);
        const dirSin = Math.sin(snap.moveRotation);
        const serverTime = new Date(serverCurrentDateTime).getTime();
        const updateTime = new Date(snap.updatedAt).getTime();
        const dt = Math.max(0, (serverTime - updateTime) / 1000);
        this.place(
            snap.pageX + dirCos * snap.speedInSecond * dt,
            snap.pageY + dirSin * snap.speedInSecond * dt,
            snap.rotation
        );
        this.dx = dirCos * (snap.speedInSecond / 60);
        this.dy = dirSin * (snap.speedInSecond / 60);
    }

    hide() {
        this.pixiObj.visible = false;
    }

    isVisible() {
        return this.pixiObj.visible;
    }

    show() {
        this.pixiObj.visible = true;
    }

    fire() {
        this.weapon.fire();
    }

    reload() {
        this.weapon.reload();
    }

    getPixiObj(){
        return this.pixiObj;
    }

    getSpeed() {
        return this.speedInSecond;
    }

    getCoords() {
        return {
            pageX: this.x,
            pageY: this.y,
            rotation: this.rotation
        };
    }

    getStageCoords() {
        const scale = this.app.scene?.scale || 1;
        const tx = this.app.scene?.tx || 0;
        const ty = this.app.scene?.ty || 0;
        return {
            pageX: this.x * scale + tx,
            pageY: this.y * scale + ty,
            rotation: this.rotation
        };
    }

    moveTo(x:number, y:number, rotation:number | null = null) {
        this.place(x, y, rotation);
    }

    private syncGlow() {
        const hurt = performance.now() < this.hurtUntil;
        if (!this.glow || hurt === this.glowHurt) {
            return;
        }
        this.glowHurt = hurt;
        this.glow.clear();
        this.glow.circle(0, 0, (this.radius || 13) * 1.65).fill(
            hurt
                ? { color: 0xff2a2a, alpha: 0.5 }
                : { color: this.glowColor, alpha: 0.16 }
        );
        const parent = this.glow.parent;
        if (parent) {
            const aboveBody = Math.max(0, parent.children.length - 2);
            parent.setChildIndex(this.glow, hurt ? aboveBody : 0);
        }
    }

    private stepRemote(ticker:PIXI.Ticker) {
        if (this.dx === 0 && this.dy === 0) {
            return;
        }
        if (this.socketId === this.app.socket?.id) {
            return;
        }
        if (this.app.scene?.paused || !this.pixiObj || this.pixiObj.destroyed) {
            return;
        }
        this.place(
            this.x + this.dx * ticker.deltaTime,
            this.y + this.dy * ticker.deltaTime,
            null
        );
    }

    private place(x:number, y:number, rotation:number | null) {
        if (!this.pixiObj || !this.app.scene) {
            return;
        }
        const margin = this.radius || 13;
        const edgePadX = this.app.scene.edgePadX || 0;
        const edgePadY = this.app.scene.edgePadY || 0;
        const minX = margin + edgePadX;
        const maxX = Math.max(minX, this.app.scene.width - margin - edgePadX);
        const minY = margin + edgePadY;
        const maxY = Math.max(minY, this.app.scene.height - margin - edgePadY);
        this.x = Math.min(maxX, Math.max(minX, x));
        this.y = Math.min(maxY, Math.max(minY, y));
        if (rotation !== null) {
            this.rotation = rotation;
        }
        this.applyTransform();
    }

    setRotation(rotation:number) {
        const oldRotation = this.rotation;
        this.rotation = rotation;
        this.applyTransform();
        return oldRotation !== rotation;
    }

    refreshRotationAngleToMouse(mouseCoords:IMouseCoords) {
        try {
            const stageCoords = this.getStageCoords();
            const diffX = mouseCoords.pageX - stageCoords.pageX;
            const diffY = mouseCoords.pageY - stageCoords.pageY;
            return this.setRotation(Math.atan2(diffY, diffX));
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    private setDisplayName(name?:string) {
        const next = (name || "Игрок").trim().slice(0, 16) || "Игрок";
        this.name = next;
        if (this.nameLabel) {
            this.nameLabel.text = next;
        }
    }

    /** Корень не крутится — только тело. Имя остаётся горизонтальным над игроком. */
    private applyTransform() {
        if (!this.pixiObj) {
            return;
        }
        this.pixiObj.x = this.x;
        this.pixiObj.y = this.y;
        this.pixiObj.rotation = 0;
        if (this.bodyContainer) {
            this.bodyContainer.rotation = this.rotation;
        }
    }

    private initGraphics() {
        const container = new PIXI.Container();
        this.bodyContainer = new PIXI.Container();

        const playerFrames = ResourcesLoader.getPlayerTextures();
        this.bodySprite = new PIXI.AnimatedSprite(playerFrames);
        this.bodySprite.animationSpeed = 0.5;
        this.bodySprite.anchor.set(0.5);
        this.bodySprite.width = this.radius * 2.5;
        this.bodySprite.height = this.radius * 3;
        this.bodySprite.rotation = -Math.PI / 2;
        const own = playerColor(this.color);
        this.bodySprite.tint = mixWhite(own, 0.90);
        this.bodyContainer.addChild(this.bodySprite);

        this.glowColor = mixWhite(own, 0.4);
        this.glow = new PIXI.Graphics();
        this.glow.circle(0, 0, (this.radius || 13) * 1.65).fill({ color: this.glowColor, alpha: 0.16 });
        container.addChild(this.glow);
        container.addChild(this.bodyContainer);

        this.nameLabel = new PIXI.Text({
            text: this.name,
            style: {
                fill: 0xffffff,
                fontSize: 11,
                fontFamily: "Segoe UI, Arial",
                fontWeight: "600",
                align: "center"
            }
        });
        this.nameLabel.anchor.set(0.5, 1);
        this.nameLabel.alpha = 0.55;
        this.nameLabel.x = 0;
        this.nameLabel.y = -(this.radius || 13) - 12;
        container.addChild(this.nameLabel);

        container.position.set(this.x, this.y);
        this.bodyContainer.rotation = this.rotation;

        return container;
    }
}

function playerColor(color:string):number {
    const named:Record<string, number> = { red: 0xe23b3b, blue: 0x3a78e0, white: 0xf4f4f4 };
    const known = named[color.toLowerCase()];
    if (known !== undefined) {
        return known;
    }
    const n = Number.parseInt(color.replace("#", ""), 16);
    return Number.isFinite(n) ? n : 0xffffff;
}

function mixWhite(color:number, white:number):number {
    const mix = (channel:number) => Math.round(channel + (255 - channel) * white);
    return (mix((color >> 16) & 255) << 16) | (mix((color >> 8) & 255) << 8) | mix(color & 255);
}

export default Player;
