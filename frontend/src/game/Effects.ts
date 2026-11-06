import * as PIXI from "pixi.js";
import { NetBullet, NetFx, WorldConfig } from "./Types";

const BULLET_COLORS:Record<string, number> = {
    Flamethrower: 0xff9a2e,
    Rocket: 0xffd24a,
    Railgun: 0x7ff3ff,
    Crossbow: 0xd9c08a,
    Sniper: 0xffffff,
    acid: 0x9dff3a
};

interface BulletView {
    gfx:PIXI.Graphics;
    vx:number;
    vy:number;
    left:number;
    speed:number;
}

interface Floater {
    obj:PIXI.Container;
    life:number;
    total:number;
    vy:number;
    grow:number;
}

const MAX_FLOATERS = 70;

export class Effects {
    private bullets = new Map<number, BulletView>();
    private floaters:Floater[] = [];

    constructor(private readonly bulletLayer:PIXI.Container, private readonly fxLayer:PIXI.Container) {}

    spawnBullets(list:NetBullet[]) {
        for (const [id, kind, x, y, vx, vy, left, size] of list) {
            if (this.bullets.has(id)) {
                continue;
            }
            const gfx = new PIXI.Graphics();
            const color = BULLET_COLORS[kind] ?? 0xfff3b0;
            const speed = Math.hypot(vx, vy);
            const tail = kind === "Flamethrower" || kind === "acid" ? 0 : Math.min(26, speed / 45);
            if (tail > 0) {
                gfx.moveTo(-tail, 0).lineTo(0, 0).stroke({ width: Math.max(1.5, size * 0.7), color, alpha: 0.75 });
            }
            gfx.circle(0, 0, size).fill(color);
            gfx.rotation = Math.atan2(vy, vx);
            gfx.position.set(x, y);
            if (kind === "Flamethrower") {
                gfx.alpha = 0.75;
            }
            this.bulletLayer.addChild(gfx);
            this.bullets.set(id, { gfx, vx, vy, left, speed });
        }
    }

    applyFx(list:NetFx[], _config:WorldConfig) {
        for (const fx of list) {
            const [kind, x, y, a, b] = fx;
            switch (kind) {
                case "bulletEnd":
                    this.removeBullet(a as number);
                    break;
                case "dmg":
                    this.text(String(a), x, y, b ? 0xffd23e : 0xffffff, b ? 22 : 15);
                    break;
                case "miss":
                    this.text("мимо", x, y, 0xb9b9b9, 13);
                    break;
                case "dodge":
                    this.text("уклон", x, y, 0x8fd8ff, 14);
                    break;
                case "heal":
                    this.text("+здоровье", x, y, 0x7ad957, 15);
                    break;
                case "level":
                    this.text("Новый уровень!", x, y - 30, 0xfff07a, 20);
                    break;
                case "pickup":
                    this.burst(x, y, 24, 0xfff3b0, 0.25);
                    break;
                case "perk":
                    this.text("Новый перк!", x, y - 24, 0xffd85a, 18);
                    this.burst(x, y, 42, 0xffd85a, 0.45);
                    break;
                case "chest":
                    this.text("Сундук открыт!", x, y - 34, 0xffb13d, 20);
                    this.burst(x, y, 70, 0xff9a2e, 0.55);
                    break;
                case "spark":
                    this.burst(x, y, 6, 0xffe9a0, 0.14);
                    break;
                case "gore":
                    this.burst(x, y, (a || 60) * 0.5, 0x7a1f1f, 0.5);
                    break;
                case "boom":
                    this.burst(x, y, a || 100, 0xff8a2a, 0.4);
                    break;
            }
        }
    }

    private removeBullet(id:number) {
        const bullet = this.bullets.get(id);
        if (bullet) {
            bullet.gfx.destroy();
            this.bullets.delete(id);
        }
    }

    private text(value:string, x:number, y:number, color:number, size:number) {
        if (this.floaters.length >= MAX_FLOATERS) {
            return;
        }
        const obj = new PIXI.Text({
            text: value,
            style: { fontFamily: "Rubik, Arial", fontSize: size, fontWeight: "700", fill: color, stroke: { color: 0x000000, width: 3 } }
        });
        obj.anchor.set(0.5);
        obj.position.set(x + (Math.random() - 0.5) * 20, y - 18);
        this.fxLayer.addChild(obj);
        this.floaters.push({ obj, life: 0.8, total: 0.8, vy: -38, grow: 0 });
    }

    private burst(x:number, y:number, radius:number, color:number, life:number) {
        if (this.floaters.length >= MAX_FLOATERS) {
            return;
        }
        const obj = new PIXI.Graphics();
        obj.circle(0, 0, Math.max(1, radius)).fill({ color, alpha: 0.7 });
        obj.position.set(x, y);
        obj.scale.set(0.35);
        this.fxLayer.addChild(obj);
        this.floaters.push({ obj, life, total: life, vy: 0, grow: 0.65 / life });
    }

    update(dt:number) {
        for (const [id, bullet] of this.bullets) {
            const step = bullet.speed * dt;
            bullet.gfx.x += bullet.vx * dt;
            bullet.gfx.y += bullet.vy * dt;
            bullet.left -= step;
            if (bullet.left <= 0) {
                this.removeBullet(id);
            }
        }

        this.floaters = this.floaters.filter((floater) => {
            floater.life -= dt;
            if (floater.life <= 0) {
                floater.obj.destroy();
                return false;
            }
            floater.obj.y += floater.vy * dt;
            floater.obj.alpha = Math.min(1, floater.life / floater.total * 1.6);
            if (floater.grow) {
                floater.obj.scale.set(floater.obj.scale.x + floater.grow * dt);
            }
            return true;
        });
    }
}
