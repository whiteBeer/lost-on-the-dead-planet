import * as PIXI from "pixi.js";
import Weapon from "./Weapon";
import { App } from "../../App";
import {BackendPlayer} from "../../Types";

export class Player {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;
    socketId = "";

    x = -1;
    y = -1;
    speed = 3;
    length = 0;
    width = 0;
    rotation = 0;
    weapon:Weapon;

    constructor (app:App, params:BackendPlayer|any) {
        this.app = app;
        this.socketId = params.socketId || "me";
        this.pixiObj = new PIXI.Container();
        this.weapon = new Weapon(app, this);

        this.x = params.pageX;
        this.y = params.pageY;
        this.length = params.length;
        this.width = params.width;

        const scale = this.app.scene?.scale || 1;
        const tx = this.app.scene?.tx || 0;
        const ty = this.app.scene?.ty || 0;

        const container = new PIXI.Container();
        const rectangle = new PIXI.Graphics();
        rectangle
            .rect(0, 0, this.length, this.width)
            .fill(params.color || "white");
        const circle = new PIXI.Graphics();
        circle.circle(this.length - 2, this.width/2, 2).fill("white");
        container.addChild(rectangle);
        container.addChild(circle);

        this.x = params.pageX;
        this.y = params.pageY;
        this.rotation = params.rotation;
        container.position.set(tx + params.pageX * scale, ty + params.pageY * scale);

        container.pivot.x = container.width;
        container.pivot.y = container.height / 2;
        container.scale = scale;

        this.pixiObj = container;
    }

    remove () {
        this.pixiObj.parent.removeChild(this.pixiObj);
    }

    setColor (color:string) {
        try {
            this.pixiObj.getChildAt<PIXI.Graphics>(0)
                .clear()
                .rect( 0, 0, this.length, this.width)
                .fill(color);
        } catch (e) {
            console.log(e);
        }
    }

    hide () {
        this.pixiObj.visible = false;
    }

    show () {
        this.pixiObj.visible = true;
    }

    fire () {
        this.weapon.fire();
    }

    getCoords () {
        return {
            pageX: this.x,
            pageY: this.y,
            rotation: this.rotation
        };
    }

    moveTo (x:number, y:number, rotation:number|null = null) {
        const scale = this.app.scene?.scale || 1;
        const tx = this.app.scene?.tx || 0;
        const ty = this.app.scene?.ty || 0;
        if (this.pixiObj && this.app.scene) {
            this.x = x;
            this.y = y;
            this.pixiObj.x = tx + x * scale;
            this.pixiObj.y = ty + y * scale;
            if (rotation !== null) {
                this.rotation = rotation;
                if (this.pixiObj) {
                    this.pixiObj.rotation = rotation;
                }
            }
        }
    }

    moveX (step:number) {
        if (this.pixiObj && this.app.scene) {
            this.x += step;
            this.pixiObj.x += step * this.app.scene.scale;
            this.app.scene.centerScene();
        }
    }

    moveY (step:number) {
        if (this.pixiObj && this.app.scene) {
            this.y += step;
            this.pixiObj.y += step * this.app.scene.scale;
            this.app.scene.centerScene();
        }
    }

    refreshRotationAngleToMouse (mouseCoords:any) {
        try {
            const diffX = mouseCoords.pageX - this.pixiObj.x;
            const diffY = mouseCoords.pageY - this.pixiObj.y;
            const rotation = Math.PI + Math.atan2(diffY, diffX);
            this.rotation = rotation;
            if (this.pixiObj) {
                this.pixiObj.rotation = rotation;
            }
        } catch (e) {
            console.log(e);
        }
    }
}

export default Player;