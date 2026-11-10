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
    public weapon:Weapon;
    public movementStopTimer:NodeJS.Timeout | null = null;

    private app:App;
    private pixiObj:PIXI.Container;
    private bodyContainer:PIXI.Container | null = null;
    private speedInSecond = 150;
    private radius = 0;
    private rotation = 0;

    public health = 0;
    public maxHealth = 0;
    public level = 1;
    public exp = 0;

    private bodySprite:PIXI.AnimatedSprite|null = null;
    private legsSprite:PIXI.AnimatedSprite|null = null;
    private nameLabel:PIXI.Text|null = null;

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
            this.applyTransform();
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
            if (rotation !== null) {
                this.rotation = rotation;
            }
            this.applyTransform();
        }
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
        this.bodyContainer.addChild(this.bodySprite);
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

export default Player;
