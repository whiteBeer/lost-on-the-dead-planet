// Запуск: npx tsc && node tests/world.test.js
const assert = require("node:assert");
const { World } = require("../dist/World.js");
const { PERKS, computeStats } = require("../dist/configs/Perks.js");
const { WEAPONS } = require("../dist/configs/Weapons.js");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const tick = (world, n = 1) => { for (let i = 0; i < n; i++) world.tick(); };

function arena() {
    const world = new World(1);
    world.obstacles.length = 0;
    world.obstacleGrid.clear();
    world.spawnEnemies = () => {};
    return world;
}

function place(player, x, y, rotation = 0) {
    player.x = x;
    player.y = y;
    player.rotation = rotation;
    player.protectedUntil = 0;
}

async function shootUntil(world, shooter, done, limitMs = 6000) {
    const start = Date.now();
    shooter.firing = true;
    while (!done() && Date.now() - start < limitMs) {
        world.tick();
        await sleep(15);
    }
    shooter.firing = false;
}

const tests = {
    "перков сотни, id и названия уникальны, описания есть": () => {
        assert.ok(PERKS.length >= 300, `перков ${PERKS.length}`);
        assert.strictEqual(new Set(PERKS.map(el => el.id)).size, PERKS.length);
        assert.strictEqual(new Set(PERKS.map(el => el.name)).size, PERKS.length);
        PERKS.forEach(el => assert.ok(el.description.length > 5 && Object.keys(el.mods).length > 0, el.id));
    },
    "любая характеристика перка существует и не даёт NaN": () => {
        const base = computeStats([]);
        PERKS.forEach((perk) => {
            Object.keys(perk.mods).forEach(key => assert.ok(key in base, `${perk.id}: ${key}`));
            Object.values(computeStats([perk.id])).forEach(val => assert.ok(Number.isFinite(val), perk.id));
        });
    },
    "игроков больше пяти: лимита цветов из оригинала нет": () => {
        const world = arena();
        for (let i = 0; i < 50; i++) {
            assert.ok(world.addPlayer(`s${i}`, `p${i}`));
        }
        assert.strictEqual(world.playerCount, 50);
    },
    "имя чистится и ограничивается": () => {
        const world = arena();
        assert.strictEqual(world.addPlayer("a", "   ").name.startsWith("Игрок"), true);
        assert.strictEqual(world.addPlayer("b", "x".repeat(99)).name.length, 16);
        assert.strictEqual(world.addPlayer("c", { evil: 1 }).name.startsWith("Игрок"), true);
    },
    "PvP: пули ранят, смерть даёт убийце опыт и обнуляет жертву": async () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        const b = world.addPlayer("b", "B");
        place(a, 500, 500, 0);
        place(b, 600, 500);
        b.exp = 500;
        world.applyLevels(b);
        const victimLevel = b.level;
        assert.ok(victimLevel > 1);
        await shootUntil(world, a, () => b.dead, 15000);
        assert.ok(b.dead, "жертва не умерла");
        assert.ok(a.exp >= 40 + 500 * 0.3 - 1, `опыт убийцы ${a.exp}`);
        b.deadAt = 0;
        world.respawn(b);
        assert.strictEqual(b.dead, false);
        assert.strictEqual(b.level, 1);
        assert.strictEqual(b.exp, 0);
        assert.strictEqual(b.weaponId, "Pistol");
    },
    "союзник не получает урона от пули": async () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        const b = world.addPlayer("b", "B");
        place(a, 500, 500, 0);
        place(b, 560, 500);
        assert.ok(world.invite(a, b.id));
        assert.ok(world.acceptInvite(b, a.id));
        assert.strictEqual(a.teamId, b.teamId);
        assert.notStrictEqual(a.teamId, 0);
        const hp = b.hp;
        const start = Date.now();
        a.firing = true;
        while (Date.now() - start < 700) { world.tick(); await sleep(15); }
        assert.strictEqual(b.hp, hp);
    },
    "приглашение нельзя принять без реального приглашения": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        const b = world.addPlayer("b", "B");
        assert.strictEqual(world.acceptInvite(b, a.id), false);
        assert.strictEqual(b.teamId, 0);
    },
    "выход из команды распускает пару": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        const b = world.addPlayer("b", "B");
        world.invite(a, b.id);
        world.acceptInvite(b, a.id);
        world.leaveTeam(b);
        assert.strictEqual(a.teamId, 0);
        assert.strictEqual(b.teamId, 0);
    },
    "защита после появления спасает, выстрел снимает её": async () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        const b = world.addPlayer("b", "B");
        place(a, 500, 500, 0);
        place(b, 560, 500);
        b.protectedUntil = Date.now() + 60000;
        const hp = b.hp;
        const start = Date.now();
        a.firing = true;
        while (Date.now() - start < 500) { world.tick(); await sleep(15); }
        assert.strictEqual(b.hp, hp);
        assert.strictEqual(a.protectedUntil, 0);
    },
    "монстр даёт опыт, уровень приносит предложение перков, выбор применяется": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        place(a, 500, 500);
        for (let i = 0; i < 6; i++) {
            const enemy = world.createEnemy("zombie", 900, 900);
            world.damageEnemy(enemy, 9999, a, "Pistol");
        }
        assert.ok(a.exp >= 60);
        assert.ok(a.level >= 2);
        assert.ok(a.offers.length >= 1);
        assert.strictEqual(a.offers[0].length, 3);
        const perk = a.offers[0][1];
        world.pickPerk(a, 1);
        assert.ok(a.perks.has(perk.id));
        world.pickPerk(a, 99);
        world.pickPerk(a, "1");
    },
    "гарантированный дроп оружия с босса подбирается и заменяет оружие": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        place(a, 500, 500);
        const boss = world.createEnemy("boss", 520, 500);
        world.damageEnemy(boss, 999999, a, "Pistol");
        const weapons = [...world.pickups.values()].filter(el => el.kind === "weapon");
        assert.strictEqual(weapons.length, 1);
        assert.ok(["epic", "legendary"].includes(WEAPONS[weapons[0].weaponId].rarity));
        world.takePickup(a);
        assert.strictEqual(a.weaponId, weapons[0].weaponId);
        assert.strictEqual(a.ammo, WEAPONS[a.weaponId].clipSize);
    },
    "сервер не даёт телепортироваться и не верит NaN": async () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        place(a, 500, 500);
        await sleep(100);
        world.handleInput(a, { x: 3900, y: 3900, r: 0, f: false });
        assert.ok(Math.hypot(a.x - 500, a.y - 500) < 80, `сдвиг ${a.x},${a.y}`);
        const before = a.x;
        world.handleInput(a, { x: NaN, y: Infinity, r: NaN, f: "да" });
        world.handleInput(a, null);
        assert.strictEqual(a.x, before);
        assert.strictEqual(a.firing, false);
    },
    "снимок содержит только то, что рядом": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        const near = world.addPlayer("b", "Рядом");
        const far = world.addPlayer("c", "Далеко");
        place(a, 500, 500);
        place(near, 700, 500);
        place(far, 3500, 3500);
        world.createEnemy("zombie", 600, 600);
        world.createEnemy("zombie", 3500, 3400);
        tick(world);
        const snapshot = world.buildSnapshot(a);
        assert.deepStrictEqual(snapshot.p.map(el => el[0]), [near.id]);
        assert.strictEqual(snapshot.e.length, 1);
    },
    "рейтинг отсортирован по опыту и показывает оружие": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        const b = world.addPlayer("b", "B");
        a.exp = 10;
        b.exp = 30;
        b.weaponId = "Rifle";
        const rows = world.buildRoster().rows;
        assert.deepStrictEqual(rows.map(el => el.name), ["B", "A"]);
        assert.strictEqual(rows[0].weapon, "Rifle");
    },
    "стресс: все перки сразу и 200 тиков без исключений": () => {
        const world = new World(2);
        const a = world.addPlayer("a", "A");
        const b = world.addPlayer("b", "B");
        PERKS.slice(0, 80).forEach(el => a.perks.add(el.id));
        a.stats = computeStats(a.perks);
        a.firing = true;
        for (let i = 0; i < 200; i++) {
            world.tick();
            world.buildSnapshot(a);
            world.buildSnapshot(b);
        }
        assert.ok(world.enemyCount > 0);
    }
};

(async () => {
    let failed = 0;
    for (const [name, fn] of Object.entries(tests)) {
        try {
            await fn();
            console.log("ok  ", name);
        } catch (error) {
            failed++;
            console.log("FAIL", name, "\n    ", error.message);
        }
    }
    console.log(failed ? `Провалено: ${failed}` : "Все тесты прошли");
    process.exit(failed ? 1 : 0);
})();
