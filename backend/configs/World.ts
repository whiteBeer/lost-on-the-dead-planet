export const WORLD = {
    // 9000² / 4000² = 5.06: площадь мира увеличена примерно в пять раз
    size: 9000,
    tickRate: 30,
    snapshotEvery: 2,        // Снимок каждые 2 тика: 15 раз в секунду
    viewHalfWidth: 950,      // Зона видимости, чуть шире экрана клиента
    viewHalfHeight: 650,
    playerRadius: 13,
    playerSpeed: 170,
    maxPlayers: 200,
    maxEnemies: 280,
    baseEnemies: 110,
    enemiesPerPlayer: 22,
    spawnProtectionMs: 4000,
    respawnDelayMs: 2500,
    pickupRadius: 42,
    // С запасом к подсказке на клиенте (60): сервер немного отстаёт от бегущего игрока
    weaponReach: 80,
    pickupLifetimeMs: 75000,
    chestRewardLifetimeMs: 180000,
    chestCountdownMs: 60000,
    chestFirstDelayMs: 35000,
    chestMinIntervalMs: 150000,
    chestMaxIntervalMs: 270000,
    maxChests: 3,
    medkitHeal: 35,
    pvpDamageMul: 0.5,       // Без этого автомат убивает игрока за 0,4 секунды
    killBaseExp: 40,
    killExpShare: 0.3,       // Доля опыта жертвы, которую забирает убийца
    teamMaxSize: 6,
    teamExpShare: 0.25,
    teamExpRadius: 1100,
    bossEveryMs: 240000,
    explosionDamage: 90,
    maxLevel: 99
};

// Опыт, который нужен для перехода с уровня level на следующий
export function expForLevel(level:number):number {
    return Math.round(40 * Math.pow(level, 1.45));
}
