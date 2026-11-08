import * as PIXI from "pixi.js";
import { Assets } from "./Assets";

// Размах угла с учётом перехода через ±π
function lerpAngle(from:number, to:number, k:number) {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return from + diff * k;
}

const NAME_COLORS = { me: 0xffffff, ally: 0x8ff06a, enemy: 0xffb0a0 };
export const RARITY_COLORS:Record<string, number> = {
    common: 0xbdbdbd, uncommon: 0x7fd86a, rare: 0x5ab0ff, epic: 0xc77dff, legendary: 0xffb13d
};

class HealthBar {
    readonly gfx = new PIXI.Graphics();
    private lastRatio = -1;

    constructor(private readonly width:number, private readonly color:number) {}

    set(hp:number, maxHp:number) {
        const ratio = Math.max(0, Math.min(1, hp / maxHp));
        if (ratio === this.lastRatio) {
            return;
        }
        this.lastRatio = ratio;
        const w = this.width;
        this.gfx.clear();
        this.gfx.rect(-w / 2, 0, w, 5).fill({ color: 0x000000, alpha: 0.65 });
        this.gfx.rect(-w / 2 + 1, 1, (w - 2) * ratio, 3).fill(this.color);
    }
}

export class PlayerView {
    readonly root = new PIXI.Container();
    private body:PIXI.AnimatedSprite;
    private bar:HealthBar;
    private label:PIXI.Text;
    private shield = new PIXI.Graphics();
    private tx = 0;
    private ty = 0;
    private tr = 0;
    private rel:"me" | "ally" | "enemy";
    private name:string;
    private movedAt = 0;

    constructor(name:string, rel:"me" | "ally" | "enemy", radius:number) {
        this.name = name;
        this.rel = rel;
        this.body = new PIXI.AnimatedSprite(Assets.playerFrames);
        this.body.animationSpeed = 0.5;
        this.body.anchor.set(0.5);
        this.body.width = radius * 2.5;
        this.body.height = radius * 3;
        this.body.rotation = -Math.PI / 2; // Спрайт нарисован лицом вверх
        this.root.addChild(this.body);

        this.shield.circle(0, 0, radius + 7).stroke({ width: 2, color: 0x8fd8ff, alpha: 0.8 });
        this.shield.visible = false;
        this.root.addChild(this.shield);

        this.bar = new HealthBar(44, rel === "enemy" ? 0xe25555 : 0x7ad957);
        this.bar.gfx.position.set(0, -radius - 18);
        this.label = new PIXI.Text({
            text: name,
            style: { fontFamily: "Rubik, Arial", fontSize: 13, fontWeight: "600", fill: NAME_COLORS[rel], stroke: { color: 0x000000, width: 3 } },
            resolution: 2
        });
        this.label.anchor.set(0.5, 1);
        this.label.position.set(0, -radius - 20);

        // Подпись и полоса здоровья не должны вращаться вместе с телом
        this.hud = new PIXI.Container();
        this.hud.addChild(this.bar.gfx, this.label);
        this.root.addChild(this.hud);
    }

    private hud:PIXI.Container;

    setIdentity(name:string, rel:"me" | "ally" | "enemy") {
        if (name !== this.name) {
            this.name = name;
            this.label.text = name;
        }
        if (rel !== this.rel) {
            this.rel = rel;
            this.label.style.fill = NAME_COLORS[rel];
        }
    }

    setTarget(x:number, y:number, rotation:number) {
        if (Math.abs(x - this.tx) > 0.5 || Math.abs(y - this.ty) > 0.5) {
            this.movedAt = performance.now();
        }
        this.tx = x;
        this.ty = y;
        this.tr = rotation;
    }

    teleport(x:number, y:number, rotation:number) {
        this.tx = x;
        this.ty = y;
        this.tr = rotation;
        this.root.position.set(x, y);
        this.body.parent.rotation = 0;
        this.body.rotation = rotation - Math.PI / 2;
        this.shield.rotation = 0;
    }

    setMoving(moving:boolean) {
        if (moving && !this.body.playing) {
            this.body.play();
        } else if (!moving && this.body.playing) {
            this.body.stop();
        }
    }

    setHealth(hp:number, maxHp:number) {
        this.bar.set(hp, maxHp);
    }

    setProtected(value:boolean) {
        this.shield.visible = value;
    }

    update(dt:number) {
        const k = Math.min(1, dt * 14);
        this.root.x += (this.tx - this.root.x) * k;
        this.root.y += (this.ty - this.root.y) * k;
        this.body.rotation = lerpAngle(this.body.rotation, this.tr - Math.PI / 2, Math.min(1, dt * 20));
        this.setMoving(performance.now() - this.movedAt < 200);
    }

    destroy() {
        this.root.destroy({ children: true });
    }
}

// Люди: охрана и торговец лагеря, охотники за головами, наёмник
const PEOPLE:Record<string, { tint:number, label:string, color:number }> = {
    guard: { tint: 0x9ec8ff, label: "Охрана", color: 0x9ec8ff },
    trader: { tint: 0xb8f08a, label: "Торговец", color: 0xb8f08a },
    hunter: { tint: 0xff8a7a, label: "Охотник", color: 0xff7a6a },
    merc: { tint: 0xffe08a, label: "Наёмник", color: 0xffe08a }
};

export class EnemyView {
    readonly root = new PIXI.Container();
    private sprite:PIXI.Sprite;
    private bar:HealthBar;
    private tx = 0;
    private ty = 0;
    private tr = 0;
    private rot = 0;
    private phase = Math.random() * 10;
    private moving = false;
    private baseScaleX = 1;
    private baseScaleY = 1;

    constructor(readonly type:string, size:number) {
        const person = PEOPLE[type];
        if (person) {
            const body = new PIXI.AnimatedSprite(Assets.playerFrames);
            body.animationSpeed = 0.4;
            body.play();
            body.tint = person.tint;
            this.sprite = body;
        } else if (type === "zombie") {
            const animated = new PIXI.AnimatedSprite(Assets.zombieFrames);
            animated.animationSpeed = 0.2;
            animated.play();
            this.sprite = animated;
        } else {
            this.sprite = new PIXI.Sprite(Assets.tex(`monster_${type}`));
        }
        this.sprite.anchor.set(0.5);
        const base = Math.max(this.sprite.texture.width, this.sprite.texture.height);
        this.baseScaleX = size / base;
        this.baseScaleY = size / base;
        this.sprite.scale.set(this.baseScaleX, this.baseScaleY);
        this.root.addChild(this.sprite);
        if (person) {
            const label = new PIXI.Text({
                text: person.label,
                style: { fontFamily: "Rubik, Arial", fontSize: 13, fontWeight: "800", fill: person.color, stroke: { color: 0x000000, width: 4 } },
                resolution: 2
            });
            label.anchor.set(0.5, 1);
            label.position.set(0, -size / 2 - 12);
            this.root.addChild(label);
        }

        const barWidth = Math.max(36, size * 0.6);
        this.bar = new HealthBar(barWidth, type === "boss" ? 0xff7a1a : 0xc9d34a);
        this.bar.gfx.position.set(0, -size / 2 - 8);
        this.root.addChild(this.bar.gfx);
        this.bar.gfx.visible = false;
    }

    private hidden = false;
    private charging = false;

    get x() {
        return this.tx;
    }

    get y() {
        return this.ty;
    }

    setTarget(x:number, y:number, rotation:number, flags:number) {
        this.tx = x;
        this.ty = y;
        this.tr = rotation;
        this.moving = (flags & 1) !== 0;
        this.hidden = (flags & 2) !== 0;
        this.charging = (flags & 4) !== 0;
    }

    teleport(x:number, y:number, rotation:number) {
        this.tx = x;
        this.ty = y;
        this.tr = rotation;
        this.rot = rotation;
        this.root.position.set(x, y);
    }

    setHealth(hp:number, maxHp:number) {
        this.bar.gfx.visible = hp < maxHp;
        this.bar.set(hp, maxHp);
    }

    update(dt:number) {
        const k = Math.min(1, dt * 12);
        this.root.x += (this.tx - this.root.x) * k;
        this.root.y += (this.ty - this.root.y) * k;
        this.rot = lerpAngle(this.rot, this.tr, Math.min(1, dt * 8));
        this.sprite.rotation = this.rot;

        let squash = 1;
        if (this.type !== "zombie" && this.moving) {
            // У нарисованных одним кадром монстров шаг изображает лёгкое покачивание
            this.phase += dt * 11;
            squash = 1 + Math.sin(this.phase) * 0.06;
            this.sprite.rotation += Math.sin(this.phase * 0.5) * 0.06;
        }
        this.sprite.scale.set(this.baseScaleX * squash, this.baseScaleY / squash);
        // Невидимку выдаёт лишь лёгкое дрожание воздуха
        const targetAlpha = this.hidden ? 0.1 : 1;
        this.root.alpha += (targetAlpha - this.root.alpha) * Math.min(1, dt * 6);
        this.sprite.tint = this.charging ? 0xff8080 : 0xffffff;
    }

    destroy() {
        this.root.destroy({ children: true });
    }
}

export class PickupView {
    readonly root = new PIXI.Container();
    private time = Math.random() * 6;
    private icon:PIXI.Sprite;

    constructor(readonly kind:string, readonly weaponId:string, readonly x:number, readonly y:number, rarity?:string, readonly count = 0) {
        this.root.position.set(x, y);
        const textureName = kind === "medkit" ? "medkit"
            : kind === "perk" ? `perk_${weaponId}`
                : kind === "item" ? `item_${weaponId}`
                    : kind === "bag" ? "item_bag"
                        : `weapon_${weaponId}`;
        this.icon = new PIXI.Sprite(Assets.tex(textureName));
        this.icon.anchor.set(0.5);
        const target = kind === "medkit" ? 30 : kind === "perk" ? 46 : kind === "item" ? 30 : kind === "bag" ? 42 : 56;
        if (count > 1) {
            const label = new PIXI.Text({
                text: String(count),
                style: { fontFamily: "Rubik, Arial", fontSize: 12, fontWeight: "700", fill: 0xffffff, stroke: { color: 0x000000, width: 3 } }
            });
            label.anchor.set(0, 0);
            label.position.set(8, 4);
            this.root.addChild(label);
        }
        this.icon.scale.set(target / Math.max(this.icon.texture.width, this.icon.texture.height));

        if (kind === "weapon" || kind === "perk") {
            const glow = new PIXI.Graphics();
            const color = kind === "perk" ? 0xffd85a : RARITY_COLORS[rarity || "common"];
            glow.circle(0, 0, 30).fill({ color, alpha: 0.28 });
            glow.circle(0, 0, 30).stroke({ width: 2, color, alpha: 0.9 });
            this.root.addChild(glow);
        }
        this.root.addChild(this.icon);
    }

    update(dt:number) {
        this.time += dt;
        this.icon.y = Math.sin(this.time * 3) * 3;
    }

    destroy() {
        this.root.destroy({ children: true });
    }
}

const FALL_HEIGHT = 320;

/** Аирдроп: тень и метка на земле, ящик спускается на парашюте, после приземления — красный дым. */
export class ChestView {
    readonly root = new PIXI.Container();
    private marker = new PIXI.Graphics();
    private shadow = new PIXI.Graphics();
    private drop = new PIXI.Container();
    private chute = new PIXI.Graphics();
    private icon = new PIXI.Sprite(Assets.tex("chest"));
    private smoke = new PIXI.Container();
    private timer:PIXI.Text;
    private landsAt = performance.now();
    private fallTotal = 45000;
    private time = Math.random() * 6;
    private puffAt = 0;
    landed = false;

    constructor(readonly x:number, readonly y:number, landsInMs:number) {
        this.root.position.set(x, y);
        this.marker.circle(0, 0, 60).stroke({ width: 3, color: 0xff5a3a, alpha: 0.85 });
        this.marker.moveTo(-14, 0).lineTo(14, 0).moveTo(0, -14).lineTo(0, 14).stroke({ width: 3, color: 0xff5a3a, alpha: 0.85 });
        this.shadow.ellipse(0, 6, 34, 14).fill({ color: 0x000000, alpha: 0.4 });
        this.root.addChild(this.marker, this.shadow, this.smoke);

        // Купол парашюта: полосатый полукруг и стропы к ящику
        const stripes = [0xf2f2ea, 0xff6a3d, 0xf2f2ea, 0xff6a3d, 0xf2f2ea];
        const w = 116;
        stripes.forEach((color, i) => {
            const a0 = Math.PI + i / stripes.length * Math.PI;
            const a1 = Math.PI + (i + 1) / stripes.length * Math.PI;
            this.chute.moveTo(0, -70).arc(0, -70, w / 2, a0, a1).lineTo(0, -70).fill({ color });
        });
        this.chute.arc(0, -70, w / 2, Math.PI, Math.PI * 2).stroke({ width: 2, color: 0x6b2a18 });
        for (const sx of [-w / 2, -w / 6, w / 6, w / 2]) {
            this.chute.moveTo(sx, -70).lineTo(sx * 0.25, -22).stroke({ width: 1.5, color: 0x2a2a22, alpha: 0.8 });
        }
        this.icon.anchor.set(0.5);
        this.icon.scale.set(70 / Math.max(this.icon.texture.width, this.icon.texture.height));
        this.drop.addChild(this.chute, this.icon);
        this.root.addChild(this.drop);

        this.timer = new PIXI.Text({
            text: "",
            style: {
                fontFamily: "Rubik, Arial", fontSize: 18, fontWeight: "800", fill: 0xffe08a,
                stroke: { color: 0x000000, width: 5 }
            },
            resolution: 2
        });
        this.timer.anchor.set(0.5, 0);
        this.timer.position.set(0, 40);
        this.root.addChild(this.timer);
        this.fallTotal = Math.max(landsInMs, this.fallTotal);
        this.setRemaining(landsInMs);
    }

    setRemaining(ms:number) {
        this.landsAt = performance.now() + Math.max(0, ms);
    }

    update(dt:number) {
        this.time += dt;
        const leftMs = Math.max(0, this.landsAt - performance.now());
        const k = leftMs / this.fallTotal;          // 1 — только сбросили, 0 — на земле
        this.landed = leftMs <= 0;
        this.drop.y = -FALL_HEIGHT * k;
        this.drop.rotation = this.landed ? 0 : Math.sin(this.time * 1.6) * 0.12 * Math.min(1, k * 4);
        this.drop.scale.set(1 + k * 0.35);
        this.chute.visible = !this.landed;
        this.icon.y = this.landed ? 0 : -6;
        this.shadow.scale.set(0.45 + (1 - k) * 0.55);
        this.shadow.alpha = 0.35 + (1 - k) * 0.65;
        this.marker.visible = !this.landed;
        this.marker.alpha = 0.55 + Math.sin(this.time * 5) * 0.3;
        this.marker.scale.set(1 + Math.sin(this.time * 2.5) * 0.06);

        if (this.landed) {
            this.timer.text = "АИРДРОП";
            this.timer.style.fill = 0xff8a5a;
            // Красный сигнальный дым, видно издалека
            if (this.time > this.puffAt) {
                this.puffAt = this.time + 0.12;
                const puff = new PIXI.Graphics();
                puff.circle(0, 0, 10 + Math.random() * 8).fill({ color: 0xd9412b, alpha: 0.55 });
                puff.position.set(-14 + Math.random() * 10, -10);
                this.smoke.addChild(puff);
            }
            for (const puff of [...this.smoke.children]) {
                puff.y -= 38 * dt;
                puff.x += (12 + Math.sin(this.time + puff.y * 0.05) * 10) * dt;
                puff.scale.set(puff.scale.x + dt * 0.9);
                puff.alpha -= dt * 0.28;
                if (puff.alpha <= 0) {
                    puff.destroy();
                }
            }
        } else {
            const left = Math.ceil(leftMs / 1000);
            this.timer.text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        }
    }

    destroy() {
        this.root.destroy({ children: true });
    }
}
