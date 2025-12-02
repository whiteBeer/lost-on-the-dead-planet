import * as PIXI from "pixi.js";
import { App } from "../../App";
import { BackendMissile } from "../../Types";

export class Missile {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;

    id:string;
    ownerId:string;

    x = -1;
    y = -1;
    createdAt:string;
    speedInSecond = 0;
    dx = 0;
    dy = 0;

    tickerFunc:(ticker:PIXI.Ticker) => void;

    constructor(app:App, params:BackendMissile, serverCurrentDateTime:string) {
        this.app = app;
        this.id = params.id;
        this.ownerId = params.ownerId;
        this.createdAt = params.createdAt;
        this.speedInSecond = params.speedInSecond || 100;
        this.x = params.startX;
        this.y = params.startY;

        const scale = this.app.scene?.scale || 1;
        const tx = this.app.scene?.tx || 0;
        const ty = this.app.scene?.ty || 0;
        const dirCos = Math.cos(params.rotation);
        const dirSin = Math.sin(params.rotation);

        const container = new PIXI.Container();
        const circle = new PIXI.Graphics();
        circle.circle(0, 0, 5).fill("white");
        container.addChild(circle);
        const dTimeSeconds = (
            new Date(serverCurrentDateTime).getTime() - new Date(params.createdAt).getTime()
        ) / 1000;
        this.x = params.startX + -dirCos * (params.speedInSecond * dTimeSeconds);
        this.y = params.startY + -dirSin * (params.speedInSecond * dTimeSeconds);
        container.position.set(
            tx + this.x * scale,
            ty + this.y * scale
        );
        this.pixiObj = container;
        this.pixiObj.scale = scale;
        app.pixiApp.stage.addChild(this.pixiObj);

        this.dx = -dirCos * (this.speedInSecond / (1000 / 16.66));
        this.dy = -dirSin * (this.speedInSecond / (1000 / 16.66));

        this.tickerFunc = this.moveMissile.bind(this);
        this.app.pixiApp.ticker.add(this.tickerFunc);
    }

    getOwnerId() {
        return this.ownerId;
    }

    moveMissile(ticker:PIXI.Ticker) {
        const scale = this.app.scene?.scale || 1;
        const tx = this.app.scene?.tx || 0;
        const ty = this.app.scene?.ty || 0;
        if (this.pixiObj && this.app && this.app.pixiApp) {
            this.x += this.dx * ticker.deltaTime;
            this.y += this.dy * ticker.deltaTime;
            this.pixiObj.x = tx + this.x * scale;
            this.pixiObj.y = ty + this.y * scale;
        }
    }

    remove() {
        this.app.pixiApp.stage.removeChild(this.pixiObj);
        this.app.pixiApp.ticker.remove(this.tickerFunc);
    }
}