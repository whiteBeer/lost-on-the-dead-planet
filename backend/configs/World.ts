export const WORLD = {
    // 14000² / 9000² = 2.4: место под деревни, города и мегаполис
    size: 14000,
    spawnZoneMax: 0.14,      // игрок появляется только глубоко в безопасной зоне
    tickRate: 30,
    snapshotEvery: 2,        // Снимок каждые 2 тика: 15 раз в секунду
    viewHalfWidth: 950,      // Зона видимости, чуть шире экрана клиента
    viewHalfHeight: 650,
    playerRadius: 13,
    playerSpeed: 170,
    maxPlayers: 200,
    maxEnemies: 520,
    // Сколько монстров держать в радиусе enemyAreaRadius вокруг игрока, по зонам: безопасная → мёртвая
    enemiesAround: [3, 11, 19, 27],
    enemyAreaRadius: 1700,
    spawnProtectionMs: 4000,
    respawnDelayMs: 2500,
    pickupRadius: 42,
    // С запасом к подсказке на клиенте (60): сервер немного отстаёт от бегущего игрока
    weaponReach: 80,
    pickupLifetimeMs: 75000,
    chestRewardLifetimeMs: 180000,  // сколько лежит приземлившийся аирдроп и выпавшее из него
    chestFallMs: 45000,             // спуск аирдропа на парашюте
    chestReach: 90,
    hungerPerSec: 100 / 1500,       // сытость 100 → 0 за 25 минут
    thirstPerSec: 100 / 960,        // вода 100 → 0 за 16 минут
    starveDamage: 1.5,              // урон в секунду, когда сытость или вода на нуле
    levelDamage: 0.04,              // +4% урона за каждый уровень после первого
    levelHp: 3,                     // +3 здоровья за уровень
    levelArmor: 0.01,               // +1% защиты за уровень, не больше levelArmorMax
    levelArmorMax: 0.25,
    shelfRespawnMs: 420000,
    shelfReach: 70,
    traderReach: 130,
    slotSwitchMs: 250,              // задержка выстрела после смены инструмента на оружие
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
    toxicDamage: 4,          // урон в секунду в ядовитом воздухе без противогаза
    resourceRespawnMs: 480000,
    wreckRespawnMs: 900000,
    crateRespawnMs: 300000,
    bagLifetimeMs: 240000,
    maxLevel: 99
};

// Опыт, который нужен для перехода с уровня level на следующий
export function expForLevel(level:number):number {
    return Math.round(40 * Math.pow(level, 1.45));
}
