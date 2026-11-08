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
        health: 20,
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
        exp: 10
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
        health: 45,
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
        exp: 22
    },
    "Spitter": {
        id: "Spitter",
        tier: "yellow",
        name: "Плевальщик",
        health: 48,
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
        exp: 24
    },
    "Bloater": {
        id: "Bloater",
        tier: "yellow",
        name: "Раздутый",
        health: 55,
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
        exp: 26
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
    "Soldier": {
        id: "Soldier",
        tier: "yellow",
        name: "Солдат",
        health: 58,
        speed: 75,
        speedJitter: 18,
        width: 76,
        height: 68,
        bulletHit: { width: 76, height: 68 },
        playerTouch: { width: 46, height: 40 },
        damage: 17,
        attackInterval: 800,
        tint: 0xffffff,
        spriteKey: "monster_soldier",
        exp: 28
    },
    "Stalker": {
        id: "Stalker",
        tier: "red",
        name: "Призрак",
        health: 110,
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
        exp: 48
    },
    "Brute": {
        id: "Brute",
        tier: "red",
        name: "Громила",
        health: 130,
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
        exp: 55
    },
    "Behemoth": {
        id: "Behemoth",
        tier: "red",
        name: "Бегемот",
        health: 160,
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
        exp: 70
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
        exp: 220
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

/** Пулы типов по тиру волны — спавн выбирает случайно. */
export const TIER_ENEMY_POOL:Record<EnemyTier, string[]> = {
    green: ["Zombie", "Crawler", "Runner"],
    yellow: ["Hound", "Spitter", "Bloater", "Screamer", "Spider", "Soldier"],
    red: ["Stalker", "Brute", "Behemoth"],
    boss: ["Boss"]
};

/** @deprecated — оставлен для совместимости; предпочитай pickEnemyForTier */
export const TIER_TO_ENEMY:Record<EnemyTier, string> = {
    green: "Zombie",
    yellow: "Hound",
    red: "Brute",
    boss: "Boss"
};

export function pickEnemyForTier(tier:EnemyTier):string {
    const pool = TIER_ENEMY_POOL[tier];
    return pool[Math.floor(Math.random() * pool.length)];
}
