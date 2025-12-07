import * as PIXI from "pixi.js";
import Weapon from "./Weapon";
import { App } from "../../App";
import { BackendPlayer, IMouseCoords } from "../../Types";

export class Player {

    public x = -1;
    public y = -1;
    public socketId = "";
    public weapon:Weapon;

    private app:App;
    private pixiObj:PIXI.Container;
    private speedInSecond = 150;
    private radius = 0;
    private rotation = 0;

    private health = 0;
    private maxHealth = 0;

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

    update(params:BackendPlayer) {
        this.x = params.pageX;
        this.y = params.pageY;
        this.health = params.health;
        this.maxHealth = params.maxHealth;
        this.radius = params.radius;
        this.rotation = params.rotation;
        this.setHealth(this.health);
        this.weapon.updateState(params.weapon);
    }

    setHealth(health:number) {
        this.health = health;
        this.pixiObj.alpha = Math.max(0.2, this.health / this.maxHealth);
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
            this.x = x;
            this.y = y;
            this.pixiObj.x = x;
            this.pixiObj.y = y;
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
        const sprite = PIXI.Sprite.from("playerTex");

        // Устанавливаем точку вращения (Anchor) в центр спрайта
        sprite.anchor.set(0.5);
        sprite.width = this.radius * 2.5;
        sprite.height = this.radius * 3;

        sprite.rotation = -Math.PI / 2;

        container.addChild(sprite);

        const hitCircle = new PIXI.Graphics();
        hitCircle.circle(0, 0, this.radius).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.5 });
        container.addChild(hitCircle);

        container.position.set(this.x, this.y);
        container.rotation = this.rotation;

        return container;
    }
}

export default Player;