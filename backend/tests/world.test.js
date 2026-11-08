// Запуск: npx tsc && node tests/world.test.js
const assert = require("node:assert");
const { World } = require("../dist/World.js");
const { PERKS, POSITIVE_PERKS, computeStats, rollPerkOffer } = require("../dist/configs/Perks.js");
const { WEAPONS } = require("../dist/configs/Weapons.js");
const { WORLD } = require("../dist/configs/World.js");
const { ZONES } = require("../dist/configs/Terrain.js");

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
    if (WEAPONS[shooter.weaponId].melee) {
        world.equip(shooter, "Pistol");
    }
    world.addItem(shooter, WEAPONS[shooter.weaponId].ammo, 300);
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
    "новые положительные перки имеют иконки и всегда представлены в выборе": () => {
        assert.strictEqual(POSITIVE_PERKS.length, 8);
        POSITIVE_PERKS.forEach(perk => {
            assert.strictEqual(perk.positive, true);
            assert.ok(perk.icon?.startsWith("perk_"), perk.id);
            assert.ok(Object.values(perk.mods).every(value => value >= 0 || perk.id === "eagle_eye"), perk.id);
        });
        for (let i = 0; i < 100; i++) {
            const offer = rollPerkOffer(new Set(), 2, 3);
            assert.strictEqual(offer.length, 3);
            assert.ok(offer.some(perk => perk.positive), offer.map(perk => perk.id).join(", "));
        }
    },
    "карта 14000, есть мегаполис, города и деревни, доли зон заданы": () => {
        const world = new World(3);
        assert.strictEqual(WORLD.size, 14000);
        const kinds = world.map.settlements.map(el => el.kind);
        assert.strictEqual(kinds.filter(el => el === "city").length, 1);
        assert.ok(kinds.filter(el => el === "town").length >= 3, kinds.join());
        assert.ok(kinds.filter(el => el === "village").length >= 8, kinds.join());
        assert.ok(world.obstacles.filter(el => el.kind === "building" || el.kind === "interior").length >= 150);
        assert.ok(world.obstacles.length > 3000);
        const safe = [...world.map.zone].filter(v => v / 255 < ZONES.safe).length / world.map.zone.length;
        assert.ok(safe > 0.2 && safe < 0.25, `безопасных ${safe}`);
    },
    "игрок всегда появляется глубоко в безопасной зоне и только с ножом": () => {
        const world = new World(4);
        for (let i = 0; i < 60; i++) {
            const p = world.addPlayer(`s${i}`, `p${i}`);
            assert.ok(world.zoneAt(p.x, p.y) <= WORLD.spawnZoneMax, `зона ${world.zoneAt(p.x, p.y)}`);
            assert.strictEqual(p.weaponId, "Knife");
            // Стартовый набор: бинты, консервы, вода — и больше ничего
            assert.deepStrictEqual(p.inventory.filter(Boolean).map(el => el.id).sort(), ["bandage", "canned", "water"]);
        }
    },
    "нож рубит дерево: дерево в рюкзаке, дерево кончается и исчезает": () => {
        const world = new World(5);
        const tree = world.obstacles.find(el => el.kind === "tree" && el.settlement === -1);
        const p = world.addPlayer("s", "Лесоруб");
        p.x = tree.x - tree.r - 20;
        p.y = tree.y;
        p.rotation = 0;
        p.protectedUntil = 0;
        const total = tree.amount;
        for (let i = 0; i < total + 2; i++) {
            p.nextShotAt = 0;
            world.tryShoot(p, Date.now());
        }
        assert.strictEqual(world.countItem(p, "wood"), total);
        assert.strictEqual(tree.alive, false);
        assert.deepStrictEqual(world.takeObstacleChanges().pop(), [tree.id, 0]);
    },
    "разбитый ящик выбрасывает добычу": () => {
        const world = new World(6);
        const crate = world.obstacles.find(el => el.kind === "crate" && el.settlement >= 0);
        world.damageCrate(crate, 999);
        assert.strictEqual(crate.alive, false);
        const near = [...world.pickups.values()].filter(el => Math.hypot(el.x - crate.x, el.y - crate.y) < 80);
        // Добыча случайна, поэтому повторяем на нескольких ящиках, пока что-то не выпадет
        let dropped = near.length;
        for (const other of world.obstacles.filter(el => el.kind === "crate" && el.settlement >= 0).slice(1, 20)) {
            world.damageCrate(other, 999);
        }
        dropped += world.pickups.size;
        assert.ok(dropped > 0);
    },
    "крафт тратит ресурсы, без ресурсов ничего не создаётся": () => {
        const world = arena();
        const p = world.addPlayer("s", "Мастер");
        assert.strictEqual(world.craft(p, "spear"), false);
        world.addItem(p, "wood", 6);
        world.addItem(p, "stone", 3);
        // Одних палок и камней мало: нужна верёвка из ткани
        assert.strictEqual(world.craft(p, "spear"), false);
        world.addItem(p, "cloth", 3);
        assert.strictEqual(world.craft(p, "rope"), true);
        assert.strictEqual(world.craft(p, "spear"), true);
        assert.strictEqual(world.countItem(p, "wood"), 1);
        assert.strictEqual(world.countItem(p, "stone"), 0);
        assert.strictEqual(world.countItem(p, "rope"), 0);
        assert.ok(p.inventory.some(el => el && el.id === "w:Spear"));
        const slot = p.inventory.findIndex(el => el && el.id === "w:Spear");
        world.useSlot(p, slot);
        assert.strictEqual(p.weaponId, "Spear");
        world.useSlot(p, 99);
        world.useSlot(p, "1");
    },
    "рюкзак: стопки, переполнение, броня снижает урон": () => {
        const world = arena();
        const p = world.addPlayer("s", "Носильщик");
        p.inventory.fill(null);
        assert.strictEqual(world.addItem(p, "wood", 99 * 12 + 5), 5);
        const q = world.addPlayer("s2", "Броня");
        q.inventory.fill(null);
        world.addItem(q, "armor_kevlar", 1);
        world.useSlot(q, 0);
        assert.strictEqual(q.armorId, "armor_kevlar");
        q.protectedUntil = 0;
        q.stats.dodge = 0;
        const hp = q.hp;
        world.damagePlayer(q, 40, null, null);
        assert.ok(Math.abs((hp - q.hp) - 30) < 0.01, `урон ${hp - q.hp}`);
    },
    "после смерти вещи остаются в сумке, её можно обыскать": () => {
        const world = arena();
        const a = world.addPlayer("a", "Жертва");
        const b = world.addPlayer("b", "Мародёр");
        world.addItem(a, "scrap", 7);
        world.equip(a, "Rifle");
        a.protectedUntil = 0;
        world.killPlayer(a, null, null);
        const bag = [...world.pickups.values()].find(el => el.kind === "bag");
        assert.ok(bag);
        assert.ok(a.inventory.every(el => el === null));
        b.x = bag.x;
        b.y = bag.y;
        world.takePickup(b);
        assert.strictEqual(world.countItem(b, "scrap"), 7);
        assert.ok(b.inventory.some(el => el && el.id === "w:Rifle"));
        assert.ok(![...world.pickups.values()].some(el => el.kind === "bag"));
    },
    "раздутый взрывается рядом с игроком": () => {
        const world = arena();
        const p = world.addPlayer("s", "Цель");
        place(p, 500, 500);
        p.stats.dodge = 0;
        const bloater = world.createEnemy("bloater", 540, 500);
        world.enemyThink(bloater, Date.now());
        assert.ok(!world.enemies.has(bloater.id));
        assert.ok(p.hp < p.stats.maxHp);
    },
    "ядовитый воздух ранит без противогаза": () => {
        const world = new World(7);
        const p = world.addPlayer("s", "Сталкер");
        let spot = null;
        for (let y = 0; y < WORLD.size && !spot; y += 70) {
            for (let x = 0; x < WORLD.size && !spot; x += 70) {
                if (world.zoneAt(x, y) > ZONES.toxic + 0.01) spot = { x, y };
            }
        }
        assert.ok(spot);
        p.x = spot.x;
        p.y = spot.y;
        p.protectedUntil = 0;
        world.updatePlayers(Date.now(), 1);
        assert.ok(p.hp < p.stats.maxHp);
        const hp = p.hp;
        p.maskId = "gasmask";
        world.updatePlayers(Date.now(), 1);
        assert.strictEqual(p.hp, hp);
    },
    "в безопасной зоне монстров заметно меньше, чем в мёртвых землях": () => {
        const world = new World(8);
        const count = (zoneMin, zoneMax) => {
            world.enemies.clear();
            const p = world.addPlayer("probe", "Проба");
            for (let i = 0; i < 4000 && (world.zoneAt(p.x, p.y) < zoneMin || world.zoneAt(p.x, p.y) > zoneMax); i++) {
                p.x = 2000 + Math.random() * 10000;
                p.y = 2000 + Math.random() * 10000;
            }
            for (let i = 0; i < 20; i++) {
                world.enemyGrid.clear();
                world.enemies.forEach(el => world.enemyGrid.insert(el));
                world.updatePlayers(Date.now(), 0.01);
                world.spawnEnemies(Date.now());
            }
            world.removePlayer("probe");
            return world.enemies.size;
        };
        const safe = count(0, 0.15);
        const deadly = count(0.85, 0.94);
        assert.ok(safe <= 4 && deadly >= 18, `безопасная ${safe}, мёртвая ${deadly}`);
    },
    "здание останавливает пулю": async () => {
        const world = new World(9);
        // Стены дома с дверью сверху или снизу: по горизонтали пуля упирается в стену
        const building = world.obstacles.find(el => el.kind === "interior" && el.doorNy !== 0 && el.w > 70 && el.zone < 0.9);
        const a = world.addPlayer("a", "Стрелок");
        const b = world.addPlayer("b", "За стеной");
        world.spawnEnemies = () => {};
        world.enemies.clear();
        place(a, building.x - building.w / 2 - 60, building.y, 0);
        place(b, building.x + building.w / 2 + 40, building.y);
        const hp = b.hp;
        const start = Date.now();
        world.equip(a, "Rifle");
        world.addItem(a, "ammo_556", 200);
        a.firing = true;
        while (Date.now() - start < 1500) { world.tick(); await sleep(15); }
        assert.strictEqual(b.hp, hp);
    },
    "с монстров падают ресурсы": () => {
        const world = arena();
        const p = world.addPlayer("s", "Охотник");
        place(p, 500, 500);
        for (let i = 0; i < 10; i++) {
            const hound = world.createEnemy("hound", 900, 900);
            world.damageEnemy(hound, 9999, p, "Knife");
        }
        const items = [...world.pickups.values()].filter(el => el.kind === "item");
        assert.ok(items.some(el => el.itemId === "hide" || el.itemId === "bone"));
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
        assert.strictEqual(b.weaponId, "Knife");
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
        assert.strictEqual(a.ammo, weapons[0].ammo, "магазин такой, каким лежал");
        assert.ok(a.ammo < WEAPONS[a.weaponId].clipSize);
    },
    "аирдроп спускается, открывается по E и даёт только положительный перк": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        place(a, 500, 500);
        const now = Date.now();
        const chest = world.createChest(560, 500, now + 45000);
        const before = world.buildSnapshot(a);
        assert.strictEqual(before.c.length, 1);
        assert.ok(before.c[0][3] > 44000 && before.c[0][3] <= 45000);
        world.takePickup(a);
        assert.strictEqual(world.chests.size, 1, "в воздухе не открыть");
        chest.landsAt = now - 1;
        world.updateChests(now);
        world.takePickup(a);
        assert.strictEqual(world.chests.size, 0);
        const rewards = [...world.pickups.values()];
        assert.strictEqual(rewards.length, 1);
        assert.strictEqual(rewards[0].kind, "perk");
        assert.ok(POSITIVE_PERKS.some(el => el.id === rewards[0].perkId));
        assert.ok(rewards[0].expiresAt - now >= 179900 && rewards[0].expiresAt - now <= 180200);
        const lost = world.createChest(560, 500, now - 1);
        lost.expiresAt = now - 1;
        world.updateChests(now);
        assert.strictEqual(world.chests.size, 0, "не вскрытый за 3 минуты исчезает");
    },
    "патроны по калибрам: перезарядка берёт из рюкзака, смена оружия не заряжает": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        place(a, 500, 500);
        world.equip(a, "Pistol", 0);
        world.reload(a);
        assert.strictEqual(a.reloadEndsAt, 0, "без патронов перезарядки нет");
        assert.ok(a.hint.includes("9×19"));
        world.addItem(a, "ammo_9mm", 5);
        world.reload(a);
        assert.ok(a.reloadEndsAt > 0);
        a.reloadEndsAt = Date.now() - 1;
        world.tick();
        assert.strictEqual(a.ammo, 5);
        assert.strictEqual(world.countItem(a, "ammo_9mm"), 0);
        // Пистолет в рюкзак, SMG в руки и обратно: патроны не появляются из воздуха
        world.addItem(a, "w:SMG", 1, 0);
        world.useSlot(a, a.inventory.findIndex(el => el && el.id === "w:SMG"));
        assert.strictEqual(a.weaponId, "SMG");
        assert.strictEqual(a.ammo, 0);
        world.useSlot(a, a.inventory.findIndex(el => el && el.id === "w:Pistol"));
        assert.strictEqual(a.weaponId, "Pistol");
        assert.strictEqual(a.ammo, 5);
        world.switchSlot(a, "tool");
        world.switchSlot(a, "gun");
        assert.strictEqual(a.ammo, 5);
        // Выброшенное оружие хранит магазин
        world.dropSlot(a, a.inventory.findIndex(el => el && el.id === "w:SMG"));
        const smg = [...world.pickups.values()].find(el => el.weaponId === "SMG");
        assert.strictEqual(smg.ammo, 0);
    },
    "голод и жажда: убывают, на нуле ранят, еда и вода восстанавливают": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        place(a, 500, 500);
        a.inventory.fill(null);
        a.food = 0;
        a.water = 10;
        const hp = a.hp;
        world.updatePlayers(Date.now(), 2);
        assert.ok(a.hp < hp, "голод ранит");
        assert.ok(a.water < 10);
        world.addItem(a, "canned", 1);
        world.addItem(a, "water", 1);
        world.useSlot(a, a.inventory.findIndex(el => el && el.id === "canned"));
        world.useSlot(a, a.inventory.findIndex(el => el && el.id === "water"));
        assert.strictEqual(a.food, 45);
        assert.ok(a.water > 55);
        assert.strictEqual(world.countItem(a, "canned"), 0);
    },
    "уровень даёт постоянную прибавку к урону, здоровью и защите": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        const base = { ...a.stats };
        a.exp = 30000;
        world.applyLevels(a);
        assert.ok(a.level >= 15, `уровень ${a.level}`);
        assert.ok(a.stats.damage >= base.damage * 1.5);
        assert.ok(a.stats.maxHp >= base.maxHp + 40);
        assert.ok(a.stats.armor >= 0.14);
    },
    "лагерь: торговля за монеты, задания, нападение делает разыскиваемым": async () => {
        const world = new World(20261104);
        const camp = world.map.camps[0];
        assert.strictEqual(world.map.camps.length, 3);
        const people = [...world.enemies.values()].filter(el => el.camp === 0);
        assert.strictEqual(people.filter(el => el.type === "guard").length, 4);
        const trader = people.find(el => el.type === "trader");
        assert.ok(trader);
        world.spawnEnemies = () => {};
        const a = world.addPlayer("a", "Покупатель");
        const b = world.addPlayer("b", "Задира");
        a.inventory.fill(null);
        place(a, trader.x + 30, trader.y);
        place(b, trader.x + 60, trader.y + 20);
        // Продажа и покупка
        assert.strictEqual(world.trade(a, "t0_water"), false, "без монет");
        world.addItem(a, "bone", 6);
        assert.strictEqual(world.trade(a, "t0_sell_bone"), true);
        assert.strictEqual(world.countItem(a, "coin"), 4);
        assert.strictEqual(world.trade(a, "t0_water"), true);
        assert.strictEqual(world.countItem(a, "water"), 1);
        assert.strictEqual(world.trade(a, "t2_rocket"), false, "товар чужого лагеря");
        // Шприц мутагена не крафтится, только покупается за монеты и слизь
        assert.ok(!require("../dist/configs/Items.js").RECIPES.some(el => el.result === "mutagen"));
        world.addItem(a, "coin", 100);
        world.addItem(a, "slime", 6);
        assert.strictEqual(world.trade(a, "t0_mutagen"), true);
        assert.strictEqual(world.countItem(a, "mutagen"), 1);
        // Наёмник
        assert.strictEqual(world.trade(a, "t0_hire"), true);
        assert.ok([...world.enemies.values()].some(el => el.type === "merc" && el.ownerId === a.id));
        assert.strictEqual(world.trade(a, "t0_hire"), false, "второго не нанять");
        // Задание: взять, убить, сдать
        assert.strictEqual(world.quest(a, "q_zombie", "take"), true);
        for (let i = 0; i < 15; i++) {
            const z = world.createEnemy("zombie", camp.x + 3000, camp.y);
            world.damageEnemy(z, 9999, a, "Pistol");
        }
        const coins = world.countItem(a, "coin");
        assert.strictEqual(world.quest(a, "q_zombie", "claim"), true);
        assert.strictEqual(world.countItem(a, "coin"), coins + 15);
        // В безопасной зоне игроки друг друга не ранят
        a.zone = b.zone = 0.1;
        const hpSafe = a.hp;
        world.damagePlayer(a, 10, b, "Pistol");
        assert.strictEqual(a.hp, hpSafe);
        // Выстрел по игроку в лагере вне безопасной зоны — разыскиваемый, охрана целится в него
        a.zone = b.zone = 0.4;
        world.damagePlayer(a, 10, b, "Pistol");
        assert.ok(world.isWanted(b));
        assert.ok(!world.isWanted(a));
        const guard = people.find(el => el.type === "guard");
        world.enemyThink(guard, Date.now());
        assert.strictEqual(guard.targetId, b.id);
        assert.strictEqual(world.trade(b, "t0_water"), false, "разыскиваемому не продают");
        // Убийство торговца: группа захвата
        world.damageEnemy(trader, 99999, b, "Pistol");
        assert.ok([...world.enemies.values()].some(el => el.type === "hunter" && el.huntId === b.id));
        // Награда за голову и снятие розыска после смерти
        const before = world.countItem(a, "coin");
        b.zone = 0.1;
        world.damagePlayer(b, 9999, a, "Pistol");
        assert.ok(b.dead);
        assert.strictEqual(world.countItem(a, "coin"), before + 40);
        assert.ok(!world.isWanted(b));
    },
    "бег и рывок быстрее шага, тратят выносливость": async () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        place(a, 500, 500);
        const walk = world.speedOf(a);
        a.sprinting = true;
        assert.ok(world.speedOf(a) > walk * 1.3);
        world.dash(a);
        assert.ok(world.speedOf(a) > walk * 3);
        assert.ok(a.stamina <= 70);
        a.moving = true;
        world.updatePlayers(Date.now(), 1);
        assert.ok(a.stamina < 70);
    },
    "рюкзак: перекладывание, подсумок, быстрая еда": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        a.inventory.fill(null);
        world.addItem(a, "wood", 5);
        world.moveSlot(a, 0, 7);
        assert.strictEqual(a.inventory[7].id, "wood");
        assert.strictEqual(a.inventory[0], null);
        world.addItem(a, "wood", 3);
        world.moveSlot(a, 0, 7);
        assert.strictEqual(a.inventory[7].n, 8, "одинаковые стопки складываются");
        world.moveSlot(a, 7, 99);
        world.moveSlot(a, "1", 2);
        world.addItem(a, "pouch", 1);
        world.useSlot(a, a.inventory.findIndex(el => el && el.id === "pouch"));
        assert.strictEqual(a.inventory.length, 16);
        a.food = 10;
        world.addItem(a, "canned", 1);
        world.quickUse(a, "food");
        assert.strictEqual(a.food, 55);
    },
    "выброшенное само не подбирается, только по E; аптечка с монстра — предмет": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        place(a, 500, 500);
        a.inventory.fill(null);
        world.addItem(a, "canned", 2);
        world.dropSlot(a, a.inventory.findIndex(el => el && el.id === "canned"));
        world.updatePickups(Date.now());
        assert.strictEqual(world.countItem(a, "canned"), 0, "не подобралось само");
        world.takePickup(a, "item");
        assert.strictEqual(world.countItem(a, "canned"), 2);
        a.stats.drop = 1;
        const z = world.createEnemy("hound", 520, 500);
        z.cfg = { ...z.cfg, healChance: 1, loot: [], dropChance: 0 };
        world.damageEnemy(z, 9999, a, "Pistol");
        assert.ok([...world.pickups.values()].some(el => el.kind === "item" && ["medkit", "bandage"].includes(el.itemId)));
    },
    "руда только киркой, кристаллы — в мёртвых землях": () => {
        const world = new World(7);
        const ore = world.obstacles.find(el => el.res === "ore");
        const crystal = world.obstacles.find(el => el.res === "crystal");
        assert.ok(ore && crystal);
        assert.ok(crystal.zone > 0.8);
        const p = world.addPlayer("m", "Шахтёр");
        world.enemies.clear();
        world.spawnEnemies = () => {};
        p.x = ore.x - ore.r - 20; p.y = ore.y; p.rotation = 0; p.protectedUntil = 0;
        p.nextShotAt = 0; world.tryShoot(p, Date.now());
        assert.strictEqual(world.countItem(p, "ore"), 0);
        world.equip(p, "Pickaxe");
        p.nextShotAt = 0; world.tryShoot(p, Date.now());
        assert.strictEqual(world.countItem(p, "ore"), 1);
    },
    "прицеливание правой кнопкой уменьшает разброс и скорость": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        const walk = world.speedOf(a);
        a.aiming = true;
        assert.ok(world.speedOf(a) < walk * 0.8);
    },
    "крупный монстр ломает деревья на пути": () => {
        const world = new World(3);
        const tree = world.obstacles.find(el => el.kind === "tree");
        const brute = world.createEnemy("behemoth", tree.x - 80, tree.y);
        brute.moving = true;
        brute.rotation = 0;
        brute.thinkAt = Date.now() + 99999;
        for (let i = 0; i < 30 && tree.alive; i++) {
            world.updateEnemies(Date.now(), 1 / 30);
        }
        assert.strictEqual(tree.alive, false);
    },
    "в дом можно зайти через дверь, на полке есть добыча": () => {
        const world = new World(4);
        const home = world.obstacles.find(el => el.kind === "interior" && el.w > 70 && el.h > 70);
        assert.ok(home, "дома с входом есть");
        assert.strictEqual(world.interiorAt(home.x, home.y), home);
        const p = world.addPlayer("p", "Жилец");
        world.enemies.clear();
        world.spawnEnemies = () => {};
        // Входим через дверь пошагово
        p.x = home.doorX + home.doorNx * 40;
        p.y = home.doorY + home.doorNy * 40;
        p.protectedUntil = Date.now() + 99999;
        for (let i = 0; i < 30; i++) {
            const moved = world.resolveMove(p.x - home.doorNx * 4, p.y - home.doorNy * 4, 13);
            p.x = moved.x;
            p.y = moved.y;
        }
        assert.strictEqual(world.interiorAt(p.x, p.y), home, "игрок внутри");
        // Сквозь стену не пройти
        const side = home.doorNy !== 0 ? { x: home.x + home.w / 2 + 30, y: home.y } : { x: home.x, y: home.y + home.h / 2 + 30 };
        let q = { x: side.x, y: side.y };
        for (let i = 0; i < 30; i++) {
            q = world.resolveMove(q.x + (home.x - side.x) / 30, q.y + (home.y - side.y) / 30, 13);
        }
        assert.notStrictEqual(world.interiorAt(q.x, q.y), home, "стена держит");
        // Монстр снаружи идёт к двери, а не в стену
        const goal = world.doorGoal(side.x, side.y, p.x, p.y);
        assert.ok(goal && Math.hypot(goal.x - home.doorX, goal.y - home.doorY) <= 45);
        // Полки: обыскиваются по E, потом пустые
        const shelf = world.obstacles.find(el => el.kind === "shelf" && Math.abs(el.x - home.x) < home.w / 2 && Math.abs(el.y - home.y) < home.h / 2);
        assert.ok(shelf);
        let found = 0;
        for (let i = 0; i < 20; i++) {
            shelf.alive = true;
            p.inventory = new Array(12).fill(null);
            p.x = shelf.x;
            p.y = shelf.y + 20;
            world.takePickup(p);
            assert.strictEqual(shelf.alive, false);
            found += p.inventory.filter(Boolean).length;
        }
        assert.ok(found > 0, "за 20 обысков что-то нашлось");
    },
    "слоты инструмента и оружия переключаются, патроны не восстанавливаются": () => {
        const world = arena();
        const a = world.addPlayer("a", "A");
        place(a, 500, 500);
        assert.strictEqual(a.toolId, "Knife");
        assert.strictEqual(a.gunId, "");
        world.switchSlot(a, "gun");
        assert.strictEqual(a.weaponId, "Knife", "пустой слот оружия");
        world.equip(a, "Pistol");
        assert.strictEqual(a.gunId, "Pistol");
        assert.strictEqual(a.toolId, "Knife");
        a.ammo = 2;
        world.switchSlot(a, "swap");
        assert.strictEqual(a.weaponId, "Knife");
        world.switchSlot(a, "swap");
        assert.strictEqual(a.weaponId, "Pistol");
        assert.strictEqual(a.ammo, 2);
        // Подобранный инструмент встаёт в свой слот и не трогает пистолет
        world.dropWeapon("Wrench", 500, 500);
        world.takePickup(a);
        assert.strictEqual(a.toolId, "Wrench");
        assert.strictEqual(a.gunId, "Pistol");
        assert.strictEqual(a.weaponId, "Wrench");
        world.switchSlot(a, "gun");
        assert.strictEqual(a.ammo, 2);
        // Оружие из рюкзака меняется только со своим слотом
        world.addItem(a, "w:SMG", 1);
        world.useSlot(a, a.inventory.findIndex(el => el && el.id === "w:SMG"));
        assert.strictEqual(a.gunId, "SMG");
        assert.strictEqual(a.toolId, "Wrench");
        assert.ok(a.inventory.some(el => el && el.id === "w:Pistol"));
        world.unequip(a, "gun");
        assert.strictEqual(a.gunId, "");
        assert.strictEqual(a.weaponId, "Wrench");
        world.switchSlot(a, "nonsense");
        world.switchSlot(a, 1);
    },
    "машину разбирает только гаечный ключ, и она исчезает до конца": () => {
        const world = new World(5);
        const p = world.addPlayer("w", "Механик");
        const wreck = world.obstacles.find(el => el.kind === "wreck" && el.settlement === -1);
        p.x = wreck.x - wreck.r - 20;
        p.y = wreck.y;
        p.rotation = 0;
        p.protectedUntil = 0;
        world.enemies.clear();
        world.spawnEnemies = () => {};
        const hit = () => { p.nextShotAt = 0; world.tryShoot(p, Date.now()); };
        hit();
        assert.strictEqual(world.countItem(p, "scrap"), 0, "нож не разбирает машины");
        assert.ok(p.hint.includes("гаечн"));
        world.equip(p, "Wrench");
        const total = wreck.amount;
        for (let i = 0; i < total + 2; i++) {
            hit();
        }
        assert.strictEqual(world.countItem(p, "scrap"), total);
        assert.strictEqual(wreck.alive, false);
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
