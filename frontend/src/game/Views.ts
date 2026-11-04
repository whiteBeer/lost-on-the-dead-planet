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

    constructor(private readonly type:string, size:number) {
        if (type === "zombie") {
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

        const barWidth = Math.max(36, size * 0.6);
        this.bar = new HealthBar(barWidth, type === "boss" ? 0xff7a1a : 0xc9d34a);
        this.bar.gfx.position.set(0, -size / 2 - 8);
        this.root.addChild(this.bar.gfx);
        this.bar.gfx.visible = false;
    }

    setTarget(x:number, y:number, rotation:number, moving:boolean) {
        this.tx = x;
        this.ty = y;
        this.tr = rotation;
        this.moving = moving;
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
    }

    destroy() {
        this.root.destroy({ children: true });
    }
}

export class PickupView {
    readonly root = new PIXI.Container();
    private time = Math.random() * 6;
    private icon:PIXI.Sprite;

    constructor(readonly kind:string, readonly weaponId:string, readonly x:number, readonly y:number, rarity?:string) {
        this.root.position.set(x, y);
        const textureName = kind === "medkit" ? "medkit" : `weapon_${weaponId}`;
        this.icon = new PIXI.Sprite(Assets.tex(textureName));
        this.icon.anchor.set(0.5);
        const target = kind === "medkit" ? 30 : 56;
        this.icon.scale.set(target / Math.max(this.icon.texture.width, this.icon.texture.height));

        if (kind === "weapon") {
            const glow = new PIXI.Graphics();
            glow.circle(0, 0, 30).fill({ color: RARITY_COLORS[rarity || "common"], alpha: 0.28 });
            glow.circle(0, 0, 30).stroke({ width: 2, color: RARITY_COLORS[rarity || "common"], alpha: 0.9 });
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
