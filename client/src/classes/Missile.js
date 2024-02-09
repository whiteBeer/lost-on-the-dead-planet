import * as PIXI from "pixi.js";

export class Missile {

    app = null;
    missileW = 10;
    missileH = 10;
    pixiObj = null;
    createdAt = null;
    speed = 0;
    dx = 0;
    dy = 0;

    constructor (app, params = {}) {
        this.app = app;
        this.createdAt = params.createdAt;
        this.speed = params.speed || 10;
        const container = new PIXI.Container();
        const rectangle = new PIXI.Graphics();
        rectangle
            .beginFill(params.color || "white")
            .drawRect( 0, 0, this.missileW, this.missileH)
            .endFill();
        container.addChild(rectangle);
        container.position.set(params.startX, params.startY);
        container.pivot.x = container.width / 2;
        container.pivot.y = container.height / 2;
        this.pixiObj = container;
        app.stage.addChild(this.pixiObj);

        const cos = Math.cos(params.direction)
        const sin = Math.sin(params.direction)

        this.dx = -cos * this.speed;
        this.dy = -sin * this.speed;

        this.app.ticker.add(this.moveMissile.bind(this));
    }

    moveMissile (delta) {
        if (this.pixiObj) {
            this.pixiObj.x += this.dx * delta;
            this.pixiObj.y += this.dy * delta;
        }
    }
}

export default Missile;