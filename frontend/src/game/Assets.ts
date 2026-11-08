import * as PIXI from "pixi.js";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const imgUrl = (name:string) => `${BASE}/img/${name}.png`;

export const MONSTERS = [
    "runner", "brute", "spitter", "spider", "hound", "boss",
    "crawler", "bloater", "screamer", "stalker", "soldier", "behemoth"
];
export const WEAPON_IDS = [
    "Pistol", "SMG", "Rifle", "Shotgun", "Crossbow", "Sniper", "Flamethrower", "Minigun", "Rocket", "Railgun",
    "Knife", "Spear", "Axe", "Pickaxe", "Bow", "Wrench"
];
export const ITEM_IDS = [
    "wood", "stone", "scrap", "bone", "hide", "slime", "cloth", "powder",
    "bandage", "medkit", "grenade", "mutagen", "armor_wood", "armor_bone", "armor_kevlar", "gasmask", "bag", "rope",
    "ammo_9mm", "ammo_556", "ammo_762", "ammo_12g", "arrow", "fuel", "rocket", "cell", "canned", "meat", "water", "coin", "pouch", "ore", "crystal"
];
const OBSTACLES = ["tree", "rock", "wreck", "crate"];
const ROOFS = ["house", "shop", "office", "tower"];

/** Картинка предмета в рюкзаке: у оружия своя, у остального — item_<id>. */
export function itemImage(id:string) {
    return id.startsWith("w:") ? imgUrl(`weapon_${id.slice(2)}`) : imgUrl(`item_${id}`);
}
const PERK_ICONS = [
    "perk_assault_instinct", "perk_iron_heart", "perk_field_medic", "perk_light_boots",
    "perk_eagle_eye", "perk_bottomless_mag", "perk_trophy_hunter", "perk_chain_thunder"
];

export class Assets {
    static playerFrames:PIXI.Texture[] = [];
    static zombieFrames:PIXI.Texture[] = [];

    static async load() {
        const names = [
            "player_body_sprite", "zombie_sprite", "ground", "ground_dry", "ground_dead", "asphalt", "medkit", "chest", "parachute",
            ...ROOFS.map(el => `roof_${el}`),
            ...ITEM_IDS.map(el => `item_${el}`),
            ...MONSTERS.map(el => `monster_${el}`),
            ...WEAPON_IDS.map(el => `weapon_${el}`),
            ...OBSTACLES.map(el => `obstacle_${el}`),
            ...PERK_ICONS
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
