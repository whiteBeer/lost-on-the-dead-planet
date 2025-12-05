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
    private pixiObj:PIXI.Container<PIXI.ContainerChild>;

    private speedInSecond = 150;
    private length = 0;
    private width = 0;
    private rotation = 0;

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
        this.length = params.length;
        this.width = params.width;
        this.rotation = params.rotation;
        this.weapon.updateState(params.weapon);
    }

    remove() {
        this.pixiObj.parent.removeChild(this.pixiObj);
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
                if (this.pixiObj) {
                    this.pixiObj.rotation = rotation;
                }
            }
        }
    }

    // Возвращает isRotationChanged
    refreshRotationAngleToMouse(mouseCoords:IMouseCoords) {
        try {
            const stageCoords = this.getStageCoords();
            const oldRotation = this.rotation;
            const diffX = mouseCoords.pageX - stageCoords.pageX;
            const diffY = mouseCoords.pageY - stageCoords.pageY;
            const rotation = Math.PI + Math.atan2(diffY, diffX);
            this.rotation = rotation;
            if (this.pixiObj) {
                this.pixiObj.rotation = rotation;
            }
            return oldRotation !== rotation;
        } catch (e) {
            console.log(e);
        }
    }

    private initGraphics(params:BackendPlayer) {
        const container = new PIXI.Container();
        const rectangle = new PIXI.Graphics();
        rectangle
            .rect(0, 0, this.length, this.width)
            .fill(params.color || "white");
        const circle = new PIXI.Graphics();
        circle.circle(this.length - 2, this.width / 2, 2).fill("white");
        container.addChild(rectangle);
        container.addChild(circle);

        container.position.set(this.x, this.y);
        container.pivot.x = container.width;
        container.pivot.y = container.height / 2;

        return container;
    }
}

export default Player;