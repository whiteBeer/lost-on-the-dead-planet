import * as PIXI from "pixi.js";
import Weapon from "./Weapon";

export class Player {

    app = null;
    socketId = null;
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
        container.position.set(
            params.x || (app.screen.width / 2 - this.playerW / 2),
            params.y || (app.screen.height / 2 - this.playerH / 2)
        );

        container.pivot.x = container.width;
        container.pivot.y = container.height / 2;
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
        if (rotation) {
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
            console.log(diffX, diffY, Math.atan2(diffY, diffX));
        } catch (e) {}
    }
}

export default Player;