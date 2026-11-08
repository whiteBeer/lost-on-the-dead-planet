import * as PIXI from "pixi.js";
import { App } from "../../App";
import { BackendMissile } from "../../Types";

interface TrailPoint {
    x:number;
    y:number;
}

export class Missile {

    public x = -1;
    public y = -1;

    private app:App;
    private pixiObj:PIXI.Container<PIXI.ContainerChild>;
    private trailGfx:PIXI.Graphics;

    private id:string;
    private ownerId:string;
    private team:"player" | "enemy" = "player";
    private bulletScale = 1;

    private speedInSecond = 0;

    private dx = 0;
    private dy = 0;
    private rotation = 0;

    private startX = 0;
    private startY = 0;
    private distanceTraveled = 0;
    private trail:TrailPoint[] = [];
    private trailLength = 56;
    private readonly trailSpacing = 3;

    tickerFunc:(ticker:PIXI.Ticker) => void;

    constructor(app:App, params:BackendMissile, serverCurrentDateTime:string) {
        this.app = app;
        this.id = params.id;
        this.ownerId = params.ownerId;
        this.team = params.team === "enemy" ? "enemy" : "player";
        this.bulletScale = Math.max(1, params.bulletScale || 1);
        this.trailLength = 56 * this.bulletScale;
        this.speedInSecond = params.speedInSecond || 100;
        this.rotation = params.rotation;

        this.startX = params.startX;
        this.startY = params.startY;

        this.pixiObj = this.initGraphics();
        this.trailGfx = this.pixiObj.children[0] as PIXI.Graphics;

        const dirCos = Math.cos(params.rotation);
        const dirSin = Math.sin(params.rotation);

        const serverTime = new Date(serverCurrentDateTime).getTime();
        const createTime = new Date(params.createdAt).getTime();

        const dTimeSeconds = Math.max(0, (serverTime - createTime) / 1000);

        this.x = this.startX + (dirCos * this.speedInSecond * dTimeSeconds);
        this.y = this.startY + (dirSin * this.speedInSecond * dTimeSeconds);
        this.distanceTraveled = Math.hypot(this.x - this.startX, this.y - this.startY);

        this.dx = dirCos * (this.speedInSecond / 60);
        this.dy = dirSin * (this.speedInSecond / 60);

        this.trail.push({ x: this.x, y: this.y });
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
        if (this.app.scene?.paused) {
            return;
        }

        const prevX = this.x;
        const prevY = this.y;
        this.x += this.dx * ticker.deltaTime;
        this.y += this.dy * ticker.deltaTime;
        this.distanceTraveled += Math.hypot(this.x - prevX, this.y - prevY);

        this.pushTrailPoint(this.x, this.y);
        this.trimTrail();
        this.updateVisuals();
    }

    private pushTrailPoint(x:number, y:number) {
        const last = this.trail[this.trail.length - 1];
        if (last && Math.hypot(x - last.x, y - last.y) < this.trailSpacing) {
            last.x = x;
            last.y = y;
            return;
        }
        this.trail.push({ x, y });
    }

    private trimTrail() {
        while (this.trail.length > 2) {
            const oldest = this.trail[0];
            const next = this.trail[1];
            const distFromHead = this.pathLengthFrom(0);
            if (distFromHead <= this.trailLength) {
                break;
            }
            // Сдвигаем старую точку вдоль сегмента, чтобы длина шлейфа была ровно trailLength
            const overshoot = distFromHead - this.trailLength;
            const segLen = Math.hypot(next.x - oldest.x, next.y - oldest.y);
            if (segLen <= overshoot || segLen < 0.001) {
                this.trail.shift();
                continue;
            }
            const t = overshoot / segLen;
            oldest.x += (next.x - oldest.x) * t;
            oldest.y += (next.y - oldest.y) * t;
            break;
        }
    }

    private pathLengthFrom(startIndex:number) {
        let len = 0;
        for (let i = startIndex; i < this.trail.length - 1; i++) {
            const a = this.trail[i];
            const b = this.trail[i + 1];
            len += Math.hypot(b.x - a.x, b.y - a.y);
        }
        return len;
    }

    private initGraphics():PIXI.Container {
        const container = new PIXI.Container();
        const trail = new PIXI.Graphics();
        const head = new PIXI.Graphics();
        const enemy = this.team === "enemy";
        const s = this.bulletScale;

        head.ellipse(0, 0, 5 * s, 2.2 * s).fill({
            color: enemy ? 0xff3b2f : 0xfff6d0
        });
        head.circle(2.5 * s, 0, 1.6 * s).fill({
            color: enemy ? 0xffc4a8 : 0xffffff
        });

        container.addChild(trail);
        container.addChild(head);
        return container;
    }

    private updateVisuals() {
        this.pixiObj.position.set(this.x, this.y);
        this.pixiObj.rotation = this.rotation;
        this.drawTrail();
    }

    private drawTrail() {
        this.trailGfx.clear();

        // Шлейф только после того, как пуля прошла его полную длину
        if (this.distanceTraveled < this.trailLength || this.trail.length < 2) {
            return;
        }

        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);

        const toLocal = (wx:number, wy:number) => {
            const dx = wx - this.x;
            const dy = wy - this.y;
            return {
                x: dx * cos - dy * sin,
                y: dx * sin + dy * cos
            };
        };

        // Рисуем сегментами с затуханием к хвосту
        let traveled = 0;
        for (let i = this.trail.length - 1; i > 0; i--) {
            const a = this.trail[i];
            const b = this.trail[i - 1];
            const seg = Math.hypot(b.x - a.x, b.y - a.y);
            const mid = traveled + seg * 0.5;
            traveled += seg;

            const fade = 1 - mid / this.trailLength;
            if (fade <= 0) {
                continue;
            }

            const la = toLocal(a.x, a.y);
            const lb = toLocal(b.x, b.y);
            const alpha = 0.06 + 0.16 * fade * fade;
            const enemy = this.team === "enemy";
            const s = this.bulletScale;

            this.trailGfx
                .moveTo(la.x, la.y)
                .lineTo(lb.x, lb.y)
                .stroke({
                    color: enemy ? 0xff5533 : 0xffffff,
                    width: (0.8 + 1.6 * fade) * s,
                    alpha
                });
        }
    }
}
