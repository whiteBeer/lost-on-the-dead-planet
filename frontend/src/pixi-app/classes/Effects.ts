import * as PIXI from "pixi.js";
import { App } from "../App";

interface BloodDrop {
    gfx:PIXI.Graphics;
    vx:number;
    vy:number;
    life:number;
    total:number;
    drag:number;
    spin:number;
    gravity:number;
    settle:boolean;
}

const BLOOD_COLORS = [0x5a0c0c, 0x7a1010, 0x9b1515, 0x3d0808, 0xb01a1a, 0x4e0a0a];
const FIRE_COLORS = [0xfff1c2, 0xffd15a, 0xff9a2e, 0xf25a18, 0xc43210];
const SMOKE_COLORS = [0x2c2622, 0x4a4038, 0x6a5c50];

/** Направленный спрей крови при попадании. */
export class Effects {
    private readonly app:App;
    private readonly layer:PIXI.Container;
    private drops:BloodDrop[] = [];
    private tickerFunc:(ticker:PIXI.Ticker) => void;

    constructor(app:App, layer:PIXI.Container) {
        this.app = app;
        this.layer = layer;
        this.tickerFunc = this.update.bind(this);
        this.app.addTicker(this.tickerFunc);

        this.app.socket?.on("hitFx", (data:{ x:number, y:number, tint?:number, dir?:number }) => {
            this.spawnBlood(data.x, data.y, data.dir ?? Math.random() * Math.PI * 2);
        });
        this.app.socket?.on("bombFx", (data:{ x:number, y:number, radius?:number }) => {
            this.spawnExplosion(data.x, data.y, data.radius || 375);
        });
    }

    spawnExplosion(x:number, y:number, radius:number) {
        const scorch = new PIXI.Graphics();
        scorch.ellipse(0, 0, radius * 0.42, radius * 0.28)
            .fill({ color: 0x1c120c, alpha: 0.85 });
        scorch.ellipse(6, -2, radius * 0.16, radius * 0.1)
            .fill({ color: 0x5a3018, alpha: 0.55 });
        scorch.position.set(x, y);
        scorch.rotation = Math.random() * Math.PI;
        this.layer.addChild(scorch);
        this.drops.push({
            gfx: scorch, vx: 0, vy: 0, life: 3.2, total: 3.2,
            drag: 1, spin: 0, gravity: 0, settle: true
        });

        const flash = new PIXI.Graphics();
        flash.circle(0, 0, radius * 0.55).fill({ color: 0xffb03a, alpha: 0.55 });
        flash.circle(0, 0, radius * 0.28).fill({ color: 0xfff6d0, alpha: 0.8 });
        flash.position.set(x, y);
        this.layer.addChild(flash);
        this.drops.push({
            gfx: flash, vx: 0, vy: 0, life: 0.42, total: 0.42,
            drag: 1, spin: 0, gravity: 0, settle: false
        });

        const sparks = 28 + Math.floor(Math.random() * 8);
        for (let i = 0; i < sparks; i++) {
            const drop = new PIXI.Graphics();
            const w = 2 + Math.random() * 4;
            const h = 4 + Math.random() * 10;
            const color = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)];
            drop.ellipse(0, 0, w, h).fill({ color, alpha: 0.92 });
            drop.position.set(x, y);
            const angle = Math.random() * Math.PI * 2;
            drop.rotation = angle + Math.PI / 2;
            this.layer.addChild(drop);
            const speed = radius * (0.7 + Math.random() * 2.2);
            const life = 0.7 + Math.random() * 0.7;
            this.drops.push({
                gfx: drop,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                total: life,
                drag: 0.9,
                spin: (Math.random() - 0.5) * 8,
                gravity: 180 + Math.random() * 160,
                settle: false
            });
        }

        for (let i = 0; i < 12; i++) {
            const smoke = new PIXI.Graphics();
            const s = 6 + Math.random() * 10;
            smoke.circle(0, 0, s).fill({
                color: SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)],
                alpha: 0.55
            });
            smoke.position.set(x, y);
            this.layer.addChild(smoke);
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 70;
            const life = 1.4 + Math.random() * 1.1;
            this.drops.push({
                gfx: smoke,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                life,
                total: life,
                drag: 0.92,
                spin: (Math.random() - 0.5) * 2,
                gravity: -20,
                settle: true
            });
        }
    }

    spawnBlood(x:number, y:number, dir:number) {
        // Тёмное пятно удара (дольше держится)
        const stain = new PIXI.Graphics();
        stain.ellipse(0, 0, 12 + Math.random() * 8, 7 + Math.random() * 5)
            .fill({ color: 0x2a0606, alpha: 0.9 });
        stain.ellipse(3, -1, 5, 3).fill({ color: 0x8b1212, alpha: 0.65 });
        stain.position.set(x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3);
        stain.rotation = dir + (Math.random() - 0.5) * 0.4;
        this.layer.addChild(stain);
        this.drops.push({
            gfx: stain,
            vx: 0,
            vy: 0,
            life: 1.4,
            total: 1.4,
            drag: 1,
            spin: 0,
            gravity: 0,
            settle: true
        });

        // Красная вспышка удара
        const flash = new PIXI.Graphics();
        flash.circle(0, 0, 8 + Math.random() * 4).fill({ color: 0xd22a2a, alpha: 0.55 });
        flash.position.set(x, y);
        this.layer.addChild(flash);
        this.drops.push({
            gfx: flash,
            vx: 0,
            vy: 0,
            life: 0.1,
            total: 0.1,
            drag: 1,
            spin: 0,
            gravity: 0,
            settle: false
        });

        // Основной конус брызг по направлению пули
        const count = 16 + Math.floor(Math.random() * 10);
        for (let i = 0; i < count; i++) {
            const drop = new PIXI.Graphics();
            const w = 1.2 + Math.random() * 3.2;
            const h = 2.5 + Math.random() * 8;
            const color = BLOOD_COLORS[Math.floor(Math.random() * BLOOD_COLORS.length)];
            drop.ellipse(0, 0, w, h).fill({ color, alpha: 0.88 + Math.random() * 0.12 });
            // хвостик капли
            if (Math.random() > 0.45) {
                drop.moveTo(0, h * 0.6);
                drop.lineTo(0, h * 0.6 + 2 + Math.random() * 4);
                drop.stroke({ color, width: Math.max(0.6, w * 0.35), alpha: 0.7 });
            }
            drop.position.set(x, y);
            const cone = (Math.random() - 0.5) * 1.1;
            const angle = dir + cone;
            drop.rotation = angle + Math.PI / 2;
            this.layer.addChild(drop);

            const speed = 90 + Math.random() * 260;
            const life = 0.32 + Math.random() * 0.4;
            this.drops.push({
                gfx: drop,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                life,
                total: life,
                drag: 0.9 + Math.random() * 0.06,
                spin: (Math.random() - 0.5) * 10,
                gravity: 320 + Math.random() * 180,
                settle: false
            });
        }

        // Мелкий аэрозоль вокруг
        for (let i = 0; i < 14; i++) {
            const speck = new PIXI.Graphics();
            const s = 0.6 + Math.random() * 1.8;
            speck.circle(0, 0, s).fill({
                color: BLOOD_COLORS[Math.floor(Math.random() * BLOOD_COLORS.length)],
                alpha: 0.85
            });
            speck.position.set(x, y);
            this.layer.addChild(speck);
            const angle = dir + (Math.random() - 0.5) * 2.2;
            const speed = 40 + Math.random() * 140;
            const life = 0.18 + Math.random() * 0.28;
            this.drops.push({
                gfx: speck,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                total: life,
                drag: 0.88,
                spin: 0,
                gravity: 200,
                settle: false
            });
        }

        // Пара крупных «сгустков», что быстро падают и остаются пятном
        for (let i = 0; i < 3; i++) {
            const clot = new PIXI.Graphics();
            clot.ellipse(0, 0, 3 + Math.random() * 4, 2 + Math.random() * 2.5)
                .fill({ color: 0x4a0b0b, alpha: 0.9 });
            clot.position.set(x, y);
            clot.rotation = Math.random() * Math.PI;
            this.layer.addChild(clot);
            const angle = dir + (Math.random() - 0.5) * 0.9;
            const life = 0.9 + Math.random() * 0.5;
            this.drops.push({
                gfx: clot,
                vx: Math.cos(angle) * (40 + Math.random() * 70),
                vy: Math.sin(angle) * (40 + Math.random() * 70) + 20,
                life,
                total: life,
                drag: 0.85,
                spin: (Math.random() - 0.5) * 3,
                gravity: 450,
                settle: true
            });
        }
    }

    private update(ticker:PIXI.Ticker) {
        const dt = ticker.deltaMS / 1000;
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            d.life -= dt;
            d.vx *= Math.pow(d.drag, dt * 60);
            d.vy *= Math.pow(d.drag, dt * 60);
            d.vy += d.gravity * dt;
            d.gfx.x += d.vx * dt;
            d.gfx.y += d.vy * dt;
            if (d.spin) {
                d.gfx.rotation += d.spin * dt;
            }
            const t = Math.max(0, d.life / d.total);
            if (d.settle) {
                // пятна гаснут мягче и дольше
                d.gfx.alpha = Math.min(1, t * 1.4) * 0.85;
            } else {
                d.gfx.alpha = t * t;
            }
            if (d.life <= 0) {
                d.gfx.destroy();
                this.drops.splice(i, 1);
            }
        }
    }

    destroy() {
        this.app.removeTicker(this.tickerFunc);
        this.drops.forEach(d => d.gfx.destroy());
        this.drops = [];
    }
}
