// Ускоренная симуляция мира с игроками-ботами для настройки баланса.
// Запуск: node tools/sim/sim.js [ботов] [игровых минут] [pvp 0|1] [seed]
// Боты действуют через те же методы, что и сокеты игроков: ввод, подбор, крафт, торговля, перки.
const path = require("path");
let simNow = Date.now();
Date.now = () => simNow;
const dist = path.join(__dirname, "../../backend/dist");
const { World } = require(dist + "/World.js");
const { WORLD } = require(dist + "/configs/World.js");
const { WEAPONS } = require(dist + "/configs/Weapons.js");
const { RECIPES, ITEMS, TRADES, QUESTS } = require(dist + "/configs/Items.js");
const { ZONES } = require(dist + "/configs/Terrain.js");

const BOTS = Number(process.argv[2] || 2);
const MINUTES = Number(process.argv[3] || 60);
const PVP = process.argv[4] === "1";
const SEED = Number(process.argv[5] || 20261104);
const TICK = 1000 / WORLD.tickRate;
const RARITY = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

const world = new World(SEED);
const log = [];
const say = (...a) => log.push(`[${fmt(simNow - start)}] ${a.join(" ")}`);
const fmt = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const start = simNow;

// Причины смерти
const deaths = [];
const origKill = world.killPlayer.bind(world);
world.killPlayer = (player, attacker, weaponId) => {
    const near = [...world.enemies.values()].filter(e => Math.hypot(e.x - player.x, e.y - player.y) < 200).map(e => e.type);
    deaths.push({ name: player.name, level: player.level, by: attacker ? `игрок ${attacker.name}` : weaponId || `монстры (${[...new Set(near)].join(",") || "?"})`,
        t: simNow - start, zone: player.zone.toFixed(2) });
    say(`☠ ${player.name} ур.${player.level} убит: ${deaths[deaths.length - 1].by}`);
    return origKill(player, attacker, weaponId);
};

const bots = [];
for (let i = 0; i < BOTS; i++) {
    const p = world.addPlayer("bot" + i, `Бета${i + 1}`);
    bots.push({
        p, goal: null, goalKind: "", stuckFor: 0, lastX: p.x, lastY: p.y, detourUntil: 0, detourAngle: 0,
        levelAt: { 1: 0 }, maxLevel: 1, campVisitAt: 0, lastAct: 0, style: i % 4,
        stats: { kills: 0, pvpKills: 0, crafted: {}, bought: {}, quests: 0, shelves: 0, chests: 0, teamJoins: 0, starve: 0 }
    });
}
const botOf = p => bots.find(b => b.p === p);
world.on("announce", text => say("📢", text));

const count = (p, id) => world.countItem(p, id);
const nearest = (list, x, y, filter = () => true) => {
    let best = null; let bd = Infinity;
    for (const el of list) {
        if (!filter(el)) continue;
        const d = (el.x - x) ** 2 + (el.y - y) ** 2;
        if (d < bd) { bd = d; best = el; }
    }
    return best ? { el: best, d: Math.sqrt(bd) } : null;
};

function craftWhatYouCan(bot) {
    const p = bot.p;
    const want = [];
    if (p.toolId === "Knife") want.push("rope", "axe");
    if (p.toolId === "Axe" && count(p, "w:Pickaxe") === 0) want.push("rope", "pickaxe");
    if (p.inventory.length < 16) want.push("pouch");
    if (!p.armorId) want.push("armor_bone", "armor_wood");
    const gun = WEAPONS[p.gunId];
    if (gun?.ammo === "ammo_9mm") want.push("ammo_9mm", "ammo_9mm_ore");
    if (gun?.ammo === "ammo_556") want.push("ammo_556");
    if (gun?.ammo === "ammo_12g") want.push("ammo_12g");
    if (gun?.ammo === "arrow") want.push("arrow");
    if (!p.gunId) want.push("pistol", "rope", "bow");
    if (count(p, "bandage") + count(p, "medkit") < 3) want.push("bandage", "medkit");
    for (const id of want) {
        if (world.craft(p, id)) {
            bot.stats.crafted[id] = (bot.stats.crafted[id] || 0) + 1;
            const r = RECIPES.find(el => el.id === id);
            if (r && r.result.startsWith("w:")) {
                const slot = p.inventory.findIndex(s => s && s.id === r.result);
                if (slot >= 0) world.useSlot(p, slot);
            }
            if (id === "pouch") world.useSlot(p, p.inventory.findIndex(s => s && s.id === "pouch"));
        }
    }
    // Надеть броню и маску из рюкзака
    p.inventory.forEach((s, i) => {
        if (s && ITEMS[s.id]?.kind === "armor" && (!p.armorId || ITEMS[s.id].armor > ITEMS[p.armorId].armor)) world.useSlot(p, i);
        if (s && s.id === "gasmask" && !p.maskId) world.useSlot(p, i);
    });
}

function visitTrader(bot) {
    const p = bot.p;
    const near = world.traderNear(p);
    if (!near) return false;
    const tier = near.camp.tier;
    for (const t of TRADES[tier]) {
        if (t.get[0] === "coin") while (world.trade(p, t.id)) bot.stats.bought[t.id] = (bot.stats.bought[t.id] || 0) + 1;
    }
    const buy = (id, n) => { for (let i = 0; i < n; i++) if (world.trade(p, id)) bot.stats.bought[id] = (bot.stats.bought[id] || 0) + 1; };
    if (count(p, "water") < 2) buy(`t${tier}_water`, 2);
    if (count(p, "canned") < 2) buy("t0_canned", 2);
    const gun = WEAPONS[p.gunId];
    if (gun?.ammo === "ammo_9mm") buy("t0_9mm", 2);
    if (gun?.ammo === "ammo_556") buy("t1_556", 2);
    if (gun?.ammo === "ammo_12g") buy("t1_12g", 2);
    if (!p.gunId) buy("t1_smg", 1);
    if (count(p, "medkit") < 1) buy("t1_medkit", 1);
    buy(`t${tier}_mutagen`, 1);
    for (const q of QUESTS[tier]) {
        if (world.quest(p, q.id, "claim")) { bot.stats.quests++; say(`✔ ${p.name} сдал задание «${q.text}»`); }
        if (q.kill) world.quest(p, q.id, "take");
    }
    return true;
}

function think(bot) {
    const p = bot.p;
    if (p.dead) {
        if (Date.now() - p.deadAt > WORLD.respawnDelayMs) world.respawn(p);
        return;
    }
    // Перки: читаем и выбираем лучший по редкости, чистые бонусы предпочтительнее
    while (p.offers.length) {
        const offer = p.offers[0];
        const score = c => (c.positive ? 2 : 0) + ({ common: 0, rare: 1, epic: 2 }[c.rarity] || 0) + Math.random();
        let best = 0;
        offer.forEach((c, i) => { if (score(c) > score(offer[best])) best = i; });
        world.pickPerk(p, best);
    }
    if (p.level > bot.maxLevel) {
        for (let l = bot.maxLevel + 1; l <= p.level; l++) bot.levelAt[l] = simNow - start;
        bot.maxLevel = p.level;
        say(`⬆ ${p.name} уровень ${p.level}`);
    }
    // Нужды
    if (p.hp < p.stats.maxHp * 0.45) world.quickHeal(p);
    if (p.food < 40) world.quickUse(p, "food");
    if (p.water < 40) world.quickUse(p, "water");
    if (p.food <= 0 || p.water <= 0) bot.stats.starve++;
    p.inventory.forEach((s, i) => { if (s && s.id === "mutagen") world.useSlot(p, i); });
    craftWhatYouCan(bot);

    // Оружие в руках
    const gun = WEAPONS[p.gunId];
    const gunReady = gun && (p.weaponId === p.gunId ? p.ammo : p.gunAmmo) + (gun.ammo ? count(p, gun.ammo) : 99) > 0;

    // Враги рядом: монстры, а в PvP — чужие игроки
    let target = null;
    const m = nearest([...world.enemies.values()], p.x, p.y, e => !e.cfg.faction && e.hp > 0);
    if (m && m.d < (gunReady ? 480 : 260)) target = { x: m.el.x, y: m.el.y, d: m.d, r: m.el.cfg.radius };
    if (PVP && p.hp > p.stats.maxHp * 0.5) {
        const enemyPlayer = nearest(bots.map(b => b.p), p.x, p.y, o => o !== p && !o.dead && !world.isAlly(p, o) && Date.now() > o.protectedUntil
            && o.zone >= ZONES.safe && p.zone >= ZONES.safe);
        if (enemyPlayer && enemyPlayer.d < 450 && (!target || enemyPlayer.d < target.d)) target = { x: enemyPlayer.el.x, y: enemyPlayer.el.y, d: enemyPlayer.d, r: 13 };
    }
    // Разыскиваемый: охотимся
    const wanted = nearest(bots.map(b => b.p), p.x, p.y, o => o !== p && !o.dead && world.isWanted(o));
    if (wanted && wanted.d < 500 && !world.isWanted(p)) target = { x: wanted.el.x, y: wanted.el.y, d: wanted.d, r: 13 };

    let goal = null;
    let firing = false;
    let rotation = p.rotation;
    // Мало здоровья и нечем лечиться — отступаем от монстров в сторону безопасной зоны
    const healing = count(p, "bandage") + count(p, "medkit");
    if (m && m.d < 380 && p.hp < p.stats.maxHp * (healing ? 0.25 : 0.4)) {
        let best = null;
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2;
            const x = p.x + Math.cos(a) * 500;
            const y = p.y + Math.sin(a) * 500;
            const score = Math.hypot(x - m.el.x, y - m.el.y) - world.zoneAt(x, y) * 600;
            if (!best || score > best.score) best = { x, y, score };
        }
        bot.stats.fled = (bot.stats.fled || 0) + 1;
        move(bot, best, Math.atan2(best.y - p.y, best.x - p.x), false, true);
        if (p.stamina > 30 && Math.random() < 0.1) world.dash(p);
        return;
    }
    if (target) {
        if (gunReady && p.weaponId !== p.gunId) world.switchSlot(p, "gun");
        if (!gunReady && p.weaponId !== p.toolId) world.switchSlot(p, "tool");
        rotation = Math.atan2(target.y - p.y, target.x - p.x);
        const melee = WEAPONS[p.weaponId].melee;
        firing = melee ? target.d < melee.range + target.r + 10 : true;
        if (melee) goal = { x: target.x, y: target.y };
        else if (target.d < 170) goal = { x: p.x - (target.x - p.x), y: p.y - (target.y - p.y) };
        if (p.weaponId === p.gunId && p.ammo === 0 && !p.reloadEndsAt) world.reload(p);
    } else {
        if (p.weaponId !== p.toolId && Math.random() < 0.05) world.switchSlot(p, "tool");
        goal = chooseGoal(bot);
        if (goal && goal.hit) {
            const d = Math.hypot(goal.x - p.x, goal.y - p.y);
            if (d < (goal.reach || 70)) {
                rotation = Math.atan2(goal.y - p.y, goal.x - p.x);
                if (goal.e) {
                    world.takePickup(p, goal.e);
                    if (goal.e === "shelf") bot.stats.shelves++;
                    if (goal.e === "chest") bot.stats.chests++;
                    if (goal.e === "trader") visitTrader(bot);
                    bot.goal = null;
                } else {
                    if (p.weaponId !== p.toolId) world.switchSlot(p, "tool");
                    firing = true;
                }
                goal = null;
            }
        }
    }
    move(bot, goal, rotation, firing);
}

function chooseGoal(bot) {
    const p = bot.p;
    const now = Date.now();
    // Тренировочная толпа: держим цель, пока не достигнута
    const pick = [...world.pickups.values()].filter(it => Math.hypot(it.x - p.x, it.y - p.y) < 350
        && (it.kind === "bag" || it.kind === "perk" || (it.kind === "item" && it.manual)
            || (it.kind === "weapon" && (WEAPONS[it.weaponId].melee ? !p.toolId || p.toolId === "Knife"
                : !p.gunId || RARITY[WEAPONS[it.weaponId].rarity] > RARITY[WEAPONS[p.gunId].rarity]))));
    const it = nearest(pick, p.x, p.y);
    if (it) {
        return { x: it.el.x, y: it.el.y, hit: true, e: it.el.kind === "item" ? "item" : it.el.kind === "perk" ? null : it.el.kind === "bag" ? "bag" : "weapon", reach: 50 };
    }
    // Аирдроп
    const chest = nearest([...world.chests.values()], p.x, p.y);
    if (chest && chest.d < 2200 && p.level >= 3) {
        return { x: chest.el.x, y: chest.el.y, hit: now >= chest.el.landsAt, e: "chest", reach: 70 };
    }
    // Голод, жажда, торговля: в лагерь
    const needCamp = (p.food < 30 && count(p, "canned") + count(p, "meat") === 0) || (p.water < 30 && count(p, "water") === 0)
        || (now > bot.campVisitAt && (count(p, "bone") > 6 || count(p, "hide") > 3 || count(p, "coin") > 30));
    if (needCamp && !world.isWanted(p)) {
        const camp = nearest(world.map.camps, p.x, p.y);
        if (camp && camp.d < 4000) {
            const trader = nearest([...world.enemies.values()], camp.el.x, camp.el.y, e => e.type === "trader");
            if (trader) {
                if (Math.hypot(trader.el.x - p.x, trader.el.y - p.y) < 90) bot.campVisitAt = now + 240000;
                return { x: trader.el.x, y: trader.el.y + 30, hit: true, e: "trader", reach: 90 };
            }
        }
    }
    // Полки в домах
    const comfort = p.level < 4 ? 0.3 : p.level < 7 ? 0.5 : p.level < 10 ? 0.7 : 0.9;
    const shelf = nearest(world.shelves, p.x, p.y, s => s.alive && s.zone <= comfort);
    if (shelf && shelf.d < 700) return { x: shelf.el.x, y: shelf.el.y, hit: true, e: "shelf", reach: 55 };
    // Ресурсы
    const needWood = count(p, "wood") < 8;
    const needStone = count(p, "stone") < 7;
    const needOre = WEAPONS[p.gunId]?.ammo === "ammo_556" && count(p, "ore") < 4 && p.toolId === "Pickaxe";
    const res = nearest(world.obstacles, p.x, p.y, o => o.alive && o.amount > 0 && o.zone <= comfort + 0.1
        && ((needWood && o.res === "wood") || (needStone && o.res === "stone") || (needOre && o.res === "ore")
            || (o.res === "scrap" && p.toolId === "Wrench") || o.kind === "crate"));
    if (res && res.d < 700) return { x: res.el.x, y: res.el.y, hit: true, reach: 50 + res.el.r };
    // Исследование: зона по уровню
    if (!bot.goal || Math.hypot(bot.goal.x - p.x, bot.goal.y - p.y) < 80 || now > bot.goal.until) {
        const want = p.level < 4 ? [0.05, 0.3] : p.level < 7 ? [0.2, 0.5] : p.level < 10 ? [0.35, 0.7] : [0.55, 0.85];
        for (let i = 0; i < 200; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 600 + Math.random() * 1800;
            const x = Math.max(200, Math.min(WORLD.size - 200, p.x + Math.cos(a) * r));
            const y = Math.max(200, Math.min(WORLD.size - 200, p.y + Math.sin(a) * r));
            const z = world.zoneAt(x, y);
            if (z >= want[0] && z <= want[1] && z < ZONES.toxic) { bot.goal = { x, y, until: now + 90000 }; break; }
        }
    }
    return bot.goal;
}

function move(bot, goal, rotation, firing, flee = false) {
    const p = bot.p;
    const now = Date.now();
    let x = p.x; let y = p.y;
    let sprint = false;
    if (goal) {
        let angle = Math.atan2(goal.y - p.y, goal.x - p.x);
        if (now < bot.detourUntil) angle = bot.detourAngle;
        const d = Math.hypot(goal.x - p.x, goal.y - p.y);
        sprint = (flee || (d > 400 && p.stamina > 40)) && !firing;
        const step = Math.min(d, world.speedOf({ ...p, sprinting: sprint }) * 0.1 * 0.95);
        x = p.x + Math.cos(angle) * step;
        y = p.y + Math.sin(angle) * step;
        if (!firing) rotation = angle;
    }
    world.handleInput(p, { x, y, r: rotation, f: firing, s: sprint });
    const moved = Math.hypot(p.x - bot.lastX, p.y - bot.lastY);
    bot.stuckFor = goal && moved < 2 ? bot.stuckFor + 0.1 : 0;
    if (bot.stuckFor > 1) {
        bot.detourAngle = Math.random() * Math.PI * 2;
        bot.detourUntil = now + 900;
        bot.stuckFor = 0;
        if (Math.random() < 0.3) bot.goal = null;
    }
    bot.lastX = p.x; bot.lastY = p.y;
}

// Команды в PvP: случайные пары и тройки
if (PVP) {
    for (let i = 0; i + 1 < bots.length; i += 3) {
        const lead = bots[i].p;
        for (const mate of bots.slice(i + 1, i + (Math.random() < 0.5 ? 2 : 3))) {
            world.invite(lead, mate.p.id);
            lead.lastInviteAt = 0;
            if (world.acceptInvite(mate.p, lead.id)) mate.stats.teamJoins++;
        }
    }
}

const ticks = MINUTES * 60 * WORLD.tickRate;
const t0 = process.hrtime.bigint();
for (let t = 0; t < ticks; t++) {
    simNow += TICK;
    world.tick();
    if (t % 3 === 0) bots.forEach(think);
    if (t % (WORLD.tickRate * 60 * 5) === 0 && t > 0) {
        say("— " + bots.map(b => `${b.p.name}: ур.${b.p.level} hp${Math.round(b.p.hp)} еда${Math.round(b.p.food)} вода${Math.round(b.p.water)} ${b.p.gunId || "-"}/${b.p.toolId} пат${b.p.weaponId === b.p.gunId ? b.p.ammo : b.p.gunAmmo}+${WEAPONS[b.p.gunId]?.ammo ? count(b.p, WEAPONS[b.p.gunId].ammo) : 0} монет${count(b.p, "coin")} зона${b.p.zone.toFixed(2)}`).join(" | "));
    }
}
const wall = Number(process.hrtime.bigint() - t0) / 1e9;

const report = {
    minutes: MINUTES, bots: BOTS, pvp: PVP, wallSeconds: Math.round(wall),
    players: bots.map(b => ({
        name: b.p.name, level: b.p.level, maxLevel: b.maxLevel, kills: b.p.kills,
        levelAtMin: Object.fromEntries(Object.entries(b.levelAt).map(([l, t]) => [l, +(t / 60000).toFixed(1)])),
        deaths: deaths.filter(d => d.name === b.p.name).length, gun: b.p.gunId, tool: b.p.toolId, armor: b.p.armorId,
        coins: count(b.p, "coin"), team: b.p.teamId, ...b.stats
    })),
    deathsBy: deaths.reduce((acc, d) => { const k = d.by.replace(/\(.*\)/, "").trim(); acc[k] = (acc[k] || 0) + 1; return acc; }, {}),
    deaths
};
const fs = require("fs");
const out = process.env.SIM_OUT || "/tmp/zb3/sim";
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
fs.writeFileSync(`${out}/log.txt`, log.join("\n"));
console.log(JSON.stringify({ ...report, deaths: undefined }, null, 1));
process.exit(0);
