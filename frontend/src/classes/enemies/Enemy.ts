import * as PIXI from "pixi.js";
import {App} from "../../App";
import {BackendEnemy} from "../../Types";

export class Enemy {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;

    id:string;
    x = -1;
    y = -1;
    length = 0;
    width = 0;
    dx:number;
    dy:number;

    tickerFunc:(ticker:PIXI.Ticker) => void;

    constructor (app:App, enemyJson:BackendEnemy, serverCurrentDateTime:string) {
        this.app = app;
        this.id = enemyJson.id;
        this.length = enemyJson.length;
        this.width = enemyJson.width;

        const scale = this.app.scene?.scale || 1;
        const tx = this.app.scene?.tx || 0;
        const ty = this.app.scene?.ty || 0;

        const container = new PIXI.Container();
        const rectangle = new PIXI.Graphics();
        rectangle
            .rect( 0, 0, enemyJson.width, enemyJson.length)
            .fill(enemyJson.color || "black");
        const circle = new PIXI.Graphics();
        circle.circle(0, 0, 3).fill("white");

        container.addChild(rectangle);
        container.addChild(circle);

        const dirCos = Math.cos(enemyJson.rotation);
        const dirSin = Math.sin(enemyJson.rotation);
        const dTimeSeconds = (
            new Date(serverCurrentDateTime).getTime() - new Date(enemyJson.updatedAt).getTime()
        ) / 1000;
        this.x = enemyJson.startX + -dirCos * (enemyJson.speedInSecond * dTimeSeconds);
        this.y = enemyJson.startY + -dirSin * (enemyJson.speedInSecond * dTimeSeconds);
        container.position.set(
            tx + this.x * scale,
            ty + this.y * scale
        );
        this.pixiObj = container;
        this.pixiObj.scale = scale;
        this.pixiObj.rotation = enemyJson.rotation;

        // 16.66 is PIXI updater in ms
        this.dx = -dirCos * (enemyJson.speedInSecond / (1000 / 16.66));
        this.dy = -dirSin * (enemyJson.speedInSecond / (1000 / 16.66));

        this.tickerFunc = this.moveEnemy.bind(this);
        this.app.pixiApp.ticker.add(this.tickerFunc);
    }

    remove () {
        this.app.pixiApp.stage.removeChild(this.pixiObj);
        this.app.pixiApp.ticker.remove(this.tickerFunc);
    }

    stop () {
        this.app.pixiApp.ticker.remove(this.tickerFunc);
    }

    moveEnemy (ticker:PIXI.Ticker) {
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
}

export default Enemy;