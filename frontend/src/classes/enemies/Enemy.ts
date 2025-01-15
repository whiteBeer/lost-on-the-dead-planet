import * as PIXI from "pixi.js";
import {App} from "../../App";

export class Enemy {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;

    dx:number;
    dy:number;

    tickerFunc:any;

    constructor (app:App, enemyJson:any = {}, serverCurrentDateTime:string) {
        this.app = app;
        const container = new PIXI.Container();
        const rectangle = new PIXI.Graphics();
        rectangle
            .rect( 0, 0, enemyJson.size, enemyJson.size)
            .fill(enemyJson.color || "black");

        container.addChild(rectangle);

        const dirCos = Math.cos(enemyJson.rotation);
        const dirSin = Math.sin(enemyJson.rotation);
        const dTimeSeconds = (
            new Date(serverCurrentDateTime).getTime() - new Date(enemyJson.updatedAt).getTime()
        ) / 1000;
        container.position.set(
            enemyJson.pageX + (-dirCos * (enemyJson.speedInSecond * dTimeSeconds)),
            enemyJson.pageY + (-dirSin * (enemyJson.speedInSecond * dTimeSeconds))
        );
        container.pivot.x = container.width / 2;
        container.pivot.y = container.height / 2;
        this.pixiObj = container;

        // 16.66 is PIXI updater in ms
        this.dx = -dirCos * (enemyJson.speedInSecond / (1000 / 16.66));
        this.dy = -dirSin * (enemyJson.speedInSecond / (1000 / 16.66));

        this.tickerFunc = this.moveEnemy.bind(this);
        this.app.pixiApp.ticker.add(this.tickerFunc);
    }

    remove () {
        try {
            this.pixiObj.parent.removeChild(this.pixiObj);
        } catch (e) {
            console.log(e);
        }
    }

    stop () {
        this.app.pixiApp.ticker.remove(this.tickerFunc);
    }

    moveEnemy (ticker:PIXI.Ticker) {
        if (this.pixiObj) {
            this.pixiObj.x += this.dx * ticker.deltaTime;
            this.pixiObj.y += this.dy * ticker.deltaTime;
        }
    }
}

export default Enemy;