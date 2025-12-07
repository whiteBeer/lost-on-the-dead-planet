import * as PIXI from "pixi.js";
import { App } from "../../App";
import { BackendEnemy } from "../../Types";

export class Enemy {
    public x = 0;
    public y = 0;

    private app:App;
    private pixiObj:PIXI.Container;
    private id:string;

    // Скорость движения за 1 тик (кадр)
    private dx = 0;
    private dy = 0;

    private health = 0;
    private maxHealth = 0;

    private tickerFunc:(ticker:PIXI.Ticker) => void;

    constructor(app:App, enemyJson:BackendEnemy, serverCurrentDateTime:string) {
        this.app = app;
        this.id = enemyJson.id;

        this.health = enemyJson.health;
        this.maxHealth = enemyJson.maxHealth;

        this.pixiObj = this.initGraphics(enemyJson);
        this.update(enemyJson, serverCurrentDateTime);
        this.tickerFunc = this.moveEnemy.bind(this);
        this.app.addTicker(this.tickerFunc);
    }

    getId() {
        return this.id;
    }

    getPixiObj() {
        return this.pixiObj;
    }

    update(enemyJson:BackendEnemy, serverCurrentDateTime:string) {
        if (enemyJson.health !== undefined) {
            this.setHealth(enemyJson.health);
        }
        if (enemyJson.maxHealth) {
            this.maxHealth = enemyJson.maxHealth;
        }
        this.pixiObj.rotation = enemyJson.rotation;

        const dirCos = Math.cos(enemyJson.rotation);
        const dirSin = Math.sin(enemyJson.rotation);

        const serverTime = new Date(serverCurrentDateTime).getTime();
        const updateTime = new Date(enemyJson.updatedAt).getTime();
        const dTimeSeconds = Math.max(0, (serverTime - updateTime) / 1000);

        this.x = enemyJson.startX + (dirCos * enemyJson.speedInSecond * dTimeSeconds);
        this.y = enemyJson.startY + (dirSin * enemyJson.speedInSecond * dTimeSeconds);

        this.dx = dirCos * (enemyJson.speedInSecond / 60);
        this.dy = dirSin * (enemyJson.speedInSecond / 60);

        this.updateVisuals();
    }

    clear() {
        this.app.removeTicker(this.tickerFunc);
        this.pixiObj.destroy({ children: true });
    }

    moveEnemy(ticker:PIXI.Ticker) {
        if (!this.pixiObj || this.pixiObj.destroyed) return;
        this.x += this.dx * ticker.deltaTime;
        this.y += this.dy * ticker.deltaTime;
        this.updateVisuals();
    }

    setHealth(health:number) {
        this.health = health;
        this.pixiObj.alpha = Math.max(0.2, this.health / this.maxHealth);
    }

    private initGraphics(json:BackendEnemy):PIXI.Container {
        const container = new PIXI.Container();

        const sprite = PIXI.Sprite.from("enemyZombieTex");

        sprite.anchor.set(0.5);
        sprite.width = json.height * 1.5;
        sprite.height = json.width * 1.3;
        sprite.rotation = -Math.PI / 2;

        const rectangle = new PIXI.Graphics();
        rectangle
            .rect(-json.width / 2, -json.height / 2, json.width, json.height)
            .stroke({ width: 1, color: 0xFFFFFF, alpha: 1 });

        if (json.type === "zombie") {
            container.addChild(sprite);
        } else {
            rectangle.fill(json.color);
        }
        container.addChild(rectangle);

        container.pivot.x = 0;
        container.pivot.y = 0;

        return container;
    }

    private updateVisuals() {
        this.pixiObj.position.set(this.x, this.y);
    }
}

export default Enemy;