import * as PIXI from "pixi.js";

export class Player {

    app = null;
    socketId = null;
    pixiObj = null;
    speed = 3;
    playerW = 16;
    playerH = 40;

    constructor (app, params = {}) {
        this.app = app;
        this.socketId = params.socketId || "me";
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

        container.pivot.x = container.width / 2;
        container.pivot.y = container.height;
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
            this.pixiObj.rotation = (diffX < 0 ? Math.PI : 0) + Math.PI / 2 + Math.atan(diffY / diffX);
        } catch (e) {}
    }
}

export default Player;