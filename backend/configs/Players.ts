export const PLAYER_COLORS = [
    "red", "blue", "white", "#8F3A84", "#212121"
];

export const PLAYER_CONFIG = {
    radius: 13,
    defaultHealth: 100,
    baseSpeed: 165,
    maxStamina: 100,
    sprintMultiplier: 1.55,
    sprintDrainPerSecond: 23,
    staminaRegenPerSecond: 19,
    staminaRegenDelayMs: 550,
    aimSpeedMultiplier: 0.72,
    aimSpreadMultiplier: 0.45,
    dashCost: 30,
    dashDistance: 145,
    dashCooldownMs: 1500,
    inventorySize: 8,
    maxWeaponLevel: 5,
    pickupRadius: 55,
    /** Сколько лежит дроп оружия на полу, мс */
    pickupLifetimeMs: 25000,
    /** Неуязвимость после входа / респавна */
    spawnProtectionMs: 3200
};
