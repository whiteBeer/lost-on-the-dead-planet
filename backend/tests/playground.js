// Локальная площадка для проверки интерфейса: node tests/playground.js
// Боевой код не меняется: новому игроку сразу даётся опыт, рядом кладётся всё оружие и все монстры.
const { World } = require("../dist/World.js");
const { WEAPONS } = require("../dist/configs/Weapons.js");
const { ENEMIES } = require("../dist/configs/Enemies.js");

const addPlayer = World.prototype.addPlayer;
World.prototype.addPlayer = function (socketId, name) {
    const player = addPlayer.call(this, socketId, name);
    if (!player || String(name).startsWith("bot")) {
        return player;
    }
    // Посреди деревни или города (PLAYGROUND_PLACE=town|city), чтобы сразу видеть дома, дороги и ящики
    const kind = process.env.PLAYGROUND_PLACE || "village";
    const place = this.map.settlements.find(el => el.kind === kind) || this.map.settlements[0];
    const spot = this.freeSpotNear(place.x, place.y, 40) || { x: place.x, y: place.y };
    player.x = spot.x;
    player.y = spot.y;
    if (process.env.PLAYGROUND_CAMP) {
        // Рядом с торговцем первого лагеря
        const camp = this.map.camps[0];
        player.x = camp.x + 40;
        player.y = camp.y;
    }
    if (process.env.PLAYGROUND_INDOOR) {
        // Сразу в доме деревни, чтобы проверить пол, стены, полки и прозрачную крышу
        const home = this.obstacles.find(el => el.kind === "interior" && el.settlement === this.map.settlements.indexOf(place));
        if (home) {
            player.x = home.x;
            player.y = home.y;
        }
    }
    // Ресурсы, чтобы проверить крафт
    for (const [id, n] of [["wood", 25], ["stone", 12], ["cloth", 8], ["slime", 8], ["scrap", 14], ["powder", 9], ["hide", 6], ["bone", 10], ["ammo_9mm", 60], ["ammo_556", 90], ["ammo_12g", 20], ["canned", 2], ["water", 2]]) {
        this.addItem(player, id, n);
    }
    player.protectedUntil = Date.now() + 45000;
    player.exp = 1500;
    this.applyLevels(player);
    if (!this.__testChest) {
        this.__testChest = this.createChest(player.x + 110, player.y + 80);
    }
    Object.keys(WEAPONS).slice(5, 11).forEach((id, index) => {
        const angle = index / 6 * Math.PI * 2;
        this.dropWeapon(id, player.x + Math.cos(angle) * 170, player.y + Math.sin(angle) * 170);
    });
    if (process.env.PLAYGROUND_CALM) {
        this.spawnEnemies = () => {};
        return player;
    }
    Object.keys(ENEMIES).forEach((type, index) => {
        const angle = index / 7 * Math.PI * 2;
        this.createEnemy(type, player.x + Math.cos(angle) * 380, player.y + Math.sin(angle) * 300);
    });
    return player;
};
require("../dist/app.js");
