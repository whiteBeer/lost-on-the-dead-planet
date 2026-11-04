export interface EnemyConfig {
    id:string;
    name:string;
    tier:number;        // Уровень опасности: влияет на дроп
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
    ranged?:{ range:number, speed:number, damage:number, interval:number };
    minDepth:number;    // 0 — край карты, 1 — центр. Ближе к центру опаснее
    weight:number;      // Частота появления
}

export const ENEMIES:Record<string, EnemyConfig> = {
    "zombie": {
        id: "zombie", name: "Зомби", tier: 1, health: 50, speed: 35, speedJitter: 40,
        radius: 24, size: 75, damage: 12, attackInterval: 800, aggro: 520,
        exp: 10, dropChance: 0.05, healChance: 0.06, minDepth: 0, weight: 60
    },
    "runner": {
        id: "runner", name: "Бегун", tier: 1, health: 35, speed: 125, speedJitter: 40,
        radius: 20, size: 64, damage: 8, attackInterval: 600, aggro: 620,
        exp: 15, dropChance: 0.06, healChance: 0.05, minDepth: 0.1, weight: 22
    },
    "hound": {
        id: "hound", name: "Гончая", tier: 2, health: 60, speed: 185, speedJitter: 30,
        radius: 20, size: 66, damage: 11, attackInterval: 650, aggro: 720,
        exp: 25, dropChance: 0.09, healChance: 0.05, minDepth: 0.3, weight: 14
    },
    "spitter": {
        id: "spitter", name: "Плевальщик", tier: 2, health: 80, speed: 55, speedJitter: 20,
        radius: 24, size: 76, damage: 10, attackInterval: 900, aggro: 760,
        exp: 30, dropChance: 0.11, healChance: 0.08, minDepth: 0.35, weight: 12,
        ranged: { range: 560, speed: 380, damage: 14, interval: 1800 }
    },
    // Параметры паука взяты из оригинальной игры, урон снижен под открытый мир
    "spider": {
        id: "spider", name: "Паук", tier: 2, health: 100, speed: 200, speedJitter: 50,
        radius: 26, size: 84, damage: 18, attackInterval: 1000, aggro: 640,
        exp: 40, dropChance: 0.14, healChance: 0.06, minDepth: 0.45, weight: 10
    },
    "brute": {
        id: "brute", name: "Громила", tier: 3, health: 450, speed: 48, speedJitter: 15,
        radius: 40, size: 118, damage: 34, attackInterval: 1200, aggro: 620,
        exp: 110, dropChance: 0.4, healChance: 0.3, minDepth: 0.6, weight: 7
    },
    "boss": {
        id: "boss", name: "Владыка", tier: 4, health: 4000, speed: 72, speedJitter: 0,
        radius: 62, size: 190, damage: 45, attackInterval: 900, aggro: 950,
        exp: 1200, dropChance: 1, healChance: 1, minDepth: 2, weight: 0,
        ranged: { range: 800, speed: 460, damage: 22, interval: 1100 }
    }
};
