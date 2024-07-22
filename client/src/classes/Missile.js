import * as PIXI from "pixi.js";

export class Missile {

    app = null;
    weapon = null;
    missileW = 10;
    missileH = 10;
    pixiObj = null;
    createdAt = null;
    speed = 0;
    dx = 0;
    dy = 0;
    tickerFunc = null;

    constructor (app, weapon, params = {}) {
        this.app = app;
        this.weapon = weapon;
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

        this.tickerFunc = this.moveMissile.bind(this);
        this.app.ticker.add(this.tickerFunc);
    }

    moveMissile (delta) {
        if (this.pixiObj) {
            this.pixiObj.x += this.dx * delta;
            this.pixiObj.y += this.dy * delta;
            if (
                this.pixiObj.x < 100 || this.pixiObj.x > (window.innerWidth - 100) ||
                this.pixiObj.y < 100 || this.pixiObj.y > (window.innerHeight - 100)
            ) {
                this.app.stage.removeChild(this.pixiObj)
                this.app.ticker.remove(this.tickerFunc);
                this.weapon.removeMissileByCreatedAt(this.createdAt);
            }
        }
    }
}

export default Missile;