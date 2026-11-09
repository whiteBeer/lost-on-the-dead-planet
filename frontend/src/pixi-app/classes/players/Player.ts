import * as PIXI from "pixi.js";
import Weapon from "./Weapon";
import { App } from "../../App";
import { BackendPlayer, IMouseCoords } from "../../Types";
import { ResourcesLoader } from "../ResourcesLoader";

export class Player {

    public x = -1;
    public y = -1;
    public socketId = "";
    public weapon:Weapon;
    public movementStopTimer:NodeJS.Timeout | null = null;

    private app:App;
    private pixiObj:PIXI.Container;
    private speedInSecond = 150;
    private radius = 0;
    private rotation = 0;

    public health = 0;
    public maxHealth = 0;
    public level = 1;
    public exp = 0;

    private bodySprite:PIXI.AnimatedSprite|null = null;
    private legsSprite:PIXI.AnimatedSprite|null = null;

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

        this.pixiObj = this.initGraphics(params);
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
        // Локальный игрок двигается на клиенте; серверные stats/scene не должны откатывать позицию.
        const isMe = this.socketId === this.app.socket?.id;
        const syncTransform = opts.syncTransform === true
            || !isMe
            || this.x < 0
            || this.y < 0;
        if (syncTransform) {
            this.x = params.pageX;
            this.y = params.pageY;
            this.rotation = params.rotation;
            if (this.pixiObj) {
                this.pixiObj.x = this.x;
                this.pixiObj.y = this.y;
                this.pixiObj.rotation = this.rotation;
            }
        }
        this.health = params.health;
        this.maxHealth = params.maxHealth;
        this.radius = params.radius;
        this.level = params.level || this.level;
        this.exp = params.exp || 0;
        if (params.speed) {
            this.speedInSecond = params.speed;
        }
        this.setHealth(this.health);
        if (params.weapon) {
            if (params.weapon.id && params.weapon.id !== this.weapon.id) {
                const cfg = this.app.weaponsConfig?.[params.weapon.id];
                if (cfg) {
                    this.weapon.switchConfig(params.weapon.id, cfg);
                }
            }
            this.weapon.updateState(params.weapon);
        }
    }

    setHealth(health:number) {
        this.health = health;
        this.pixiObj.alpha = 1;
    }

    remove() {
        if (this.pixiObj.parent) {
            this.pixiObj.parent.removeChild(this.pixiObj);
        }
    }

    hide() {
        this.pixiObj.visible = false;
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
        if (this.pixiObj && this.app.scene) {
            const margin = this.radius || 13;
            const edgePadX = this.app.scene.edgePadX || 0;
            const edgePadY = this.app.scene.edgePadY || 0;
            const minX = margin + edgePadX;
            const maxX = Math.max(minX, this.app.scene.width - margin - edgePadX);
            const minY = margin + edgePadY;
            const maxY = Math.max(minY, this.app.scene.height - margin - edgePadY);
            this.x = Math.min(maxX, Math.max(minX, x));
            this.y = Math.min(maxY, Math.max(minY, y));
            this.pixiObj.x = this.x;
            this.pixiObj.y = this.y;
            if (rotation !== null) {
                this.rotation = rotation;
                this.pixiObj.rotation = rotation;
            }
        }
    }

    refreshRotationAngleToMouse(mouseCoords:IMouseCoords) {
        try {
            const stageCoords = this.getStageCoords();
            const oldRotation = this.rotation;
            const diffX = mouseCoords.pageX - stageCoords.pageX;
            const diffY = mouseCoords.pageY - stageCoords.pageY;
            const rotation = Math.atan2(diffY, diffX);
            this.rotation = rotation;
            if (this.pixiObj) {
                this.pixiObj.rotation = rotation;
            }
            return oldRotation !== rotation;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    private initGraphics(params:BackendPlayer) {
        const container = new PIXI.Container();
        const playerFrames = ResourcesLoader.getPlayerTextures();
        this.bodySprite = new PIXI.AnimatedSprite(playerFrames);
        this.bodySprite.animationSpeed = 0.5;
        this.bodySprite.anchor.set(0.5);
        this.bodySprite.width = this.radius * 2.5;
        this.bodySprite.height = this.radius * 3;

        this.bodySprite.rotation = -Math.PI / 2;

        container.addChild(this.bodySprite);

        container.position.set(this.x, this.y);
        container.rotation = this.rotation;

        return container;
    }
}

export default Player;