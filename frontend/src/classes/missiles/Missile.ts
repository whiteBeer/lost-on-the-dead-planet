import * as PIXI from "pixi.js";
import {App} from "../../App";

export class Missile {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;

    id:string;
    ownerId:string;

    missileW = 10;
    missileH = 10;
    createdAt:string;
    speedInSecond = 0;
    dx = 0;
    dy = 0;

    tickerFunc:(ticker:PIXI.Ticker) => void;

    constructor (app:App, params:any = {}) {
        this.app = app;
        this.id = params.id;
        this.ownerId = params.ownerId;
        this.createdAt = params.createdAt;
        this.speedInSecond = params.speedInSecond || 100;

        const dirCos = Math.cos(params.rotation);
        const dirSin = Math.sin(params.rotation);

        const container = new PIXI.Container();
        const rectangle = new PIXI.Graphics();
        rectangle
            .rect( 0, 0, this.missileW, this.missileH)
            .fill(params.color || "white");
        container.addChild(rectangle);
        const dTimeSeconds = (
            new Date(params.serverCurrentDateTime).getTime() - new Date(params.createdAt).getTime()
        ) / 1000;
        container.position.set(
            params.startX + (-dirCos * (params.speedInSecond * dTimeSeconds)),
            params.startY + (-dirSin * (params.speedInSecond * dTimeSeconds))
        );
        container.pivot.x = container.width / 2;
        container.pivot.y = container.height / 2;
        this.pixiObj = container;
        app.pixiApp.stage.addChild(this.pixiObj);

        this.dx = -dirCos * (this.speedInSecond / (1000 / 16.66)) ;
        this.dy = -dirSin * (this.speedInSecond / (1000 / 16.66));

        this.tickerFunc = this.moveMissile.bind(this);
        this.app.pixiApp.ticker.add(this.tickerFunc);
    }

    getOwnerId() {
        return this.ownerId;
    }

    moveMissile (ticker:PIXI.Ticker) {
        if (this.pixiObj && this.app && this.app.pixiApp) {
            this.pixiObj.x += this.dx * ticker.deltaTime;
            this.pixiObj.y += this.dy * ticker.deltaTime;
        }
    }

    remove () {
        this.app.pixiApp.stage.removeChild(this.pixiObj);
        this.app.pixiApp.ticker.remove(this.tickerFunc);
    }
}