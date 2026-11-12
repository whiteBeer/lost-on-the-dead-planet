export const PLAYER_COLORS = [
    "red", "blue", "white", "#8F3A84", "#212121"
];

export const PLAYER_CONFIG = {
    radius: 13,
    defaultHealth: 100,
    baseSpeed: 165,
    pickupRadius: 55,
    /** Сколько лежит дроп оружия на полу, мс */
    pickupLifetimeMs: 12000,
    /** Неуязвимость после входа / респавна */
    spawnProtectionMs: 3200,
    /** Огонь по своим: сколько стоит на месте игрок, в которого попал союзник */
    friendlyFireStunMs: 8000
};
