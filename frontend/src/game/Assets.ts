import * as PIXI from "pixi.js";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const imgUrl = (name:string) => `${BASE}/img/${name}.png`;

export const MONSTERS = ["runner", "brute", "spitter", "spider", "hound", "boss"];
export const WEAPON_IDS = ["Pistol", "SMG", "Rifle", "Shotgun", "Crossbow", "Sniper", "Flamethrower", "Minigun", "Rocket", "Railgun"];
const OBSTACLES = ["tree", "rock", "wreck", "crate"];

export class Assets {
    static playerFrames:PIXI.Texture[] = [];
    static zombieFrames:PIXI.Texture[] = [];

    static async load() {
        const names = [
            "player_body_sprite", "zombie_sprite", "ground", "ground_dead", "medkit",
            ...MONSTERS.map(el => `monster_${el}`),
            ...WEAPON_IDS.map(el => `weapon_${el}`),
            ...OBSTACLES.map(el => `obstacle_${el}`)
        ];
        await PIXI.Assets.load(names.map(name => ({ alias: name, src: imgUrl(name) })));

        // Кадры анимации из оригинальной игры
        const playerSource = PIXI.Assets.get("player_body_sprite").source;
        for (let i = 0; i < 9; i++) {
            this.playerFrames.push(new PIXI.Texture({ source: playerSource, frame: new PIXI.Rectangle(0, i * 150, 150, 150) }));
        }
        const zombieSource = PIXI.Assets.get("zombie_sprite").source;
        for (let i = 0; i < 11; i++) {
            this.zombieFrames.push(new PIXI.Texture({ source: zombieSource, frame: new PIXI.Rectangle(0, i * 120, 150, 120) }));
        }
    }

    static tex(name:string):PIXI.Texture {
        return PIXI.Assets.get(name);
    }
}
