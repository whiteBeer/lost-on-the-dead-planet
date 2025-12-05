export interface EnemyConfig {
    id:string;
    health:number;
    speed:number;       // Скорость движения (пикс/сек)

    // Параметры для коллизий
    width:number;       // Для прямоугольника (пули)
    length:number;      // Для прямоугольника (пули)

    // Параметры атаки
    damage:number;      // Урон за удар
    attackInterval:number; // Ударов в секунду
}

export const ENEMIES:Record<string, EnemyConfig> = {
    "Zombie": {
        id: "Zombie",
        health: 50,
        speed: 50,
        width: 50,
        length: 50,
        damage: 30,
        attackInterval: 500
    },
    "Spider": {
        id: "Spider",
        health: 100,
        speed: 300,      // Очень быстрый
        width: 80,
        length: 50,
        damage: 50,
        attackInterval: 1000
    }
};