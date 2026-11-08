"use strict";

process.env.ARENA_TIME_SCALE = "0.002";

const assert = require("node:assert/strict");
const { Scene } = require("../dist/components/Scene");

async function run() {
    const scene = new Scene("automated-playthrough");
    const player = scene.playersCollection.addPlayer("bot");
    assert(player, "player must join the lobby");

    assert.equal(player.addWeapon("SMG"), true);
    assert.equal(player.addWeapon("SMG"), true);
    assert.equal(player.mergeInventoryItems(1, 2), true);
    assert.equal(player.inventory[1], null);
    assert.equal(player.inventory[2].level, 2);
    assert.equal(player.equipInventorySlot(2), true);
    assert.equal(player.weapon.id, "SMG");
    assert.equal(player.weapon.level, 2);
    assert.equal(player.addWeapon("Rifle"), true);
    const rifleSlot = player.inventory.findIndex(item => item && item.id === "Rifle");
    assert.equal(player.dropInventoryItem(rifleSlot), true);
    assert(scene.pickupsCollection.getPickupsJSON().some(item => item.weaponId === "Rifle"));

    const staminaBeforeSprint = player.stamina;
    player.setMovementState(true, false);
    player.tick(0.5);
    assert(player.stamina < staminaBeforeSprint, "sprint must consume stamina");
    player.setMovementState(false, false);
    player.stamina = player.maxStamina;
    const xBeforeDash = player.pageX;
    assert.equal(player.tryDash(0), true);
    assert(player.pageX > xBeforeDash, "dash must move the player");
    assert(player.stamina < player.maxStamina, "dash must consume stamina");

    const announced = new Set();
    let won = null;
    scene.on("waveStarted", ({ wave }) => announced.add(wave));
    scene.on("perkOffer", ({ perks }) => {
        if (perks && perks[0]) player.pickPerk(perks[0].id);
    });
    scene.on("gameWon", (data) => { won = data; });

    assert.equal(scene.startGameByHost("bot"), true);

    const killer = setInterval(() => {
        const enemies = [...scene.enemiesCollection.getEnemies()];
        for (const enemy of enemies) {
            scene.enemiesCollection.damageEnemyById(
                enemy.id,
                enemy.health + 1,
                player.socketId
            );
        }
    }, 1);

    const deadline = Date.now() + 30_000;
    while (!won && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 5));
    }
    clearInterval(killer);

    assert(won, "the match must emit gameWon");
    assert.equal(won.wave, 10);
    assert.equal(scene.getPhase(), "won");
    for (let wave = 1; wave <= 10; wave++) {
        assert(announced.has(wave), `wave ${wave} must start`);
    }
    assert(player.level > 1, "a full run must grant levels");
    assert(player.bestCombo >= 5, "fast kills must build a rewarded combo");
    assert(player.inventory.some(item => item && item.level >= 2), "upgraded gun must survive the run");

    scene.destroy();
    console.log(JSON.stringify({
        ok: true,
        waves: [...announced].sort((a, b) => a - b),
        level: player.level,
        exp: player.exp,
        weapon: player.weapon.toJSON()
    }));
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
