import * as PIXI from "pixi.js";
import { App } from "../../App";
import { BackendMissile } from "../../Types";

export class Missile {

    // ЛОГИЧЕСКИЕ координаты (в игровом мире)
    x = -1;
    y = -1;

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

        this.pixiObj = this.createGraphics();
        this.app.addToStage(this.pixiObj);

        const dirCos = Math.cos(params.rotation);
        const dirSin = Math.sin(params.rotation);

        const serverTime = new Date(serverCurrentDateTime).getTime();
        const createTime = new Date(params.createdAt).getTime();

        // Защита от отрицательного времени (если часы рассинхронены)
        const dTimeSeconds = Math.max(0, (serverTime - createTime) / 1000);

        this.x = startX + (-dirCos * this.speedInSecond * dTimeSeconds);
        this.y = startY + (-dirSin * this.speedInSecond * dTimeSeconds);

        this.dx = -dirCos * (this.speedInSecond / 60);
        this.dy = -dirSin * (this.speedInSecond / 60);

        // 3. Синхронизируем визуальную часть первый раз
        this.updateVisuals();

        this.tickerFunc = this.moveMissile.bind(this);
        this.app.addTicker(this.tickerFunc);
    }

    getId() {
        return this.id;
    }

    getOwnerId() {
        return this.ownerId;
    }

    moveMissile(ticker:PIXI.Ticker) {
        if (!this.pixiObj || this.pixiObj.destroyed) {
            return;
        }

        this.x += this.dx * ticker.deltaTime;
        this.y += this.dy * ticker.deltaTime;
        this.updateVisuals();
    }

    remove() {
        this.app.removeFromStage(this.pixiObj);
        this.app.removeTicker(this.tickerFunc);
        this.pixiObj.destroy({ children: true });
    }

    private createGraphics():PIXI.Container {
        const container = new PIXI.Container();
        const circle = new PIXI.Graphics();

        circle.circle(0, 0, 4).fill("white");

        container.addChild(circle);
        return container;
    }

    private updateVisuals() {
        const scene = this.app.scene;
        const scale = scene?.scale || 1;
        const tx = scene?.tx || 0;
        const ty = scene?.ty || 0;

        this.pixiObj.position.set(
            tx + this.x * scale,
            ty + this.y * scale
        );
        this.pixiObj.scale.set(scale);
    }
}