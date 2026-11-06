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
    player.x = 2000;
    player.y = 1500;
    player.protectedUntil = Date.now() + 45000;
    player.exp = 1500;
    this.applyLevels(player);
    if (!this.__testChest) {
        this.__testChest = this.createChest(player.x + 110, player.y + 80);
    }
    Object.keys(WEAPONS).forEach((id, index) => {
        const angle = index / 10 * Math.PI * 2;
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
