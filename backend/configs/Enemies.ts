import { LootRow } from "./Items";

export interface EnemyConfig {
    id:string;
    name:string;
    tier:number;        // Уровень опасности: влияет на редкость выпавшего оружия
    health:number;
    speed:number;       // Базовая скорость (пикс/сек)
    speedJitter:number; // Случайная прибавка к скорости
    radius:number;      // Радиус столкновений
    size:number;        // Размер спрайта на клиенте
    damage:number;      // Урон за удар
    attackInterval:number; // Задержка между ударами, мс
    aggro:number;       // С какого расстояния замечает игрока
    exp:number;
    dropChance:number;  // Шанс выпадения оружия
    healChance:number;  // Шанс выпадения аптечки
    loot:LootRow[];     // Ресурсы: [предмет, шанс, минимум, максимум]
    // Где появляется: опасность точки от 0 (самая безопасная) до 1
    zoneMin:number;
    zoneMax:number;
    weight:number;      // Частота появления
    urban?:number;      // Множитель частоты в городах
    armor?:number;      // Доля снижения входящего урона
    ranged?:{ range:number, speed:number, damage:number, interval:number, kind?:string };
    keepDistance?:number;  // Держится на расстоянии и стреляет или кричит
    explode?:{ radius:number, damage:number, trigger:number }; // Взрывается рядом с игроком и при смерти
    summon?:{ interval:number, count:number, type:string, cap:number };
    stealth?:number;    // Невидим, пока не подойдёт ближе этого расстояния
    charge?:{ interval:number, range:number, speedMul:number, duration:number };
}

export const ENEMIES:Record<string, EnemyConfig> = {
    "crawler": {
        id: "crawler", name: "Ползун", tier: 1, health: 25, speed: 28, speedJitter: 15,
        radius: 20, size: 66, damage: 6, attackInterval: 900, aggro: 360,
        exp: 6, dropChance: 0.01, healChance: 0.03, zoneMin: 0, zoneMax: 0.6, weight: 30,
        loot: [["cloth", 0.3, 1, 1], ["bone", 0.25, 1, 1]]
    },
    "zombie": {
        id: "zombie", name: "Зомби", tier: 1, health: 50, speed: 35, speedJitter: 40,
        radius: 24, size: 75, damage: 12, attackInterval: 800, aggro: 520,
        exp: 10, dropChance: 0.025, healChance: 0.04, zoneMin: 0, zoneMax: 0.9, weight: 50, urban: 1.5,
        loot: [["cloth", 0.35, 1, 2], ["bone", 0.2, 1, 1]]
    },
    "runner": {
        id: "runner", name: "Бегун", tier: 1, health: 35, speed: 125, speedJitter: 40,
        radius: 20, size: 64, damage: 8, attackInterval: 600, aggro: 620,
        exp: 15, dropChance: 0.03, healChance: 0.04, zoneMin: 0.18, zoneMax: 0.95, weight: 22,
        loot: [["bone", 0.35, 1, 2], ["cloth", 0.2, 1, 1]]
    },
    "hound": {
        id: "hound", name: "Гончая", tier: 2, health: 60, speed: 185, speedJitter: 30,
        radius: 20, size: 66, damage: 11, attackInterval: 650, aggro: 720,
        exp: 25, dropChance: 0.04, healChance: 0.04, zoneMin: 0.3, zoneMax: 1, weight: 14,
        loot: [["hide", 0.6, 1, 2], ["bone", 0.4, 1, 2], ["meat", 0.5, 1, 1]]
    },
    "spitter": {
        id: "spitter", name: "Плевальщик", tier: 2, health: 80, speed: 55, speedJitter: 20,
        radius: 24, size: 76, damage: 10, attackInterval: 900, aggro: 760,
        exp: 30, dropChance: 0.05, healChance: 0.06, zoneMin: 0.35, zoneMax: 1, weight: 12,
        ranged: { range: 560, speed: 380, damage: 14, interval: 1800 }, keepDistance: 300,
        loot: [["slime", 0.7, 1, 2]]
    },
    "bloater": {
        id: "bloater", name: "Раздутый", tier: 2, health: 70, speed: 48, speedJitter: 15,
        radius: 28, size: 88, damage: 0, attackInterval: 1000, aggro: 560,
        exp: 25, dropChance: 0.03, healChance: 0.05, zoneMin: 0.3, zoneMax: 1, weight: 9,
        explode: { radius: 115, damage: 42, trigger: 58 },
        loot: [["slime", 0.9, 2, 3]]
    },
    "screamer": {
        id: "screamer", name: "Крикун", tier: 2, health: 60, speed: 90, speedJitter: 20,
        radius: 22, size: 74, damage: 7, attackInterval: 900, aggro: 700,
        exp: 35, dropChance: 0.05, healChance: 0.05, zoneMin: 0.45, zoneMax: 1, weight: 6, urban: 1.5,
        keepDistance: 380, summon: { interval: 9000, count: 2, type: "zombie", cap: 6 },
        loot: [["cloth", 0.6, 1, 2], ["slime", 0.3, 1, 1]]
    },
    // Параметры паука взяты из оригинальной игры, урон снижен под открытый мир
    "spider": {
        id: "spider", name: "Паук", tier: 2, health: 100, speed: 200, speedJitter: 50,
        radius: 26, size: 84, damage: 18, attackInterval: 1000, aggro: 640,
        exp: 40, dropChance: 0.06, healChance: 0.05, zoneMin: 0.45, zoneMax: 1, weight: 10,
        loot: [["slime", 0.5, 1, 2], ["hide", 0.3, 1, 1]]
    },
    "stalker": {
        id: "stalker", name: "Призрак", tier: 3, health: 90, speed: 165, speedJitter: 20,
        radius: 22, size: 78, damage: 16, attackInterval: 700, aggro: 650,
        exp: 50, dropChance: 0.08, healChance: 0.05, zoneMin: 0.55, zoneMax: 1, weight: 7,
        stealth: 240,
        loot: [["hide", 0.6, 1, 2], ["bone", 0.5, 1, 2]]
    },
    "soldier": {
        id: "soldier", name: "Солдат", tier: 2, health: 140, speed: 70, speedJitter: 20,
        radius: 23, size: 76, damage: 12, attackInterval: 800, aggro: 720,
        exp: 45, dropChance: 0.12, healChance: 0.1, zoneMin: 0.5, zoneMax: 1, weight: 3, urban: 7,
        armor: 0.4, keepDistance: 330,
        ranged: { range: 620, speed: 950, damage: 9, interval: 750, kind: "shot" },
        loot: [["scrap", 0.9, 1, 3], ["powder", 0.8, 1, 3], ["cloth", 0.4, 1, 2], ["ammo_556", 0.6, 5, 12], ["ammo_9mm", 0.3, 4, 8], ["water", 0.2, 1, 1]]
    },
    "brute": {
        id: "brute", name: "Громила", tier: 3, health: 450, speed: 48, speedJitter: 15,
        radius: 40, size: 118, damage: 34, attackInterval: 1200, aggro: 620,
        exp: 110, dropChance: 0.25, healChance: 0.25, zoneMin: 0.65, zoneMax: 1, weight: 7,
        loot: [["hide", 0.8, 2, 3], ["bone", 0.8, 2, 4], ["meat", 0.8, 1, 2]]
    },
    "behemoth": {
        id: "behemoth", name: "Бегемот", tier: 3, health: 1100, speed: 50, speedJitter: 10,
        radius: 52, size: 172, damage: 40, attackInterval: 1100, aggro: 700,
        exp: 350, dropChance: 0.5, healChance: 0.5, zoneMin: 0.8, zoneMax: 1, weight: 3,
        charge: { interval: 5000, range: 520, speedMul: 4, duration: 700 },
        loot: [["hide", 1, 3, 5], ["bone", 1, 4, 6], ["slime", 0.5, 2, 3], ["meat", 1, 2, 3]]
    },
    "boss": {
        id: "boss", name: "Владыка", tier: 4, health: 4000, speed: 72, speedJitter: 0,
        radius: 62, size: 190, damage: 45, attackInterval: 900, aggro: 950,
        exp: 1200, dropChance: 1, healChance: 1, zoneMin: 2, zoneMax: 2, weight: 0,
        ranged: { range: 800, speed: 460, damage: 22, interval: 1100 },
        loot: [["hide", 1, 4, 6], ["bone", 1, 5, 8], ["slime", 1, 4, 6], ["powder", 1, 3, 5]]
    }
};
