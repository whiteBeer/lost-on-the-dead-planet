export type EnemyTier = "green" | "yellow" | "red" | "boss";

/** Окраска спрайта по тиру (как раньше у Grunt/Fighter/Elite). */
export const TIER_TINT:Record<EnemyTier, number> = {
    green: 0xffffff,
    yellow: 0xffeb3b,
    red: 0xf44336,
    boss: 0x111111
};

export interface HitboxRect {
    width:number;
    height:number;
}

export interface EnemyConfig {
    id:string;
    tier:EnemyTier;
    name:string;
    health:number;
    speed:number;
    speedJitter:number;
    /** Размер спрайта на клиенте */
    width:number;
    height:number;
    /** Прямоугольник попадания пулей (обычно ≈ спрайту) */
    bulletHit:HitboxRect;
    /** Прямоугольник касания игрока (обычно уже bulletHit) */
    playerTouch:HitboxRect;
    damage:number;
    attackInterval:number;
    tint:number;
    /** Ключ текстуры; "zombie" = анимированный спрайтшит */
    spriteKey:string;
    exp:number;
}

export const ENEMIES:Record<string, EnemyConfig> = {
    "Zombie": {
        id: "Zombie",
        tier: "green",
        name: "Зомби",
        health: 23,
        speed: 52,
        speedJitter: 18,
        width: 70,
        height: 60,
        bulletHit: { width: 70, height: 60 },
        playerTouch: { width: 42, height: 36 },
        damage: 10,
        attackInterval: 780,
        tint: 0xffffff,
        spriteKey: "zombie",
        exp: 12
    },
    "Crawler": {
        id: "Crawler",
        tier: "green",
        name: "Ползун",
        health: 60,
        speed: 40,
        speedJitter: 12,
        width: 66,
        height: 56,
        bulletHit: { width: 66, height: 56 },
        playerTouch: { width: 40, height: 34 },
        damage: 8,
        attackInterval: 900,
        tint: 0xffffff,
        spriteKey: "monster_crawler",
        exp: 30
    },
    "Runner": {
        id: "Runner",
        tier: "green",
        name: "Бегун",
        health: 18,
        speed: 125,
        speedJitter: 35,
        width: 64,
        height: 56,
        bulletHit: { width: 64, height: 56 },
        playerTouch: { width: 38, height: 34 },
        damage: 9,
        attackInterval: 600,
        tint: 0xffffff,
        spriteKey: "monster_runner",
        exp: 14
    },
    "Hound": {
        id: "Hound",
        tier: "yellow",
        name: "Гончая",
        health: 135,
        speed: 160,
        speedJitter: 30,
        width: 66,
        height: 58,
        bulletHit: { width: 66, height: 58 },
        playerTouch: { width: 40, height: 36 },
        damage: 14,
        attackInterval: 650,
        tint: 0xffffff,
        spriteKey: "monster_hound",
        exp: 66
    },
    "Spitter": {
        id: "Spitter",
        tier: "yellow",
        name: "Плевальщик",
        health: 96,
        speed: 70,
        speedJitter: 20,
        width: 76,
        height: 68,
        bulletHit: { width: 76, height: 68 },
        playerTouch: { width: 46, height: 40 },
        damage: 15,
        attackInterval: 900,
        tint: 0xffffff,
        spriteKey: "monster_spitter",
        exp: 48
    },
    "Bloater": {
        id: "Bloater",
        tier: "yellow",
        name: "Раздутый",
        health: 165,
        speed: 48,
        speedJitter: 15,
        width: 88,
        height: 78,
        bulletHit: { width: 88, height: 78 },
        playerTouch: { width: 52, height: 46 },
        damage: 18,
        attackInterval: 1000,
        tint: 0xffffff,
        spriteKey: "monster_bloater",
        exp: 78
    },
    "Screamer": {
        id: "Screamer",
        tier: "yellow",
        name: "Крикун",
        health: 42,
        speed: 95,
        speedJitter: 20,
        width: 74,
        height: 64,
        bulletHit: { width: 74, height: 64 },
        playerTouch: { width: 44, height: 38 },
        damage: 13,
        attackInterval: 850,
        tint: 0xffffff,
        spriteKey: "monster_screamer",
        exp: 24
    },
    "Spider": {
        id: "Spider",
        tier: "yellow",
        name: "Паук",
        health: 50,
        speed: 140,
        speedJitter: 40,
        width: 84,
        height: 72,
        bulletHit: { width: 84, height: 72 },
        playerTouch: { width: 48, height: 42 },
        damage: 16,
        attackInterval: 750,
        tint: 0xffffff,
        spriteKey: "monster_spider",
        exp: 28
    },
    "Stalker": {
        id: "Stalker",
        tier: "red",
        name: "Призрак",
        health: 330,
        speed: 145,
        speedJitter: 25,
        width: 78,
        height: 70,
        bulletHit: { width: 78, height: 70 },
        playerTouch: { width: 46, height: 42 },
        damage: 24,
        attackInterval: 700,
        tint: 0xffffff,
        spriteKey: "monster_stalker",
        exp: 144
    },
    "Brute": {
        id: "Brute",
        tier: "red",
        name: "Громила",
        health: 260,
        speed: 78,
        speedJitter: 20,
        width: 100,
        height: 90,
        bulletHit: { width: 100, height: 90 },
        playerTouch: { width: 58, height: 52 },
        damage: 28,
        attackInterval: 820,
        tint: 0xffffff,
        spriteKey: "monster_brute",
        exp: 110
    },
    "Behemoth": {
        id: "Behemoth",
        tier: "red",
        name: "Бегемот",
        health: 480,
        speed: 55,
        speedJitter: 12,
        width: 130,
        height: 116,
        bulletHit: { width: 130, height: 116 },
        playerTouch: { width: 72, height: 64 },
        damage: 34,
        attackInterval: 1000,
        tint: 0xffffff,
        spriteKey: "monster_behemoth",
        exp: 210
    },
    "Boss": {
        id: "Boss",
        tier: "boss",
        name: "Владыка",
        health: 2800,
        speed: 48,
        speedJitter: 8,
        width: 160,
        height: 142,
        bulletHit: { width: 160, height: 142 },
        playerTouch: { width: 90, height: 80 },
        damage: 36,
        /** Интервал выстрела (и melee на касании) */
        attackInterval: 1100,
        tint: 0x111111,
        spriteKey: "monster_boss",
        exp: 660
    }
};

// Визуал + хитбоксы +30%, tint по тиру
for (const cfg of Object.values(ENEMIES)) {
    cfg.width = Math.round(cfg.width * 1.3);
    cfg.height = Math.round(cfg.height * 1.3);
    cfg.bulletHit = {
        width: Math.round(cfg.bulletHit.width * 1.3),
        height: Math.round(cfg.bulletHit.height * 1.3)
    };
    cfg.playerTouch = {
        width: Math.round(cfg.playerTouch.width * 1.3),
        height: Math.round(cfg.playerTouch.height * 1.3)
    };
    cfg.tint = TIER_TINT[cfg.tier];
}

/** Пулы оставлены для совместимости. Спавн берёт любой вид и красит его в цвет слота. */
export const TIER_ENEMY_POOL:Record<EnemyTier, string[]> = {
    green: ["Zombie", "Crawler", "Runner"],
    yellow: ["Hound", "Spitter", "Bloater", "Screamer", "Spider"],
    red: ["Stalker", "Brute", "Behemoth"],
    boss: ["Boss"]
};

export const ALL_MONSTERS = Object.keys(ENEMIES).filter((id) => id !== "Boss");

const EARLY_MONSTERS = ["Runner", "Screamer", "Spider", "Zombie"];
const MID_MONSTERS = [...EARLY_MONSTERS, "Spitter", "Brute"];

/** Волны 1–4: ранний пул, 5–10: плюс spitter и brute, дальше все виды. */
export function monstersForWave(wave:number):string[] {
    if (wave < 5) {
        return EARLY_MONSTERS;
    }
    if (wave <= 10) {
        return MID_MONSTERS;
    }
    return ALL_MONSTERS;
}

/** Любой вид, кроме босса. Цвет задаётся отдельно. */
export function pickAnyMonster(wave = 99):string {
    const pool = monstersForWave(wave);
    return pool[Math.floor(Math.random() * pool.length)];
}

/** Насколько цвет усиливает вид относительно его «родного» тира в конфиге. */
export const TIER_POWER:Record<Exclude<EnemyTier, "boss">, { hp:number, dmg:number, exp:number }> = {
    green: { hp: 1, dmg: 1, exp: 1 },
    yellow: { hp: 2.1, dmg: 1.5, exp: 1.8 },
    red: { hp: 4.2, dmg: 2.2, exp: 3.4 }
};

export function tierStatScale(native:EnemyTier, color:EnemyTier) {
    if (native === "boss" || color === "boss") {
        return { hp: 1, dmg: 1, exp: 1 };
    }
    const from = TIER_POWER[native];
    const to = TIER_POWER[color];
    return { hp: to.hp / from.hp, dmg: to.dmg / from.dmg, exp: to.exp / from.exp };
}

/** @deprecated — оставлен для совместимости; предпочитай pickEnemyForTier */
export const TIER_TO_ENEMY:Record<EnemyTier, string> = {
    green: "Zombie",
    yellow: "Hound",
    red: "Brute",
    boss: "Boss"
};

export function pickEnemyForTier(tier:EnemyTier, wave = 1):string {
    if (tier === "boss") {
        return "Boss";
    }
    return pickAnyMonster(wave);
}
