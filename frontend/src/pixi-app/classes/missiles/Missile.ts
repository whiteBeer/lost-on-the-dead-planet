import * as PIXI from "pixi.js";
import { App } from "../../App";
import {BackendMissile, BackendPlayer} from "../../Types";

export class Missile {

    public x = -1;
    public y = -1;

    private app:App;
    private pixiObj:PIXI.Container<PIXI.ContainerChild>;

    private id:string;
    private ownerId:string;

    private createdAt:string;
    private speedInSecond = 0;

    // Скорость движения за 1 тик (кадр)
    private dx = 0;
    private dy = 0;

    tickerFunc:(ticker:PIXI.Ticker) => void;

    constructor(app:App, params:BackendMissile, serverCurrentDateTime:string) {
        this.app = app;
        this.id = params.id;
        this.ownerId = params.ownerId;
        this.createdAt = params.createdAt;
        this.speedInSecond = params.speedInSecond || 100;

        const startX = params.startX;
        const startY = params.startY;

        this.pixiObj = this.initGraphics();

        const dirCos = Math.cos(params.rotation);
        const dirSin = Math.sin(params.rotation);

        const serverTime = new Date(serverCurrentDateTime).getTime();
        const createTime = new Date(params.createdAt).getTime();

        const dTimeSeconds = Math.max(0, (serverTime - createTime) / 1000);

        this.x = startX + (dirCos * this.speedInSecond * dTimeSeconds);
        this.y = startY + (dirSin * this.speedInSecond * dTimeSeconds);

        this.dx = dirCos * (this.speedInSecond / 60);
        this.dy = dirSin * (this.speedInSecond / 60);

        this.updateVisuals();

        this.tickerFunc = this.moveMissile.bind(this);
        this.app.addTicker(this.tickerFunc);
    }

    getPixiObj() {
        return this.pixiObj;
    }

    getId() {
        return this.id;
    }

    getOwnerId() {
        return this.ownerId;
    }

    clear() {
        this.app.removeTicker(this.tickerFunc);
        this.pixiObj.destroy({ children: true });
    }

    private moveMissile(ticker:PIXI.Ticker) {
        if (!this.pixiObj || this.pixiObj.destroyed) {
            return;
        }

        this.x += this.dx * ticker.deltaTime;
        this.y += this.dy * ticker.deltaTime;
        this.updateVisuals();
    }

    private initGraphics():PIXI.Container {
        const container = new PIXI.Container();
        const circle = new PIXI.Graphics();

        circle.circle(0, 0, 3).fill("white");

        container.addChild(circle);
        return container;
    }

    private updateVisuals() {
        this.pixiObj.position.set(
            this.x,
            this.y
        );
    }
}