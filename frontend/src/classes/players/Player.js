import * as PIXI from "pixi.js";
import Weapon from "./Weapon";

export class Player {

    app = null;
    socketId = "";
    pixiObj = null;
    speed = 3;
    playerW = 40;
    playerH = 16;
    weapon = null;

    constructor (app, params = {}) {
        this.app = app;
        this.socketId = params.socketId || "me";
        this.weapon = new Weapon(app, this);
        const container = new PIXI.Container();
        const rectangle = new PIXI.Graphics();
        rectangle
            .beginFill(params.color || "white")
            .drawRect( 0, 0, this.playerW, this.playerH)
            .endFill();

        container.addChild(rectangle);
        if (typeof params.x !== "undefined" && typeof params.y !== "undefined") {
            container.position.set(params.x, params.y);
        }
        container.pivot.x = container.width;
        container.pivot.y = container.height / 2;
        if (this.socketId === "me") {
            container.visible = false;
        }
        this.pixiObj = container;
    }

    remove () {
        this.pixiObj.parent.removeChild(this.pixiObj);
    }

    setColor (color) {
        try {
            this.pixiObj.children[0]
                .clear()
                .beginFill(color)
                .drawRect( 0, 0, this.playerW, this.playerH)
                .endFill();
        } catch (e) {}
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
            pageX: this.pixiObj.x,
            pageY: this.pixiObj.y,
            rotation: this.pixiObj.rotation
        }
    }

    moveTo (x, y, rotation = null) {
        this.pixiObj.x = x;
        this.pixiObj.y = y;
        if (rotation !== null) {
            this.pixiObj.rotation = rotation;
        }
    }

    moveX (step) {
        this.pixiObj.x += step;
    }

    moveY (step) {
        this.pixiObj.y += step;
    }

    refreshRotationAngleToMouse (mouseCoords) {
        try {
            const diffX = mouseCoords.pageX - this.pixiObj.x;
            const diffY = mouseCoords.pageY - this.pixiObj.y;
            this.pixiObj.rotation = Math.PI + Math.atan2(diffY, diffX);
        } catch (e) {}
    }
}

export default Player;