import * as PIXI from "pixi.js";
import Weapon from "./Weapon";
import { App } from "../../App";

export class Player {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;
    socketId = "";

    x = -1;
    y = -1;
    speed = 3;
    playerW = 40;
    playerH = 16;
    weapon:Weapon;

    constructor (app:App, params:any = {}) {
        this.app = app;
        this.socketId = params.socketId || "me";
        this.pixiObj = new PIXI.Container();
        this.weapon = new Weapon(app, this);

        this.x = params.x;
        this.y = params.y;

        const scale = this.app.scene?.scale || 1;
        const tx = this.app.scene?.tx || 0;
        const ty = this.app.scene?.ty || 0;

        const container = new PIXI.Container();
        const rectangle = new PIXI.Graphics();
        rectangle
            .rect(0, 0, this.playerW, this.playerH)
            .fill(params.color || "white");
        container.addChild(rectangle);
        if (typeof params.x !== "undefined" && typeof params.y !== "undefined") {
            this.x = params.x;
            this.y = params.y;
            container.position.set(tx + params.x * scale, ty + params.y * scale);
        }
        container.pivot.x = container.width;
        container.pivot.y = container.height / 2;
        container.scale = scale;

        if (this.socketId === "me") {
            container.visible = false;
        }
        this.pixiObj = container;
    }

    remove () {
        this.pixiObj.parent.removeChild(this.pixiObj);
    }

    setColor (color:string) {
        try {
            this.pixiObj.getChildAt<PIXI.Graphics>(0)
                .clear()
                .rect( 0, 0, this.playerW, this.playerH)
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
            rotation: this.pixiObj.rotation
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
                this.pixiObj.rotation = rotation;
            }
        }
    }

    moveX (step:number) {
        if (this.pixiObj && this.app.scene) {
            this.x += step;
            this.pixiObj.x += step * this.app.scene.scale;
        }
    }

    moveY (step:number) {
        if (this.pixiObj && this.app.scene) {
            this.y += step;
            this.pixiObj.y += step * this.app.scene.scale;
        }
    }

    refreshRotationAngleToMouse (mouseCoords:any) {
        try {
            if (this.pixiObj) {
                const diffX = mouseCoords.pageX - this.pixiObj.x;
                const diffY = mouseCoords.pageY - this.pixiObj.y;
                this.pixiObj.rotation = Math.PI + Math.atan2(diffY, diffX);
            }
        } catch (e) {
            console.log(e);
        }
    }
}

export default Player;