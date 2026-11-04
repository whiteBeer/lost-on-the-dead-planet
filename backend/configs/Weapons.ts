export type WeaponRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface WeaponConfig {
    id:string;
    name:string;
    rarity:WeaponRarity;
    damage:number;
    speedInSecond:number;
    range:number;
    fireRate:number; // задержка в миллисекундах

    // Параметры разброса (в радианах)
    spreadBase:number;      // Начальный разброс (обычно 0)
    spreadMax:number;       // Максимальный разброс (когда зажал гашетку)
    spreadIncrement:number; // На сколько увеличивается разброс за 1 выстрел
    spreadRecovery:number;  // Сколько разброса уходит в секунду, когда не стреляешь

    clipSize:number;   // Сколько патронов в магазине
    reloadTime:number; // Время перезарядки в секундах

    pellets?:number;   // Пуль за выстрел
    pelletCone?:number; // Постоянный конус дроби
    pierce?:number;    // Сквозь сколько целей проходит
    explosion?:number; // Радиус взрыва
    bulletSize?:number;
}

export const STARTING_WEAPON = "Pistol";

export const WEAPONS:Record<string, WeaponConfig> = {
    "Pistol": {
        id: "Pistol", name: "Пистолет", rarity: "common",
        damage: 18, speedInSecond: 1000, range: 650, fireRate: 260,
        spreadBase: 0, spreadMax: 0.12, spreadIncrement: 0.04, spreadRecovery: 0.4,
        clipSize: 12, reloadTime: 1.0
    },
    "SMG": {
        id: "SMG", name: "Пистолет-пулемёт", rarity: "uncommon",
        damage: 11, speedInSecond: 1050, range: 600, fireRate: 75,
        spreadBase: 0.02, spreadMax: 0.3, spreadIncrement: 0.05, spreadRecovery: 0.4,
        clipSize: 35, reloadTime: 1.4
    },
    // Параметры автомата — из оригинальной игры
    "Rifle": {
        id: "Rifle", name: "Автомат", rarity: "uncommon",
        damage: 25, speedInSecond: 1200, range: 1000, fireRate: 100,
        spreadBase: 0, spreadMax: 0.35, spreadIncrement: 0.07, spreadRecovery: 0.35,
        clipSize: 30, reloadTime: 1.3
    },
    "Shotgun": {
        id: "Shotgun", name: "Дробовик", rarity: "rare",
        damage: 13, speedInSecond: 950, range: 420, fireRate: 750,
        spreadBase: 0, spreadMax: 0.05, spreadIncrement: 0.05, spreadRecovery: 0.3,
        clipSize: 6, reloadTime: 2.0, pellets: 8, pelletCone: 0.32
    },
    "Crossbow": {
        id: "Crossbow", name: "Арбалет", rarity: "rare",
        damage: 60, speedInSecond: 850, range: 900, fireRate: 800,
        spreadBase: 0, spreadMax: 0.02, spreadIncrement: 0.01, spreadRecovery: 0.3,
        clipSize: 5, reloadTime: 1.8, pierce: 3, bulletSize: 4
    },
    "Sniper": {
        id: "Sniper", name: "Снайперская винтовка", rarity: "epic",
        damage: 120, speedInSecond: 2200, range: 1500, fireRate: 1300,
        spreadBase: 0, spreadMax: 0.03, spreadIncrement: 0.03, spreadRecovery: 0.2,
        clipSize: 5, reloadTime: 2.4, pierce: 1, bulletSize: 3
    },
    "Flamethrower": {
        id: "Flamethrower", name: "Огнемёт", rarity: "epic",
        damage: 7, speedInSecond: 480, range: 300, fireRate: 45,
        spreadBase: 0.14, spreadMax: 0.26, spreadIncrement: 0.02, spreadRecovery: 0.5,
        clipSize: 90, reloadTime: 2.6, pierce: 2, bulletSize: 8
    },
    "Minigun": {
        id: "Minigun", name: "Миниган", rarity: "epic",
        damage: 14, speedInSecond: 1300, range: 850, fireRate: 45,
        spreadBase: 0.05, spreadMax: 0.28, spreadIncrement: 0.02, spreadRecovery: 0.3,
        clipSize: 150, reloadTime: 3.6
    },
    "Rocket": {
        id: "Rocket", name: "Ракетомёт", rarity: "legendary",
        damage: 120, speedInSecond: 650, range: 1100, fireRate: 1200,
        spreadBase: 0, spreadMax: 0.04, spreadIncrement: 0.02, spreadRecovery: 0.3,
        clipSize: 4, reloadTime: 2.8, explosion: 130, bulletSize: 6
    },
    "Railgun": {
        id: "Railgun", name: "Рельсотрон", rarity: "legendary",
        damage: 200, speedInSecond: 3200, range: 1800, fireRate: 1700,
        spreadBase: 0, spreadMax: 0.01, spreadIncrement: 0.01, spreadRecovery: 0.3,
        clipSize: 3, reloadTime: 3.0, pierce: 12, bulletSize: 3
    }
};

// Какие редкости падают с монстра какого уровня опасности: tier -> [редкость, вес]
export const DROP_TABLE:Record<number, [WeaponRarity, number][]> = {
    1: [["uncommon", 85], ["rare", 15]],
    2: [["uncommon", 50], ["rare", 40], ["epic", 10]],
    3: [["rare", 45], ["epic", 45], ["legendary", 10]],
    4: [["epic", 50], ["legendary", 50]]
};

export function rollWeapon(tier:number):string {
    const table = DROP_TABLE[tier] || DROP_TABLE[1];
    const total = table.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    let rarity:WeaponRarity = table[0][0];
    for (const [candidate, weight] of table) {
        roll -= weight;
        if (roll <= 0) {
            rarity = candidate;
            break;
        }
    }
    const pool = Object.values(WEAPONS).filter(el => el.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)].id;
}
