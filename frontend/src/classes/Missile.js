import * as PIXI from "pixi.js";

export class Missile {

    app = null;
    weapon = null;
    missileW = 10;
    missileH = 10;
    pixiObj = null;
    createdAt = null;
    speedInSecond = 0;
    dx = 0;
    dy = 0;
    tickerFunc = null;

    constructor (app, weapon, params = {}) {
        this.app = app;
        this.weapon = weapon;
        this.createdAt = params.createdAt;
        this.speedInSecond = params.speedInSecond || 100;

        const dirCos = Math.cos(params.rotation);
        const dirSin = Math.sin(params.rotation);

        const container = new PIXI.Container();
        const rectangle = new PIXI.Graphics();
        rectangle
            .beginFill(params.color || "white")
            .drawRect( 0, 0, this.missileW, this.missileH)
            .endFill();
        container.addChild(rectangle);
        if (params.serverCurrentDateTime) {
            const dTimeSeconds = (
                new Date(params.serverCurrentDateTime).getTime() - new Date(params.createdAt).getTime()
            ) / 1000;
            container.position.set(
                params.startX + (-dirCos * (params.speedInSecond * dTimeSeconds)),
                params.startY + (-dirSin * (params.speedInSecond * dTimeSeconds))
            );
        } else {
            container.position.set(params.startX, params.startY);
        }
        container.pivot.x = container.width / 2;
        container.pivot.y = container.height / 2;
        this.pixiObj = container;
        app.stage.addChild(this.pixiObj);

        this.dx = -dirCos * (this.speedInSecond / (1000 / 16.66)) ;
        this.dy = -dirSin * (this.speedInSecond / (1000 / 16.66));

        this.tickerFunc = this.moveMissile.bind(this);
        this.app.ticker.add(this.tickerFunc);
    }

    moveMissile (delta) {
        if (this.pixiObj) {
            this.pixiObj.x += this.dx * delta;
            this.pixiObj.y += this.dy * delta;
            if (
                this.pixiObj.x < 10 || this.pixiObj.x > (window.innerWidth - 10) ||
                this.pixiObj.y < 10 || this.pixiObj.y > (window.innerHeight - 10)
            ) {
                this.app.stage.removeChild(this.pixiObj)
                this.app.ticker.remove(this.tickerFunc);
                this.weapon.removeMissileByCreatedAt(this.createdAt);
            }
        }
    }
}

export default Missile;