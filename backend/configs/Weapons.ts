export interface WeaponConfig {
    id: string;
    damage: number;
    speedInSecond: number;
    range: number;
    fireRate: number, // задержка в миллисекундах

    // Параметры разброса (в радианах)
    spreadBase: number;      // Начальный разброс (обычно 0)
    spreadMax: number;       // Максимальный разброс (когда зажал гашетку)
    spreadIncrement: number; // На сколько увеличивается разброс за 1 выстрел
    spreadRecovery: number;  // Сколько разброса уходит в секунду, когда не стреляешь

    clipSize: number;   // Сколько патронов в магазине
    reloadTime: number; // Время перезарядки в секундах
}

export const WEAPONS: Record<string, WeaponConfig> = {
    "Rifle": {
        id: "Rifle",
        damage: 25,
        speedInSecond: 1200,
        range: 1000,
        fireRate: 100,

        spreadBase: 0,
        spreadMax: 0.35,         // ~20 градусов максимальный разброс
        spreadIncrement: 0.07,   // За 5 выстрелов подряд достигнет максимума
        spreadRecovery: 0.35,    // Быстро восстанавливается, если отпустить

        clipSize: 30,
        reloadTime: 1.3
    }
};