import * as PIXI from "pixi.js";
import { App } from "../../App";
import { BackendEnemy } from "../../Types";
import { ResourcesLoader } from "../ResourcesLoader";

export class Enemy {
    public x = 0;
    public y = 0;

    private app:App;
    private pixiObj:PIXI.Container;
    private body:PIXI.AnimatedSprite | PIXI.Sprite | null = null;
    private id:string;

    private dx = 0;
    private dy = 0;
    private speedInSecond = 0;

    private health = 0;
    private maxHealth = 0;
    private bulletHit = { width: 0, height: 0 };
    private playerTouch = { width: 0, height: 0 };
    private hitGfx:PIXI.Graphics | null = null;

    private tickerFunc:(ticker:PIXI.Ticker) => void;

    constructor(app:App, enemyJson:BackendEnemy, serverCurrentDateTime:string) {
        this.app = app;
        this.id = enemyJson.id;

        this.health = enemyJson.health;
        this.maxHealth = enemyJson.maxHealth;

        this.pixiObj = this.initGraphics(enemyJson);
        this.setHitboxes(enemyJson);
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
        this.speedInSecond = enemyJson.speedInSecond;

        const dirCos = Math.cos(enemyJson.rotation);
        const dirSin = Math.sin(enemyJson.rotation);

        const serverTime = new Date(serverCurrentDateTime).getTime();
        const updateTime = new Date(enemyJson.updatedAt).getTime();
        const dTimeSeconds = Math.max(0, (serverTime - updateTime) / 1000);

        this.x = enemyJson.startX + (dirCos * enemyJson.speedInSecond * dTimeSeconds);
        this.y = enemyJson.startY + (dirSin * enemyJson.speedInSecond * dTimeSeconds);

        this.dx = dirCos * (enemyJson.speedInSecond / 60);
        this.dy = dirSin * (enemyJson.speedInSecond / 60);

        this.syncAnimSpeed();
        this.setHitboxes(enemyJson);
        this.updateVisuals();
    }

    setDebugVisible(on:boolean) {
        if (on && !this.hitGfx) {
            this.hitGfx = new PIXI.Graphics();
            this.pixiObj.addChild(this.hitGfx);
            this.drawHitboxes();
        }
        if (this.hitGfx) {
            this.hitGfx.visible = on;
        }
    }

    clear() {
        this.app.removeTicker(this.tickerFunc);
        this.pixiObj.destroy({ children: true });
    }

    moveEnemy(ticker:PIXI.Ticker) {
        if (!this.pixiObj || this.pixiObj.destroyed) return;
        if (this.app.scene?.paused) return;
        this.x += this.dx * ticker.deltaTime;
        this.y += this.dy * ticker.deltaTime;
        this.updateVisuals();
    }

    setHealth(health:number) {
        this.health = health;
        this.pixiObj.alpha = 1;
    }

    private initGraphics(json:BackendEnemy):PIXI.Container {
        const container = new PIXI.Container();
        const spriteKey = json.spriteKey || (json.type === "zombie" ? "zombie" : "");
        const targetSize = Math.max(json.width, json.height);
        const frames = spriteKey ? ResourcesLoader.getEnemyFrames(spriteKey) : null;

        if (frames && frames.length > 0) {
            const sprite = new PIXI.AnimatedSprite(frames);
            sprite.anchor.set(0.5);
            sprite.animationSpeed = Math.max(0.12, json.speedInSecond / 380);
            sprite.play();
            ResourcesLoader.fitSprite(sprite, targetSize);
            if (json.tint) {
                sprite.tint = json.tint;
            }
            this.body = sprite;
            container.addChild(sprite);
            return container;
        }

        const tex = spriteKey ? ResourcesLoader.getTexture(spriteKey) : null;
        if (tex) {
            const sprite = new PIXI.Sprite(tex);
            sprite.anchor.set(0.5);
            ResourcesLoader.fitSprite(sprite, targetSize);
            if (json.tint) {
                sprite.tint = json.tint;
            }
            this.body = sprite;
            container.addChild(sprite);
        } else {
            const rectangle = new PIXI.Graphics();
            rectangle
                .rect(-json.width / 2, -json.height / 2, json.width, json.height)
                .fill(json.tint || json.color || 0x4caf50);
            container.addChild(rectangle);
        }

        return container;
    }

    private setHitboxes(json:BackendEnemy) {
        this.bulletHit = json.bulletHit || { width: json.width, height: json.height };
        this.playerTouch = json.playerTouch || this.bulletHit;
        if (this.hitGfx?.visible) {
            this.drawHitboxes();
        }
    }

    private drawHitboxes() {
        if (!this.hitGfx) return;
        const bullet = this.bulletHit;
        const touch = this.playerTouch;
        this.hitGfx.clear();
        this.hitGfx
            .rect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height)
            .stroke({ color: 0xffffff, width: 1, alpha: 0.95 });
        this.hitGfx
            .rect(-touch.width / 2, -touch.height / 2, touch.width, touch.height)
            .stroke({ color: 0xffffff, width: 2, alpha: 0.95 });
    }

    private syncAnimSpeed() {
        if (!(this.body instanceof PIXI.AnimatedSprite)) {
            return;
        }
        if (this.speedInSecond <= 1) {
            this.body.animationSpeed = 0;
            return;
        }
        this.body.animationSpeed = Math.max(0.12, this.speedInSecond / 380);
        if (!this.body.playing) {
            this.body.play();
        }
    }

    private updateVisuals() {
        this.pixiObj.position.set(this.x, this.y);
    }
}

export default Enemy;
