export interface EnemyConfig {
    id:string;
    health:number;
    speed:number;       // Скорость движения (пикс/сек)

    // Параметры для коллизий
    width:number;       // Ширина хитбокса (запад - восток)
    height:number;      // Высота хитбокса (север - юг)

    // Параметры атаки
    damage:number;      // Урон за удар
    attackInterval:number; // Ударов в секунду
}

export const ENEMIES:Record<string, EnemyConfig> = {
    "Zombie": {
        id: "Zombie",
        health: 50,
        speed: 15,
        width: 200,
        height: 130,
        damage: 30,
        attackInterval: 500
    },
    "Spider": {
        id: "Spider",
        health: 100,
        speed: 200,      // Очень быстрый
        width: 80,
        height: 50,
        damage: 50,
        attackInterval: 1000
    }
};