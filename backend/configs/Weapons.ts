export interface WeaponConfig {
    id:string;
    name:string;
    damage:number;
    speedInSecond:number;
    range:number;
    fireRate:number; // задержка в миллисекундах

    spreadBase:number;
    spreadMax:number;
    spreadIncrement:number;
    spreadRecovery:number;

    clipSize:number;
    reloadTime:number;

    pellets?:number;
    pelletCone?:number;
    pierce?:number;
    bulletSize?:number;
}

export const STARTING_WEAPON = "Pistol";

export const WEAPONS:Record<string, WeaponConfig> = {
    "Pistol": {
        id: "Pistol",
        name: "Пистолет",
        damage: 22,
        speedInSecond: 1050,
        range: 700,
        fireRate: 250,
        spreadBase: 0.008,
        spreadMax: 0.14,
        // При зажатии LKM разброс растёт (net +/выстрел), отпускаешь — схлопывается ~1.3с
        spreadIncrement: 0.038,
        spreadRecovery: 0.1,
        clipSize: 12,
        reloadTime: 1.0
    },
    "SMG": {
        id: "SMG",
        name: "Пистолет-пулемёт",
        damage: 11,
        speedInSecond: 1050,
        range: 600,
        fireRate: 75,
        spreadBase: 0.02,
        spreadMax: 0.3,
        spreadIncrement: 0.05,
        spreadRecovery: 0.4,
        clipSize: 35,
        reloadTime: 1.4
    },
    "Rifle": {
        id: "Rifle",
        name: "Автомат",
        damage: 25,
        speedInSecond: 1200,
        range: 1000,
        fireRate: 100,
        spreadBase: 0,
        spreadMax: 0.35,
        spreadIncrement: 0.07,
        spreadRecovery: 0.35,
        clipSize: 30,
        reloadTime: 1.3
    },
    "Shotgun": {
        id: "Shotgun",
        name: "Дробовик",
        damage: 13,
        speedInSecond: 950,
        range: 420,
        fireRate: 750,
        spreadBase: 0,
        spreadMax: 0.05,
        spreadIncrement: 0.05,
        spreadRecovery: 0.3,
        clipSize: 6,
        reloadTime: 2.0,
        pellets: 8,
        pelletCone: 0.32
    },
    "Sniper": {
        id: "Sniper",
        name: "Снайперская винтовка",
        damage: 120,
        speedInSecond: 2200,
        range: 1500,
        fireRate: 1300,
        spreadBase: 0,
        spreadMax: 0.03,
        spreadIncrement: 0.03,
        spreadRecovery: 0.2,
        clipSize: 5,
        reloadTime: 2.4,
        pierce: 1,
        bulletSize: 3
    }
};

/** Веса дропа по «тиру» волны: 0 ранние, 1 середина, 2 поздние */
const DROP_WEIGHTS:Record<number, [string, number][]> = {
    0: [["Pistol", 45], ["SMG", 35], ["Rifle", 15], ["Shotgun", 5]],
    1: [["Pistol", 15], ["SMG", 30], ["Rifle", 30], ["Shotgun", 20], ["Sniper", 5]],
    2: [["SMG", 15], ["Rifle", 30], ["Shotgun", 30], ["Sniper", 25]]
};

export function rollWeaponDrop(wave:number):string {
    const tier = wave <= 2 ? 0 : wave <= 5 ? 1 : 2;
    const table = DROP_WEIGHTS[tier];
    const total = table.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [id, weight] of table) {
        roll -= weight;
        if (roll <= 0) {
            return id;
        }
    }
    return table[0][0];
}
