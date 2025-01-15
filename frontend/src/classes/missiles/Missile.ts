import * as PIXI from "pixi.js";
import {App} from "../../App";

export class Missile {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;
    ownerId:string;

    missileW = 10;
    missileH = 10;
    createdAt:string;
    speedInSecond = 0;
    dx = 0;
    dy = 0;

    tickerFunc:any = null;

    constructor (app:App, params:any = {}) {
        this.app = app;
        this.ownerId = params.ownerId;
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
            this.createBackend(params);
        }
        container.pivot.x = container.width / 2;
        container.pivot.y = container.height / 2;
        this.pixiObj = container;
        app.pixiApp.stage.addChild(this.pixiObj);

        this.dx = -dirCos * (this.speedInSecond / (1000 / 16.66)) ;
        this.dy = -dirSin * (this.speedInSecond / (1000 / 16.66));

        this.tickerFunc = this.moveMissile.bind(this);
        this.app.pixiApp.ticker.add(this.tickerFunc);
    }

    createBackend (params:any) {
        this.app.socket.emit("missileCreate", {
            range: params.range,
            speedInSecond: params.speedInSecond,
            startX: params.startX,
            startY: params.startY,
            rotation: params.rotation
        });
    }

    getOwnerId() {
        return this.ownerId;
    }

    moveMissile (ticker:PIXI.Ticker) {
        if (this.pixiObj && this.app && this.app.pixiApp) {
            this.pixiObj.x += this.dx * ticker.deltaTime;
            this.pixiObj.y += this.dy * ticker.deltaTime;
            if (
                this.pixiObj.x < 10 || this.pixiObj.x > (window.innerWidth - 10) ||
                this.pixiObj.y < 10 || this.pixiObj.y > (window.innerHeight - 10)
            ) {
                this.app.pixiApp.stage.removeChild(this.pixiObj);
                this.app.pixiApp.ticker.remove(this.tickerFunc);
                this.app.scene?.missilesCollection?.removeMissileByCreatedAt(this.createdAt);
            }
        }
    }
}