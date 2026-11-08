import * as PIXI from "pixi.js";

const MONSTER_KEYS = [
    "monster_crawler",
    "monster_runner",
    "monster_hound",
    "monster_spider",
    "monster_brute",
    "monster_spitter",
    "monster_bloater",
    "monster_screamer",
    "monster_stalker",
    "monster_soldier",
    "monster_behemoth",
    "monster_boss"
];

const WEAPON_KEYS = [
    "weapon_Pistol",
    "weapon_SMG",
    "weapon_Rifle",
    "weapon_Shotgun",
    "weapon_Sniper"
];

const PERK_KEYS = [
    "perk_assault_instinct",
    "perk_bottomless_mag",
    "perk_chain_thunder",
    "perk_eagle_eye",
    "perk_field_medic",
    "perk_iron_heart",
    "perk_light_boots",
    "perk_trophy_hunter"
];

const WALK_FRAME_COUNT = 8;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export class ResourcesLoader {

    public static enemies:Record<string, PIXI.Texture[]> = {};
    public static players:Record<string, PIXI.Texture[]> = {};
    public static textures:Record<string, PIXI.Texture> = {};

    public static async loadAssets():Promise<void> {
        PIXI.Assets.add({ alias: "playerTex", src: `${BASE_PATH}/img/player_body_sprite.png` });
        PIXI.Assets.add({ alias: "enemyZombieTex", src: `${BASE_PATH}/img/zombie_sprite.png` });
        PIXI.Assets.add({ alias: "ground", src: `${BASE_PATH}/img/ground.png` });

        for (const key of MONSTER_KEYS) {
            PIXI.Assets.add({ alias: key, src: `${BASE_PATH}/img/${key}.png` });
        }
        for (const key of WEAPON_KEYS) {
            PIXI.Assets.add({ alias: key, src: `${BASE_PATH}/img/${key}.png` });
        }
        for (const key of PERK_KEYS) {
            PIXI.Assets.add({ alias: key, src: `${BASE_PATH}/img/${key}.png` });
        }

        const aliases = [
            "playerTex", "enemyZombieTex", "ground",
            ...MONSTER_KEYS, ...WEAPON_KEYS, ...PERK_KEYS
        ];
        await PIXI.Assets.load(aliases);

        this.textures.ground = PIXI.Assets.get("ground");
        for (const key of [...MONSTER_KEYS, ...WEAPON_KEYS, ...PERK_KEYS]) {
            this.textures[key] = PIXI.Assets.get(key);
        }

        this.enemies["zombie"] = this.initZombieTextures();
        this.textures["zombie"] = this.enemies["zombie"][0];

        for (const key of MONSTER_KEYS) {
            const base = this.textures[key];
            this.enemies[key] = this.createWalkFrames(base, WALK_FRAME_COUNT);
        }

        this.players["player1"] = this.initPlayerTextures();
    }

    public static getTexture(key:string):PIXI.Texture | null {
        return this.textures[key] || PIXI.Assets.get(key) || null;
    }

    /** Кадры анимации монстра (зомби — спрайтшит, остальные — walk из одной текстуры). */
    public static getEnemyFrames(spriteKey:string):PIXI.Texture[] | null {
        if (!spriteKey) {
            return null;
        }
        return this.enemies[spriteKey] || null;
    }

    public static initPlayerTextures():PIXI.Texture[] {
        const playerTexture = PIXI.Assets.get("playerTex");
        const playerFrames:PIXI.Texture[] = [];
        for (let i = 0; i < 9; i++) {
            playerFrames.push(
                new PIXI.Texture({
                    source: playerTexture.source,
                    frame: new PIXI.Rectangle(0, i * 150, 150, 150)
                })
            );
        }
        return playerFrames;
    }

    public static getPlayerTextures():PIXI.Texture[] {
        return this.players["player1"];
    }

    public static initZombieTextures():PIXI.Texture[] {
        const zombieTexture = PIXI.Assets.get("enemyZombieTex");
        const zombieFrames:PIXI.Texture[] = [];
        for (let i = 0; i < 11; i++) {
            zombieFrames.push(
                new PIXI.Texture({
                    source: zombieTexture.source,
                    frame: new PIXI.Rectangle(0, i * 120, 150, 120)
                })
            );
        }
        return zombieFrames;
    }

    public static getZombieTextures():PIXI.Texture[] {
        return this.enemies["zombie"];
    }

    public static getPlayerTexture():PIXI.Texture {
        return PIXI.Assets.get("playerTex");
    }

    /** Равномерный scale: длинная сторона = targetSize (без сплющивания). */
    public static fitSprite(sprite:PIXI.Sprite, targetSize:number) {
        const tw = sprite.texture.width || 1;
        const th = sprite.texture.height || 1;
        const scale = targetSize / Math.max(tw, th);
        sprite.scale.set(scale);
    }

    /**
     * Walk-цикл из одного кадра: squash/bob/tilt → AnimatedSprite,
     * по аналогии с покадровой анимацией зомби.
     */
    private static createWalkFrames(tex:PIXI.Texture, frameCount:number):PIXI.Texture[] {
        const src = this.getTextureImageSource(tex);
        if (!src) {
            return [tex];
        }

        const frame = tex.frame;
        const w = Math.max(1, Math.floor(frame.width));
        const h = Math.max(1, Math.floor(frame.height));
        const padY = Math.ceil(h * 0.14);
        const cw = w;
        const ch = h + padY * 2;
        const frames:PIXI.Texture[] = [];

        for (let i = 0; i < frameCount; i++) {
            const t = (i / frameCount) * Math.PI * 2;
            const bob = Math.sin(t);
            const scaleX = 1 - bob * 0.09;
            const scaleY = 1 + bob * 0.11;
            const tilt = Math.sin(t * 0.5) * 0.07;

            const canvas = document.createElement("canvas");
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                frames.push(tex);
                continue;
            }

            ctx.clearRect(0, 0, cw, ch);
            ctx.imageSmoothingEnabled = true;
            ctx.save();
            ctx.translate(cw / 2, ch / 2 + bob * padY * 0.35);
            ctx.rotate(tilt);
            ctx.scale(scaleX, scaleY);
            ctx.drawImage(
                src,
                frame.x, frame.y, frame.width, frame.height,
                -w / 2, -h / 2, w, h
            );
            ctx.restore();

            frames.push(PIXI.Texture.from(canvas));
        }

        return frames;
    }

    private static getTextureImageSource(
        tex:PIXI.Texture
    ):CanvasImageSource | null {
        const resource = tex.source?.resource as unknown;
        if (!resource) {
            return null;
        }
        if (
            resource instanceof HTMLImageElement ||
            resource instanceof HTMLCanvasElement ||
            resource instanceof ImageBitmap
        ) {
            return resource;
        }
        const nested = (resource as { source?:unknown }).source;
        if (
            nested instanceof HTMLImageElement ||
            nested instanceof HTMLCanvasElement ||
            nested instanceof ImageBitmap
        ) {
            return nested;
        }
        return null;
    }
}
