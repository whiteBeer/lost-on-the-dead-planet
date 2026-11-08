import { EventEmitter } from "events";
import { WORLD, expForLevel } from "./configs/World";
import { ENEMIES, EnemyConfig } from "./configs/Enemies";
import { WEAPONS, WeaponConfig, STARTING_WEAPON, rollWeapon } from "./configs/Weapons";
import { PERKS, POSITIVE_PERKS, Perk, PlayerStats, computeStats, getPerk, rollPerkOffer } from "./configs/Perks";
import { generateWorld, Obstacle, WorldMap, ZONES, ZONE_NAMES, zoneLevel } from "./configs/Terrain";
import { CRATE_LOOT, CRATE_WEAPON, INVENTORY_SLOTS, ITEMS, RECIPES, isWeaponItem, rollLoot, stackOf } from "./configs/Items";
import {
    AreaGrid, Coords, SpatialGrid, clamp, distSq, pushCircleOutOfRect, segmentCircleHit, segmentRectHit
} from "./utils/geometry";

export interface ItemStack {
    id:string;
    n:number;
}

export interface Team {
    id:number;
    name:string;
    members:Set<number>;
}

export interface Player {
    id:number;
    socketId:string;
    name:string;
    x:number;
    y:number;
    rotation:number;
    firing:boolean;
    moving:boolean;
    lastInputAt:number;

    hp:number;
    dead:boolean;
    deadAt:number;
    protectedUntil:number;

    exp:number;     // Весь опыт текущей жизни: по нему строится рейтинг
    level:number;
    kills:number;
    bestExp:number;

    perks:Set<string>;
    stats:PlayerStats;
    offers:Perk[][];

    weaponId:string;
    ammo:number;
    reloadEndsAt:number;
    nextShotAt:number;
    spreadNow:number;
    lastShotAt:number;

    speedBoostUntil:number;
    speedBoost:number;
    teamId:number;
    invitedBy:Map<number, number>; // id пригласившего -> когда истекает
    lastInviteAt:number;
    regenBuffer:number;

    inventory:(ItemStack | null)[];
    armorId:string;
    maskId:string;
    zone:number;          // опасность в точке, где стоит игрок
    toxicDamage:number;   // урон от ядовитого воздуха в секунду, 0 — его нет
    lastToxicFxAt:number;
}

export interface Enemy {
    id:number;
    type:string;
    cfg:EnemyConfig;
    x:number;
    y:number;
    rotation:number;
    hp:number;
    maxHp:number;
    speed:number;
    flankBias:number;
    wanderAt:number;
    thinkAt:number;
    targetId:number;
    nextAttackAt:number;
    nextShotAt:number;
    lastSeenPlayerAt:number;
    moving:boolean;
    nextSummonAt:number;
    nextChargeAt:number;
    chargeUntil:number;
    revealedUntil:number;  // для невидимых: когда снова скрыться
    summonedBy:number;
}

interface Bullet {
    id:number;
    ownerId:number;      // id игрока или 0, если стреляет монстр
    fromEnemy:boolean;
    x:number;
    y:number;
    vx:number;
    vy:number;
    left:number;         // Сколько ещё может пролететь
    speed:number;
    damage:number;
    pierceLeft:number;
    ricochetLeft:number;
    explosion:number;
    size:number;
    kind:string;
    hit:Set<number>;     // Кого уже задела эта пуля
    crit:boolean;
}

export interface Pickup {
    id:number;
    kind:"weapon" | "medkit" | "perk" | "item" | "bag";
    weaponId?:string;
    perkId?:string;
    itemId?:string;
    count?:number;
    bag?:ItemStack[];
    owner?:string;
    x:number;
    y:number;
    expiresAt:number;
}

export interface Chest {
    id:number;
    x:number;
    y:number;
    opensAt:number;
}

type Fx = [string, number, number, number?, number?];

export interface KillEvent {
    killer:string;
    victim:string;
    weapon:string;
}

const TICK_MS = 1000 / WORLD.tickRate;
const SPAWN_MIN_DIST = 1000;

export class World extends EventEmitter {
    readonly seed:number;
    readonly obstacles:Obstacle[];
    readonly map:WorldMap;
    private obstacleChanges:[number, number][] = [];
    private zoneBase64:string;

    private players = new Map<number, Player>();
    private bySocket = new Map<string, Player>();
    private enemies = new Map<number, Enemy>();
    private bullets:Bullet[] = [];
    private pickups = new Map<number, Pickup>();
    private chests = new Map<number, Chest>();
    private teams = new Map<number, Team>();

    private tickCount = 0;
    private nextId = 1;
    private timer:NodeJS.Timeout | null = null;
    private lastTick = Date.now();
    private nextBossAt = 0;
    private nextChestAt = 0;

    private fxByCell = new SpatialGrid<{ x:number, y:number, fx:Fx }>(600);
    private newBullets = new SpatialGrid<{ x:number, y:number, data:any[] }>(600);
    private enemyGrid = new SpatialGrid<Enemy>(120);
    private obstacleGrid = new AreaGrid<Obstacle>(200);
    private killFeed:KillEvent[] = [];

    constructor(seed = 20261104) {
        super();
        this.seed = seed;
        this.map = generateWorld(seed, WORLD.size);
        this.obstacles = this.map.obstacles;
        this.obstacles.forEach(el => this.obstacleGrid.insert(el));
        this.zoneBase64 = Buffer.from(this.map.zone).toString("base64");
    }

    start() {
        if (this.timer) {
            return;
        }
        this.lastTick = Date.now();
        this.timer = setInterval(() => this.tick(), TICK_MS);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    get playerCount() {
        return this.players.size;
    }

    get enemyCount() {
        return this.enemies.size;
    }

    getPublicConfig() {
        return {
            size: WORLD.size,
            seed: this.seed,
            playerRadius: WORLD.playerRadius,
            playerSpeed: WORLD.playerSpeed,
            viewWidth: 1300,
            viewHeight: 730,
            // [id, вид, форма, x, y, радиус, ширина, высота, поворот, стиль, цел ли]
            obstacles: this.obstacles.map(el => [
                el.id, el.kind, el.shape, el.x, el.y, el.r, el.w, el.h, Number(el.rot.toFixed(2)), el.style, el.alive ? 1 : 0
            ]),
            map: {
                gridSize: this.map.gridSize,
                cell: this.map.cell,
                zone: this.zoneBase64,
                zones: ZONES,
                zoneNames: ZONE_NAMES,
                settlements: this.map.settlements,
                roads: this.map.roads
            },
            items: Object.fromEntries(Object.values(ITEMS).map(el => [el.id, {
                name: el.name, kind: el.kind, description: el.description
            }])),
            recipes: RECIPES,
            weapons: Object.fromEntries(Object.values(WEAPONS).map(el => [el.id, {
                id: el.id, name: el.name, rarity: el.rarity, fireRate: el.fireRate, clipSize: el.clipSize,
                melee: el.melee ? { range: el.melee.range, arc: el.melee.arc } : null,
                spreadBase: el.spreadBase, spreadMax: el.spreadMax,
                spreadIncrement: el.spreadIncrement, spreadRecovery: el.spreadRecovery
            }])),
            enemies: Object.fromEntries(Object.values(ENEMIES).map(el => [el.id, {
                id: el.id, name: el.name, size: el.size, radius: el.radius
            }])),
            perks: Object.fromEntries(PERKS.map(el => [el.id, {
                name: el.name, description: el.description, icon: el.icon || ""
            }]))
        };
    }

    // ---------- Игроки ----------

    addPlayer(socketId:string, rawName:unknown):Player | null {
        if (this.players.size >= WORLD.maxPlayers) {
            return null;
        }
        const id = this.nextId++;
        const player:Player = {
            id, socketId,
            name: sanitizeName(rawName, id),
            x: 0, y: 0, rotation: 0, firing: false, moving: false, lastInputAt: Date.now(),
            hp: 100, dead: false, deadAt: 0, protectedUntil: 0,
            exp: 0, level: 1, kills: 0, bestExp: 0,
            perks: new Set(), stats: computeStats([]), offers: [],
            weaponId: STARTING_WEAPON, ammo: 0, reloadEndsAt: 0, nextShotAt: 0, spreadNow: 0, lastShotAt: 0,
            speedBoostUntil: 0, speedBoost: 0, teamId: 0,
            invitedBy: new Map(), lastInviteAt: 0, regenBuffer: 0,
            inventory: new Array(INVENTORY_SLOTS).fill(null), armorId: "", maskId: "",
            zone: 0, toxicDamage: 0, lastToxicFxAt: 0
        };
        this.resetLife(player);
        this.players.set(id, player);
        this.bySocket.set(socketId, player);
        return player;
    }

    removePlayer(socketId:string) {
        const player = this.bySocket.get(socketId);
        if (!player) {
            return;
        }
        this.leaveTeam(player);
        this.players.delete(player.id);
        this.bySocket.delete(socketId);
    }

    getPlayerBySocket(socketId:string) {
        return this.bySocket.get(socketId);
    }

    private resetLife(player:Player, keepExp = 0) {
        const spawn = this.findSpawnPoint(player);
        player.x = spawn.x;
        player.y = spawn.y;
        player.perks.clear();
        player.stats = computeStats([]);
        player.offers = [];
        player.exp = keepExp;
        player.level = 1;
        player.kills = 0;
        // Сохранённый опыт сразу превращается в уровни и новые перки
        this.applyLevels(player);
        player.hp = player.stats.maxHp;
        player.dead = false;
        player.protectedUntil = Date.now() + WORLD.spawnProtectionMs;
        player.firing = false;
        player.speedBoostUntil = 0;
        player.inventory = new Array(INVENTORY_SLOTS).fill(null);
        player.armorId = "";
        player.maskId = "";
        this.equip(player, STARTING_WEAPON);
    }

    private findSpawnPoint(player:Player):Coords {
        // Рядом с союзником, если он жив
        if (player.teamId) {
            const team = this.teams.get(player.teamId);
            if (team) {
                for (const memberId of team.members) {
                    const mate = this.players.get(memberId);
                    if (mate && mate !== player && !mate.dead) {
                        const spot = this.freeSpotNear(mate.x, mate.y, 200);
                        if (spot) {
                            return spot;
                        }
                    }
                }
            }
        }
        // Иначе — в случайном месте глубоко в безопасной зоне, подальше от врагов и других игроков
        let best:Coords = { x: WORLD.size / 2, y: 80 };
        let bestScore = -1;
        let found = 0;
        for (let i = 0; i < 400 && found < 24; i++) {
            const x = 150 + Math.random() * (WORLD.size - 300);
            const y = 150 + Math.random() * (WORLD.size - 300);
            if (this.zoneAt(x, y) > WORLD.spawnZoneMax || this.isBlocked(x, y, WORLD.playerRadius + 4)) {
                continue;
            }
            found++;
            let score = 5000;
            for (const other of this.players.values()) {
                if (other !== player && !other.dead) {
                    score = Math.min(score, Math.hypot(other.x - x, other.y - y));
                }
            }
            for (const enemy of this.enemies.values()) {
                score = Math.min(score, Math.hypot(enemy.x - x, enemy.y - y) * 2);
            }
            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }
        return best;
    }

    private freeSpotNear(x:number, y:number, radius:number):Coords | null {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const px = clamp(x + Math.cos(angle) * radius, 40, WORLD.size - 40);
            const py = clamp(y + Math.sin(angle) * radius, 40, WORLD.size - 40);
            if (!this.isBlocked(px, py, WORLD.playerRadius + 4)) {
                return { x: px, y: py };
            }
        }
        return null;
    }

    private isBlocked(x:number, y:number, radius:number) {
        let blocked = false;
        this.obstacleGrid.query(x, y, radius, (el) => {
            if (!el.alive) {
                return;
            }
            if (el.shape === "r") {
                if (pushCircleOutOfRect(x, y, radius, el.x, el.y, el.w, el.h)) {
                    blocked = true;
                }
            } else if (distSq(x, y, el.x, el.y) < (el.r + radius) * (el.r + radius)) {
                blocked = true;
            }
        });
        return blocked;
    }

    /** Опасность в точке, 0..1. */
    zoneAt(x:number, y:number) {
        const { gridSize, cell, zone } = this.map;
        const gx = clamp(Math.floor(x / cell), 0, gridSize - 1);
        const gy = clamp(Math.floor(y / cell), 0, gridSize - 1);
        return zone[gy * gridSize + gx] / 255;
    }

    private settlementAt(x:number, y:number) {
        return this.map.settlements.find(s => Math.abs(x - s.x) <= s.w / 2 && Math.abs(y - s.y) <= s.h / 2);
    }

    private equip(player:Player, weaponId:string) {
        player.weaponId = weaponId;
        player.ammo = this.clipOf(player);
        player.reloadEndsAt = 0;
        player.spreadNow = WEAPONS[weaponId].spreadBase;
    }

    private clipOf(player:Player) {
        if (WEAPONS[player.weaponId].melee) {
            return 1;
        }
        return Math.max(1, Math.round(WEAPONS[player.weaponId].clipSize * player.stats.clip));
    }

    private weaponOf(player:Player):WeaponConfig {
        return WEAPONS[player.weaponId];
    }

    // ---------- Команды игрока ----------

    handleInput(player:Player, input:any) {
        if (!input || typeof input !== "object") {
            return;
        }
        const now = Date.now();
        if (typeof input.r === "number" && Number.isFinite(input.r)) {
            player.rotation = input.r;
        }
        player.firing = input.f === true;
        if (player.dead || typeof input.x !== "number" || typeof input.y !== "number"
            || !Number.isFinite(input.x) || !Number.isFinite(input.y)) {
            return;
        }

        // Клиент сам двигает своего персонажа, сервер лишь не даёт двигаться быстрее положенного
        const dt = Math.min(0.25, (now - player.lastInputAt) / 1000);
        player.lastInputAt = now;
        const maxStep = this.speedOf(player) * dt * 1.3 + 4;
        let dx = input.x - player.x;
        let dy = input.y - player.y;
        const dist = Math.hypot(dx, dy);
        player.moving = dist > 0.5;
        if (dist > maxStep && dist > 0) {
            dx = dx / dist * maxStep;
            dy = dy / dist * maxStep;
        }
        const moved = this.resolveMove(player.x + dx, player.y + dy, WORLD.playerRadius);
        player.x = moved.x;
        player.y = moved.y;
    }

    private speedOf(player:Player) {
        const boost = Date.now() < player.speedBoostUntil ? player.speedBoost : 0;
        return WORLD.playerSpeed * (player.stats.speed + boost);
    }

    private resolveMove(x:number, y:number, radius:number):Coords {
        let px = clamp(x, radius, WORLD.size - radius);
        let py = clamp(y, radius, WORLD.size - radius);
        this.obstacleGrid.query(px, py, radius, (el) => {
            if (!el.alive) {
                return;
            }
            if (el.shape === "r") {
                const pushed = pushCircleOutOfRect(px, py, radius, el.x, el.y, el.w, el.h);
                if (pushed) {
                    px = pushed.x;
                    py = pushed.y;
                }
                return;
            }
            const dx = px - el.x;
            const dy = py - el.y;
            const min = el.r + radius;
            const dist = Math.hypot(dx, dy);
            if (dist < min && dist > 0.001) {
                px = el.x + dx / dist * min;
                py = el.y + dy / dist * min;
            }
        });
        return { x: px, y: py };
    }

    reload(player:Player) {
        if (player.dead || player.reloadEndsAt || this.weaponOf(player).melee || player.ammo >= this.clipOf(player)) {
            return;
        }
        player.reloadEndsAt = Date.now() + this.weaponOf(player).reloadTime * 1000 / player.stats.reload;
    }

    respawn(player:Player) {
        if (!player.dead || Date.now() - player.deadAt < WORLD.respawnDelayMs) {
            return;
        }
        const keep = Math.floor(player.exp * player.stats.deathExpKeep);
        this.resetLife(player, keep);
        this.emit("respawned", player);
    }

    pickPerk(player:Player, index:unknown) {
        const offer = player.offers[0];
        if (!offer || typeof index !== "number" || !offer[index]) {
            return;
        }
        const perk = offer[index];
        this.applyPerk(player, perk);
        player.offers.shift();
    }

    private applyPerk(player:Player, perk:Perk) {
        if (player.perks.has(perk.id)) {
            return false;
        }
        const oldMaxHp = player.stats.maxHp;
        const oldClip = this.clipOf(player);
        player.perks.add(perk.id);
        player.stats = computeStats(player.perks);
        // Здоровье меняется вместе с максимумом, но перк не может убить
        const hpDelta = player.stats.maxHp - oldMaxHp;
        player.hp = clamp(player.hp + Math.max(0, hpDelta), 1, player.stats.maxHp);
        const newClip = this.clipOf(player);
        if (newClip !== oldClip) {
            player.ammo = Math.min(newClip, player.ammo + Math.max(0, newClip - oldClip));
        }
        return true;
    }

    takePickup(player:Player) {
        if (player.dead) {
            return;
        }
        let best:Pickup | null = null;
        let bestDist = WORLD.weaponReach * WORLD.weaponReach;
        for (const item of this.pickups.values()) {
            if (item.kind !== "weapon" && item.kind !== "bag") {
                continue;
            }
            const dist = distSq(player.x, player.y, item.x, item.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = item;
            }
        }
        if (best?.kind === "bag" && best.bag) {
            // Сумка погибшего: забираем всё, что влезет, остальное остаётся в ней
            best.bag = best.bag
                .map(stack => ({ id: stack.id, n: this.addItem(player, stack.id, stack.n) }))
                .filter(stack => stack.n > 0);
            if (best.bag.length === 0) {
                this.pickups.delete(best.id);
            }
            this.addFx(["pickup", player.x, player.y]);
            return;
        }
        if (!best || !best.weaponId) {
            return;
        }
        this.pickups.delete(best.id);
        this.stashCurrentWeapon(player);
        this.equip(player, best.weaponId);
        this.addFx(["pickup", player.x, player.y]);
    }

    /** Убирает текущее оружие в рюкзак, а если места нет — бросает на землю. Нож не убирается. */
    private stashCurrentWeapon(player:Player) {
        if (player.weaponId === STARTING_WEAPON) {
            return;
        }
        if (this.addItem(player, `w:${player.weaponId}`, 1) > 0) {
            this.dropWeapon(player.weaponId, player.x, player.y);
        }
    }

    // ---------- Инвентарь ----------

    /** Кладёт предметы в рюкзак. Возвращает, сколько не поместилось. */
    addItem(player:Player, id:string, count:number):number {
        const stack = stackOf(id);
        let left = count;
        for (const slot of player.inventory) {
            if (left > 0 && slot && slot.id === id && slot.n < stack) {
                const add = Math.min(stack - slot.n, left);
                slot.n += add;
                left -= add;
            }
        }
        for (let i = 0; i < player.inventory.length && left > 0; i++) {
            if (!player.inventory[i]) {
                const add = Math.min(stack, left);
                player.inventory[i] = { id, n: add };
                left -= add;
            }
        }
        return left;
    }

    countItem(player:Player, id:string) {
        return player.inventory.reduce((sum, slot) => sum + (slot && slot.id === id ? slot.n : 0), 0);
    }

    private removeItem(player:Player, id:string, count:number) {
        let left = count;
        for (let i = player.inventory.length - 1; i >= 0 && left > 0; i--) {
            const slot = player.inventory[i];
            if (slot && slot.id === id) {
                const take = Math.min(slot.n, left);
                slot.n -= take;
                left -= take;
                if (slot.n <= 0) {
                    player.inventory[i] = null;
                }
            }
        }
    }

    /** Бросает предмет на землю: оружие — как оружие, остальное — как предмет. */
    private dropStack(id:string, count:number, x:number, y:number, lifetimeMs = WORLD.pickupLifetimeMs) {
        if (isWeaponItem(id)) {
            const weaponId = id.slice(2);
            if (WEAPONS[weaponId]) {
                this.dropWeapon(weaponId, x, y, lifetimeMs);
            }
            return;
        }
        const angle = Math.random() * Math.PI * 2;
        const spot = this.resolveMove(x + Math.cos(angle) * 22, y + Math.sin(angle) * 22, 8);
        const pickupId = this.nextId++;
        this.pickups.set(pickupId, {
            id: pickupId, kind: "item", itemId: id, count, x: spot.x, y: spot.y,
            expiresAt: Date.now() + lifetimeMs
        });
    }

    /** Отдаёт предметы игроку, а то, что не влезло, кладёт рядом на землю. */
    private giveOrDrop(player:Player, id:string, count:number) {
        const left = this.addItem(player, id, count);
        if (left > 0) {
            this.dropStack(id, left, player.x, player.y);
        }
    }

    useSlot(player:Player, slotIndex:unknown) {
        if (player.dead || typeof slotIndex !== "number") {
            return;
        }
        const slot = player.inventory[slotIndex];
        if (!slot) {
            return;
        }
        if (isWeaponItem(slot.id)) {
            const weaponId = slot.id.slice(2);
            if (!WEAPONS[weaponId]) {
                return;
            }
            player.inventory[slotIndex] = player.weaponId === STARTING_WEAPON ? null : { id: `w:${player.weaponId}`, n: 1 };
            this.equip(player, weaponId);
            return;
        }
        const item = ITEMS[slot.id];
        if (!item) {
            return;
        }
        if (item.kind === "armor" || item.kind === "mask") {
            const field = item.kind === "armor" ? "armorId" : "maskId";
            const old = player[field];
            player[field] = item.id;
            player.inventory[slotIndex] = old ? { id: old, n: 1 } : null;
            return;
        }
        if (item.kind !== "use") {
            return;
        }
        if (item.heal) {
            if (player.hp >= player.stats.maxHp) {
                return;
            }
            player.hp = Math.min(player.stats.maxHp, player.hp + item.heal);
            this.addFx(["heal", player.x, player.y]);
        } else if (item.id === "grenade") {
            this.throwGrenade(player);
        } else if (item.id === "mutagen") {
            const offer = rollPerkOffer(this.takenWithOffers(player), player.level);
            if (offer.length) {
                player.offers.push(offer);
            }
        }
        slot.n--;
        if (slot.n <= 0) {
            player.inventory[slotIndex] = null;
        }
    }

    /** Лечится лучшим, что есть в рюкзаке: сначала бинтом, если его хватает, потом аптечкой. */
    quickHeal(player:Player) {
        const missing = player.stats.maxHp - player.hp;
        if (player.dead || missing <= 0) {
            return;
        }
        const order = missing > 45 ? ["medkit", "bandage"] : ["bandage", "medkit"];
        for (const id of order) {
            const index = player.inventory.findIndex(slot => slot?.id === id);
            if (index !== -1) {
                this.useSlot(player, index);
                return;
            }
        }
    }

    private throwGrenade(player:Player) {
        const distance = 260;
        const target = this.resolveMove(
            player.x + Math.cos(player.rotation) * distance,
            player.y + Math.sin(player.rotation) * distance,
            6
        );
        player.protectedUntil = 0;
        this.addFx(["throw", player.x, player.y, target.x, target.y]);
        setTimeout(() => this.explode(target.x, target.y, 130, 95, player, "grenade"), 650);
    }

    useGrenade(player:Player) {
        const index = player.inventory.findIndex(slot => slot?.id === "grenade");
        if (index !== -1) {
            this.useSlot(player, index);
        }
    }

    dropSlot(player:Player, slotIndex:unknown) {
        if (player.dead || typeof slotIndex !== "number") {
            return;
        }
        const slot = player.inventory[slotIndex];
        if (!slot) {
            return;
        }
        player.inventory[slotIndex] = null;
        this.dropStack(slot.id, slot.n, player.x, player.y);
    }

    /** Снимает броню или противогаз в рюкзак. */
    unequip(player:Player, what:unknown) {
        if (player.dead || (what !== "armor" && what !== "mask" && what !== "weapon")) {
            return;
        }
        if (what === "weapon") {
            if (player.weaponId !== STARTING_WEAPON && this.addItem(player, `w:${player.weaponId}`, 1) === 0) {
                this.equip(player, STARTING_WEAPON);
            }
            return;
        }
        const field = what === "armor" ? "armorId" : "maskId";
        if (player[field] && this.addItem(player, player[field], 1) === 0) {
            player[field] = "";
        }
    }

    craft(player:Player, recipeId:unknown) {
        const recipe = RECIPES.find(el => el.id === recipeId);
        if (!recipe || player.dead) {
            return false;
        }
        for (const [id, need] of Object.entries(recipe.cost)) {
            if (this.countItem(player, id) < need) {
                return false;
            }
        }
        for (const [id, need] of Object.entries(recipe.cost)) {
            this.removeItem(player, id, need);
        }
        this.giveOrDrop(player, recipe.result, recipe.count);
        this.addExp(player, 4);
        this.addFx(["craft", player.x, player.y]);
        return true;
    }

    private dropWeapon(weaponId:string, x:number, y:number, lifetimeMs = WORLD.pickupLifetimeMs) {
        const angle = Math.random() * Math.PI * 2;
        const spot = this.resolveMove(x + Math.cos(angle) * 30, y + Math.sin(angle) * 30, 10);
        const id = this.nextId++;
        this.pickups.set(id, {
            id, kind: "weapon", weaponId, x: spot.x, y: spot.y,
            expiresAt: Date.now() + lifetimeMs
        });
    }

    private dropPerk(perkId:string, x:number, y:number, lifetimeMs:number) {
        const spot = this.resolveMove(x, y, 10);
        const id = this.nextId++;
        this.pickups.set(id, {
            id, kind: "perk", perkId, x: spot.x, y: spot.y,
            expiresAt: Date.now() + lifetimeMs
        });
    }

    // ---------- Команды ----------

    invite(from:Player, targetId:unknown) {
        const now = Date.now();
        if (typeof targetId !== "number" || now - from.lastInviteAt < 800) {
            return null;
        }
        const target = this.players.get(targetId);
        if (!target || target === from) {
            return null;
        }
        if (from.teamId && from.teamId === target.teamId) {
            return null;
        }
        const team = from.teamId ? this.teams.get(from.teamId) : null;
        if (team && team.members.size >= WORLD.teamMaxSize) {
            return null;
        }
        from.lastInviteAt = now;
        target.invitedBy.set(from.id, now + 30000);
        return target;
    }

    acceptInvite(player:Player, fromId:unknown) {
        if (typeof fromId !== "number") {
            return false;
        }
        const expires = player.invitedBy.get(fromId);
        const inviter = this.players.get(fromId);
        player.invitedBy.delete(fromId as number);
        if (!expires || expires < Date.now() || !inviter) {
            return false;
        }
        let team = inviter.teamId ? this.teams.get(inviter.teamId) : undefined;
        if (!team) {
            team = { id: this.nextId++, name: `Отряд ${inviter.name}`, members: new Set([inviter.id]) };
            this.teams.set(team.id, team);
            inviter.teamId = team.id;
        }
        if (team.members.size >= WORLD.teamMaxSize) {
            return false;
        }
        this.leaveTeam(player);
        team.members.add(player.id);
        player.teamId = team.id;
        return true;
    }

    leaveTeam(player:Player) {
        const team = this.teams.get(player.teamId);
        player.teamId = 0;
        if (!team) {
            return;
        }
        team.members.delete(player.id);
        if (team.members.size <= 1) {
            for (const memberId of team.members) {
                const member = this.players.get(memberId);
                if (member) {
                    member.teamId = 0;
                }
            }
            this.teams.delete(team.id);
        }
    }

    private isAlly(a:Player, b:Player) {
        return a === b || (a.teamId !== 0 && a.teamId === b.teamId);
    }

    // ---------- Симуляция ----------

    private tick() {
        const now = Date.now();
        const dt = Math.min(0.1, (now - this.lastTick) / 1000);
        this.lastTick = now;
        this.tickCount++;

        if (this.players.size === 0) {
            // Пустой мир не тратит процессор, но и не копит старые пули
            this.bullets.length = 0;
            return;
        }

        this.enemyGrid.clear();
        for (const enemy of this.enemies.values()) {
            this.enemyGrid.insert(enemy);
        }

        this.updatePlayers(now, dt);
        this.updateEnemies(now, dt);
        this.updateBullets(dt);
        this.updateChests(now);
        this.updatePickups(now);
        if (this.tickCount % 15 === 0) {
            this.spawnEnemies(now);
        }
        if (this.tickCount % (WORLD.tickRate * 5) === 0) {
            this.respawnObstacles(now);
        }

        if (this.tickCount % WORLD.snapshotEvery === 0) {
            this.emit("snapshot");
            this.fxByCell.clear();
            this.newBullets.clear();
        }
        if (this.tickCount % WORLD.tickRate === 0) {
            this.emit("roster");
        }
    }

    private updatePlayers(now:number, dt:number) {
        for (const player of this.players.values()) {
            if (player.dead) {
                continue;
            }
            if (player.reloadEndsAt && now >= player.reloadEndsAt) {
                player.reloadEndsAt = 0;
                player.ammo = this.clipOf(player);
            }

            const weapon = this.weaponOf(player);
            if (player.lastShotAt) {
                player.spreadNow = Math.max(
                    weapon.spreadBase,
                    player.spreadNow - weapon.spreadRecovery * dt
                );
            }

            const regen = player.stats.regen + (player.moving ? 0 : player.stats.stillRegen);
            if (regen !== 0 && player.hp > 0) {
                // Отрицательное восстановление не может добить игрока
                player.hp = clamp(player.hp + regen * dt, Math.min(1, player.hp), player.stats.maxHp);
            }

            player.zone = this.zoneAt(player.x, player.y);
            player.toxicDamage = player.zone >= ZONES.toxic && player.maskId !== "gasmask" ? WORLD.toxicDamage : 0;
            if (player.toxicDamage > 0) {
                player.hp -= player.toxicDamage * dt;
                if (now - player.lastToxicFxAt > 1000) {
                    player.lastToxicFxAt = now;
                    this.addFx(["toxic", player.x, player.y]);
                }
                if (player.hp <= 0) {
                    this.killPlayer(player, null, "toxic");
                    continue;
                }
            }

            if (player.firing) {
                this.tryShoot(player, now);
            }
            if (now - player.lastInputAt > 400) {
                player.moving = false;
            }
        }
    }

    private tryShoot(player:Player, now:number) {
        const weapon = this.weaponOf(player);
        if (player.reloadEndsAt || now < player.nextShotAt) {
            return;
        }
        if (weapon.melee) {
            player.nextShotAt = now + weapon.fireRate / player.stats.fireRate;
            player.protectedUntil = 0;
            this.meleeSwing(player, weapon);
            return;
        }
        if (player.ammo <= 0) {
            this.reload(player);
            return;
        }
        player.nextShotAt = now + weapon.fireRate / player.stats.fireRate;
        // Выстрел снимает защиту после появления
        player.protectedUntil = 0;

        const isLastBullet = player.ammo === 1;
        if (Math.random() >= player.stats.ammoRefund) {
            player.ammo--;
        }

        const deviation = (Math.random() - 0.5) * 2 * player.spreadNow * player.stats.spread;
        const baseRotation = player.rotation + deviation;
        player.spreadNow = Math.min(weapon.spreadMax, player.spreadNow + weapon.spreadIncrement);
        player.lastShotAt = now;

        const count = (weapon.pellets || 1) + player.stats.extraBullets;
        const cone = weapon.pelletCone || (count > 1 ? 0.12 * player.stats.spread : 0);
        for (let i = 0; i < count; i++) {
            const rotation = count > 1
                ? baseRotation + (i / (count - 1) - 0.5) * cone + (Math.random() - 0.5) * cone * 0.25
                : baseRotation;
            this.spawnBullet(player, weapon, rotation, isLastBullet);
        }

        if (player.stats.selfDamage > 0) {
            player.hp = Math.max(1, player.hp - player.stats.selfDamage);
        }
        if (player.ammo <= 0) {
            this.reload(player);
        }
    }

    /** Удар по дуге перед игроком: монстры, игроки, ресурсы и ящики. */
    private meleeSwing(player:Player, weapon:WeaponConfig) {
        const melee = weapon.melee!;
        const { damage, crit } = this.rollDamage(player, weapon, false);
        const reachTo = (x:number, y:number, radius:number) => {
            const dist = Math.hypot(x - player.x, y - player.y);
            if (dist > melee.range + radius) {
                return false;
            }
            let diff = Math.atan2(y - player.y, x - player.x) - player.rotation;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            // Чем крупнее цель, тем шире угол, под которым её можно задеть
            const slack = dist > 1 ? Math.atan(radius / dist) : Math.PI;
            return Math.abs(diff) <= melee.arc / 2 + slack;
        };
        this.addFx(["swing", player.x, player.y, Math.round(player.rotation * 100), melee.range]);

        let hitSomething = false;
        this.enemyGrid.query(player.x, player.y, melee.range + 80, (enemy) => {
            if (enemy.hp > 0 && this.enemies.has(enemy.id) && reachTo(enemy.x, enemy.y, enemy.cfg.radius)) {
                this.damageEnemy(enemy, damage, player, weapon.id, crit);
                hitSomething = true;
            }
        });
        for (const other of [...this.players.values()]) {
            if (other !== player && !other.dead && !this.isAlly(player, other) && reachTo(other.x, other.y, WORLD.playerRadius)) {
                this.damagePlayer(other, damage * WORLD.pvpDamageMul * player.stats.playerDamage, player, weapon.id, crit);
                hitSomething = true;
            }
        }
        if (hitSomething) {
            return;
        }

        // Если не задели живых — бьём ближайший ресурс или ящик
        let target:Obstacle | null = null;
        let best = Infinity;
        this.obstacleGrid.query(player.x, player.y, melee.range + 20, (el) => {
            if (!el.alive || (el.kind !== "crate" && !el.res)) {
                return;
            }
            const radius = el.shape === "r" ? Math.max(el.w, el.h) / 2 : el.r;
            const dist = Math.hypot(el.x - player.x, el.y - player.y) - radius;
            if (dist < best && reachTo(el.x, el.y, radius)) {
                best = dist;
                target = el;
            }
        });
        if (target) {
            this.hitObstacle(player, target, weapon, damage);
        }
    }

    private hitObstacle(player:Player, el:Obstacle, weapon:WeaponConfig, damage:number) {
        if (el.kind === "crate") {
            this.damageCrate(el, damage, player);
            return;
        }
        if (!el.res || el.amount <= 0) {
            this.addFx(["spark", el.x, el.y]);
            return;
        }
        const gain = Math.min(el.amount, weapon.melee?.gather?.[el.res] || 1);
        el.amount -= gain;
        this.giveOrDrop(player, el.res, gain);
        this.addExp(player, gain);
        this.addFx(["gather", el.x, el.y, gain, ["wood", "stone", "scrap"].indexOf(el.res)]);
        if (el.amount <= 0) {
            el.respawnAt = Date.now() + WORLD.resourceRespawnMs;
            // Дерево и камень исчезают, остов машины остаётся стоять
            if (el.kind !== "wreck") {
                this.setObstacleAlive(el, false);
            }
        }
    }

    private damageCrate(el:Obstacle, damage:number, player?:Player) {
        if (!el.alive) {
            return;
        }
        el.hp -= Math.max(1, damage);
        this.addFx(["spark", el.x, el.y]);
        if (el.hp > 0) {
            return;
        }
        this.setObstacleAlive(el, false);
        el.respawnAt = Date.now() + WORLD.crateRespawnMs;
        const settlement = el.settlement >= 0 ? this.map.settlements[el.settlement] : undefined;
        const table = settlement ? settlement.kind : "wild";
        const luck = player ? player.stats.drop : 1;
        for (const [id, count] of rollLoot(CRATE_LOOT[table], luck)) {
            this.dropStack(id, count, el.x, el.y);
        }
        const [chance, tier] = CRATE_WEAPON[table];
        if (Math.random() < chance * luck) {
            this.dropWeapon(rollWeapon(tier), el.x, el.y);
        }
        this.addFx(["crate", el.x, el.y]);
    }

    private setObstacleAlive(el:Obstacle, alive:boolean) {
        el.alive = alive;
        this.obstacleChanges.push([el.id, alive ? 1 : 0]);
    }

    /** Изменения препятствий с прошлого вызова: срубленные деревья, разбитые ящики. */
    takeObstacleChanges() {
        const changes = this.obstacleChanges;
        this.obstacleChanges = [];
        return changes;
    }

    private respawnObstacles(now:number) {
        for (const el of this.obstacles) {
            if (!el.respawnAt || now < el.respawnAt) {
                continue;
            }
            // Не возвращаем дерево прямо под ногами у игрока
            const near = el.alive ? false : this.isNearAnyPlayer(el.x, el.y, el.r + 60);
            if (near) {
                continue;
            }
            el.respawnAt = 0;
            el.amount = el.maxAmount;
            if (el.kind === "crate") {
                el.hp = 60;
            }
            if (!el.alive) {
                this.setObstacleAlive(el, true);
            }
        }
    }

    private rollDamage(player:Player, weapon:WeaponConfig, isLastBullet:boolean) {
        const stats = player.stats;
        let damage = weapon.damage * stats.damage;
        if (isLastBullet) {
            damage *= stats.lastBullet;
        }
        const hpFrac = player.hp / stats.maxHp;
        if (hpFrac < 0.35) {
            damage *= 1 + stats.lowHpDamage;
        }
        if (hpFrac > 0.9) {
            damage *= 1 + stats.highHpDamage;
        }
        damage *= 1 + (player.moving ? stats.movingDamage : stats.stillDamage);
        if (stats.damageVariance > 0) {
            damage *= 1 + (Math.random() * 2 - 1) * stats.damageVariance;
        }
        const crit = Math.random() < stats.crit;
        if (crit) {
            damage *= stats.critDamage;
        }
        if (Math.random() < stats.miss) {
            damage = 0;
        }
        return { damage, crit };
    }

    private spawnBullet(player:Player, weapon:WeaponConfig, rotation:number, isLastBullet:boolean) {
        const stats = player.stats;
        let damage = weapon.damage * stats.damage;
        if (isLastBullet) {
            damage *= stats.lastBullet;
        }
        const hpFrac = player.hp / stats.maxHp;
        if (hpFrac < 0.35) {
            damage *= 1 + stats.lowHpDamage;
        }
        if (hpFrac > 0.9) {
            damage *= 1 + stats.highHpDamage;
        }
        damage *= 1 + (player.moving ? stats.movingDamage : stats.stillDamage);
        if (stats.damageVariance > 0) {
            damage *= 1 + (Math.random() * 2 - 1) * stats.damageVariance;
        }
        const crit = Math.random() < stats.crit;
        if (crit) {
            damage *= stats.critDamage;
        }
        if (Math.random() < stats.miss) {
            damage = 0;
        }

        const speed = weapon.speedInSecond * stats.bulletSpeed;
        const bullet:Bullet = {
            id: this.nextId++,
            ownerId: player.id,
            fromEnemy: false,
            x: player.x,
            y: player.y,
            vx: Math.cos(rotation) * speed,
            vy: Math.sin(rotation) * speed,
            left: weapon.range * stats.range,
            speed,
            damage,
            pierceLeft: (weapon.pierce || 0) + stats.pierce,
            ricochetLeft: stats.ricochet,
            explosion: weapon.explosion || 0,
            size: weapon.bulletSize || 3,
            kind: weapon.id,
            hit: new Set(),
            crit
        };
        this.bullets.push(bullet);
        this.announceBullet(bullet);
    }

    private announceBullet(bullet:Bullet) {
        this.newBullets.insert({
            x: bullet.x,
            y: bullet.y,
            data: [
                bullet.id, bullet.kind,
                Math.round(bullet.x), Math.round(bullet.y),
                Math.round(bullet.vx), Math.round(bullet.vy),
                Math.round(bullet.left), bullet.size, bullet.ownerId
            ]
        });
    }

    private updateBullets(dt:number) {
        const survivors:Bullet[] = [];
        for (const bullet of this.bullets) {
            if (this.stepBullet(bullet, dt)) {
                survivors.push(bullet);
            }
        }
        this.bullets = survivors;
    }

    /**
     * Двигает пулю и обрабатывает попадания по порядку вдоль траектории.
     * Возвращает false, если пуля закончила полёт.
     */
    private stepBullet(bullet:Bullet, dt:number):boolean {
        const stepLen = Math.min(bullet.speed * dt, bullet.left);
        const from = { x: bullet.x, y: bullet.y };
        const to = {
            x: bullet.x + bullet.vx / bullet.speed * stepLen,
            y: bullet.y + bullet.vy / bullet.speed * stepLen
        };
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const reach = stepLen / 2 + 80;

        type Hit = { t:number, enemy?:Enemy, player?:Player, obstacle?:Obstacle };
        const hits:Hit[] = [];

        this.obstacleGrid.query(midX, midY, stepLen / 2 + 10, (el) => {
            if (!el.alive) {
                return;
            }
            const t = el.shape === "r"
                ? segmentRectHit(from, to, el.x, el.y, el.w, el.h)
                : segmentCircleHit(from, to, el, el.r);
            if (t !== null) {
                hits.push({ t, obstacle: el });
            }
        });

        if (!bullet.fromEnemy) {
            this.enemyGrid.query(midX, midY, reach, (enemy) => {
                if (enemy.hp > 0 && !bullet.hit.has(enemy.id)) {
                    const t = segmentCircleHit(from, to, enemy, enemy.cfg.radius);
                    if (t !== null) {
                        hits.push({ t, enemy });
                    }
                }
            });
        }

        const owner = bullet.fromEnemy ? undefined : this.players.get(bullet.ownerId);
        for (const player of this.players.values()) {
            if (player.dead || bullet.hit.has(player.id) || player.id === bullet.ownerId) {
                continue;
            }
            if (owner && this.isAlly(owner, player)) {
                continue;
            }
            const t = segmentCircleHit(from, to, player, WORLD.playerRadius);
            if (t !== null) {
                hits.push({ t, player });
            }
        }

        hits.sort((a, b) => a.t - b.t);

        for (const hit of hits) {
            const px = from.x + (to.x - from.x) * hit.t;
            const py = from.y + (to.y - from.y) * hit.t;

            if (hit.obstacle) {
                if (hit.obstacle.kind === "crate" && !bullet.fromEnemy) {
                    this.damageCrate(hit.obstacle, bullet.damage, owner);
                }
                if (bullet.explosion) {
                    this.explode(px, py, bullet.explosion, bullet.damage, owner);
                }
                this.addFx(["spark", px, py]);
                this.addFx(["bulletEnd", px, py, bullet.id]);
                return false;
            }

            if (hit.enemy) {
                bullet.hit.add(hit.enemy.id);
                this.damageEnemy(hit.enemy, bullet.damage, owner, bullet.kind, bullet.crit);
            } else if (hit.player) {
                bullet.hit.add(hit.player.id);
                if (bullet.fromEnemy) {
                    this.damagePlayer(hit.player, bullet.damage, null, null);
                } else if (owner) {
                    this.damagePlayer(hit.player, bullet.damage * WORLD.pvpDamageMul * owner.stats.playerDamage, owner, bullet.kind, bullet.crit);
                }
            }

            if (bullet.explosion) {
                this.explode(px, py, bullet.explosion, bullet.damage, owner);
                this.addFx(["bulletEnd", px, py, bullet.id]);
                return false;
            }

            if (bullet.pierceLeft > 0) {
                bullet.pierceLeft--;
                continue;
            }

            if (bullet.ricochetLeft > 0 && this.ricochet(bullet, px, py, owner)) {
                return true;
            }

            this.addFx(["bulletEnd", px, py, bullet.id]);
            return false;
        }

        bullet.x = to.x;
        bullet.y = to.y;
        bullet.left -= stepLen;
        if (bullet.left <= 0) {
            if (bullet.explosion) {
                this.explode(to.x, to.y, bullet.explosion, bullet.damage, owner);
            }
            return false;
        }
        return true;
    }

    private ricochet(bullet:Bullet, x:number, y:number, owner?:Player) {
        let best:Coords | null = null;
        let bestDist = 380 * 380;
        this.enemyGrid.query(x, y, 380, (enemy) => {
            if (!bullet.hit.has(enemy.id) && enemy.hp > 0) {
                const dist = distSq(x, y, enemy.x, enemy.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = enemy;
                }
            }
        });
        for (const player of this.players.values()) {
            if (player.dead || bullet.hit.has(player.id) || (owner && this.isAlly(owner, player))) {
                continue;
            }
            const dist = distSq(x, y, player.x, player.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = player;
            }
        }
        if (!best) {
            return false;
        }
        const target = best as Coords;
        const angle = Math.atan2(target.y - y, target.x - x);
        bullet.ricochetLeft--;
        bullet.x = x;
        bullet.y = y;
        bullet.vx = Math.cos(angle) * bullet.speed;
        bullet.vy = Math.sin(angle) * bullet.speed;
        bullet.left = Math.max(bullet.left, 450);
        this.addFx(["bulletEnd", x, y, bullet.id]);
        bullet.id = this.nextId++;
        this.announceBullet(bullet);
        return true;
    }

    private explode(x:number, y:number, radius:number, damage:number, owner?:Player, source = "Rocket") {
        this.addFx(["boom", x, y, radius]);
        this.enemyGrid.query(x, y, radius + 70, (enemy) => {
            const dist = Math.hypot(enemy.x - x, enemy.y - y) - enemy.cfg.radius;
            if (dist < radius && enemy.hp > 0) {
                const falloff = 1 - Math.max(0, dist) / radius * 0.6;
                this.damageEnemy(enemy, damage * falloff, owner, source, false);
            }
        });
        for (const player of [...this.players.values()]) {
            if (player.dead || (owner && this.isAlly(owner, player))) {
                continue;
            }
            const dist = Math.hypot(player.x - x, player.y - y) - WORLD.playerRadius;
            if (dist < radius) {
                const falloff = 1 - Math.max(0, dist) / radius * 0.6;
                const scale = owner ? WORLD.pvpDamageMul * owner.stats.playerDamage : 1;
                this.damagePlayer(player, damage * falloff * scale, owner || null, source);
            }
        }
    }

    private damageEnemy(enemy:Enemy, rawDamage:number, attacker:Player | undefined, weaponId:string, crit = false) {
        if (enemy.hp <= 0) {
            return;
        }
        let damage = rawDamage * (1 - (enemy.cfg.armor || 0));
        enemy.revealedUntil = Date.now() + 2500;
        if (attacker) {
            damage *= attacker.stats.monsterDamage;
            if (enemy.type === "boss") {
                damage *= attacker.stats.bossDamage;
            }
            if (attacker.stats.lifesteal > 0 && !attacker.dead) {
                attacker.hp = Math.min(attacker.stats.maxHp, attacker.hp + damage * attacker.stats.lifesteal);
            }
            enemy.targetId = attacker.id;
        }
        enemy.hp -= damage;
        if (damage > 0) {
            this.addFx(["dmg", enemy.x, enemy.y, Math.round(damage), crit ? 1 : 0]);
        } else {
            this.addFx(["miss", enemy.x, enemy.y]);
        }
        if (enemy.hp <= 0) {
            this.killEnemy(enemy, attacker);
        }
    }

    private killEnemy(enemy:Enemy, killer?:Player) {
        this.enemies.delete(enemy.id);
        this.addFx(["gore", enemy.x, enemy.y, enemy.cfg.size]);
        if (enemy.cfg.explode) {
            this.explode(enemy.x, enemy.y, enemy.cfg.explode.radius, enemy.cfg.explode.damage * 0.7, undefined, "bloater");
        }

        if (killer) {
            for (const [id, count] of rollLoot(enemy.cfg.loot, Math.min(2, killer.stats.drop))) {
                this.dropStack(id, count, enemy.x, enemy.y);
            }
            const dropMul = killer.stats.drop;
            if (Math.random() < enemy.cfg.dropChance * dropMul) {
                this.dropWeapon(rollWeapon(enemy.cfg.tier), enemy.x, enemy.y);
            }
            if (Math.random() < enemy.cfg.healChance) {
                const id = this.nextId++;
                this.pickups.set(id, {
                    id, kind: "medkit", x: enemy.x, y: enemy.y,
                    expiresAt: Date.now() + WORLD.pickupLifetimeMs
                });
            }
            this.grantKillRewards(killer, enemy.cfg.exp, true, enemy.x, enemy.y);
            if (enemy.type === "boss") {
                this.emit("feed", { killer: killer.name, victim: enemy.cfg.name, weapon: killer.weaponId });
            }
        }
    }

    private grantKillRewards(killer:Player, baseExp:number, shareable:boolean, x:number, y:number) {
        this.addExp(killer, baseExp * killer.stats.exp);
        killer.kills++;
        if (killer.dead) {
            return;
        }
        killer.hp = Math.min(killer.stats.maxHp, killer.hp + killer.stats.onKillHeal);
        if (killer.stats.speedOnKill > 0) {
            killer.speedBoost = killer.stats.speedOnKill;
            killer.speedBoostUntil = Date.now() + 3000;
        }
        if (Math.random() < killer.stats.reloadOnKill) {
            killer.reloadEndsAt = 0;
            killer.ammo = this.clipOf(killer);
        }
        if (killer.stats.explodeOnKill > 0) {
            this.explode(x, y, killer.stats.explodeOnKill, WORLD.explosionDamage * 0.5, killer, killer.weaponId);
        }
        if (shareable && killer.teamId) {
            const team = this.teams.get(killer.teamId);
            team?.members.forEach((memberId) => {
                const mate = this.players.get(memberId);
                if (mate && mate !== killer && !mate.dead
                    && distSq(mate.x, mate.y, killer.x, killer.y) < WORLD.teamExpRadius * WORLD.teamExpRadius) {
                    this.addExp(mate, baseExp * WORLD.teamExpShare * mate.stats.teamShare * mate.stats.exp);
                }
            });
        }
    }

    private addExp(player:Player, amount:number) {
        if (amount <= 0) {
            return;
        }
        player.exp += amount;
        this.applyLevels(player);
    }

    private applyLevels(player:Player) {
        while (player.level < WORLD.maxLevel && player.exp >= totalExpForLevel(player.level + 1)) {
            player.level++;
            const offer = rollPerkOffer(this.takenWithOffers(player), player.level);
            if (offer.length) {
                player.offers.push(offer);
            }
            if (!player.dead && player.stats) {
                this.addFx(["level", player.x, player.y]);
                player.hp = Math.min(player.stats.maxHp, player.hp + player.stats.maxHp * 0.25);
            }
        }
    }

    private takenWithOffers(player:Player) {
        const taken = new Set(player.perks);
        player.offers.forEach(offer => offer.forEach(perk => taken.add(perk.id)));
        return taken;
    }

    private damagePlayer(player:Player, rawDamage:number, attacker:Player | null, weaponId:string | null, crit = false) {
        if (player.dead || Date.now() < player.protectedUntil) {
            return;
        }
        if (rawDamage <= 0) {
            this.addFx(["miss", player.x, player.y]);
            return;
        }
        if (Math.random() < player.stats.dodge) {
            this.addFx(["dodge", player.x, player.y]);
            return;
        }
        const reduction = clamp(player.stats.armor, -1, 0.7)
            + (attacker ? player.stats.playerArmor : player.stats.monsterArmor)
            + (ITEMS[player.armorId]?.armor || 0);
        const damage = rawDamage * (1 - clamp(reduction, -1, 0.8));
        player.hp -= damage;
        this.addFx(["dmg", player.x, player.y, Math.round(damage), crit ? 1 : 0]);

        if (attacker && attacker.stats.lifesteal > 0 && !attacker.dead) {
            attacker.hp = Math.min(attacker.stats.maxHp, attacker.hp + damage * attacker.stats.lifesteal);
        }
        if (attacker && !attacker.dead && player.stats.thorns > 0) {
            this.damagePlayer(attacker, damage * player.stats.thorns * 0.5, null, null);
        }

        if (player.hp <= 0) {
            this.killPlayer(player, attacker, weaponId);
        }
    }

    private killPlayer(player:Player, attacker:Player | null, weaponId:string | null) {
        player.hp = 0;
        player.dead = true;
        player.deadAt = Date.now();
        player.firing = false;
        player.bestExp = Math.max(player.bestExp, player.exp);
        this.addFx(["gore", player.x, player.y, 60]);

        // Всё, что было при себе, остаётся в сумке на месте гибели
        const bag:ItemStack[] = player.inventory.filter((slot):slot is ItemStack => !!slot).map(slot => ({ ...slot }));
        if (player.weaponId !== STARTING_WEAPON) {
            bag.push({ id: `w:${player.weaponId}`, n: 1 });
        }
        if (player.armorId) {
            bag.push({ id: player.armorId, n: 1 });
        }
        if (player.maskId) {
            bag.push({ id: player.maskId, n: 1 });
        }
        if (bag.length) {
            const id = this.nextId++;
            this.pickups.set(id, {
                id, kind: "bag", bag, owner: player.name, x: player.x, y: player.y,
                expiresAt: Date.now() + WORLD.bagLifetimeMs
            });
        }
        player.inventory = new Array(INVENTORY_SLOTS).fill(null);
        player.armorId = "";
        player.maskId = "";

        const stats = player.stats;
        if (stats.explodeOnDeath > 0) {
            this.explode(player.x, player.y, stats.explodeOnDeath, WORLD.explosionDamage * 1.6, player, "Rocket");
        }

        if (attacker && attacker !== player) {
            const reward = (WORLD.killBaseExp + player.exp * WORLD.killExpShare) * stats.killBounty;
            this.grantKillRewards(attacker, reward, false, player.x, player.y);
            this.emit("feed", { killer: attacker.name, victim: player.name, weapon: weaponId || attacker.weaponId });
        } else {
            this.emit("feed", { killer: "", victim: player.name, weapon: "" });
        }
        this.emit("died", player, attacker);
    }

    private updateEnemies(now:number, dt:number) {
        for (const enemy of this.enemies.values()) {
            if (now >= enemy.thinkAt) {
                enemy.thinkAt = now + 180 + Math.random() * 80;
                this.enemyThink(enemy, now);
            }

            if (enemy.moving) {
                const charging = now < enemy.chargeUntil;
                const speed = enemy.speed * (charging ? enemy.cfg.charge!.speedMul : 1);
                let vx = Math.cos(enemy.rotation) * speed;
                let vy = Math.sin(enemy.rotation) * speed;

                // Монстры расталкивают друг друга, чтобы не сливаться в одну кучу
                this.enemyGrid.query(enemy.x, enemy.y, enemy.cfg.radius + 50, (other) => {
                    if (other === enemy) {
                        return;
                    }
                    const dx = enemy.x - other.x;
                    const dy = enemy.y - other.y;
                    const min = (enemy.cfg.radius + other.cfg.radius) * 0.75;
                    const dist = Math.hypot(dx, dy);
                    if (dist < min && dist > 0.01) {
                        const push = (min - dist) / min * 90;
                        vx += dx / dist * push;
                        vy += dy / dist * push;
                    }
                });

                const moved = this.resolveMove(enemy.x + vx * dt, enemy.y + vy * dt, enemy.cfg.radius * 0.7);
                enemy.x = moved.x;
                enemy.y = moved.y;
            }

            this.enemyAttack(enemy, now);
        }
    }

    private enemyThink(enemy:Enemy, now:number) {
        let target:Player | null = null;
        let bestDist = Infinity;
        for (const player of this.players.values()) {
            if (player.dead) {
                continue;
            }
            const dist = distSq(enemy.x, enemy.y, player.x, player.y);
            const aggro = enemy.cfg.aggro * player.stats.aggro;
            // Монстр не теряет того, кто в него стрелял
            const isGrudge = enemy.targetId === player.id && dist < 1400 * 1400;
            if ((dist < aggro * aggro || isGrudge) && dist < bestDist) {
                bestDist = dist;
                target = player;
            }
        }

        if (target) {
            enemy.lastSeenPlayerAt = now;
            const directAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
            const dist = Math.sqrt(bestDist);
            const cfg = enemy.cfg;

            // Невидимка проявляется вблизи
            if (cfg.stealth && dist < cfg.stealth) {
                enemy.revealedUntil = now + 1200;
            }
            // Рывок: короткий разгон прямо на цель
            if (cfg.charge && now >= enemy.nextChargeAt && dist < cfg.charge.range && dist > 90) {
                enemy.nextChargeAt = now + cfg.charge.interval;
                enemy.chargeUntil = now + cfg.charge.duration;
                enemy.rotation = directAngle;
                enemy.moving = true;
                enemy.targetId = target.id;
                this.addFx(["roar", enemy.x, enemy.y]);
                return;
            }
            if (now < enemy.chargeUntil) {
                return;
            }
            // Крик: зовёт зомби на помощь, но не больше лимита
            if (cfg.summon && now >= enemy.nextSummonAt) {
                enemy.nextSummonAt = now + cfg.summon.interval;
                let alive = 0;
                for (const other of this.enemies.values()) {
                    if (other.summonedBy === enemy.id) {
                        alive++;
                    }
                }
                const count = Math.min(cfg.summon.count, cfg.summon.cap - alive);
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spot = this.resolveMove(enemy.x + Math.cos(angle) * 90, enemy.y + Math.sin(angle) * 90, 20);
                    const minion = this.createEnemy(cfg.summon.type, spot.x, spot.y, now);
                    minion.summonedBy = enemy.id;
                    minion.targetId = target.id;
                }
                if (count > 0) {
                    this.addFx(["scream", enemy.x, enemy.y]);
                }
            }
            // Взрыв раздутого рядом с игроком
            if (cfg.explode && dist < cfg.explode.trigger + WORLD.playerRadius) {
                this.enemies.delete(enemy.id);
                this.addFx(["gore", enemy.x, enemy.y, cfg.size]);
                this.explode(enemy.x, enemy.y, cfg.explode.radius, cfg.explode.damage, undefined, "bloater");
                return;
            }
            if (cfg.keepDistance && dist < cfg.keepDistance) {
                // Отходит назад, чтобы держать дистанцию
                enemy.moving = dist < cfg.keepDistance * 0.7;
                enemy.rotation = enemy.moving ? directAngle + Math.PI : directAngle;
                enemy.targetId = target.id;
                return;
            }
            // Логика обхода из оригинальной игры: издалека идём по дуге, вблизи — прямо
            let angle = directAngle;
            if (dist > 260) {
                angle += enemy.flankBias;
            }
            const ranged = enemy.cfg.ranged;
            if (ranged && dist < ranged.range * 0.55 && enemy.type !== "boss") {
                // Стрелок держит дистанцию
                enemy.moving = false;
                enemy.rotation = directAngle;
            } else {
                enemy.moving = true;
                enemy.rotation = angle;
            }
            enemy.targetId = target.id;
            return;
        }

        enemy.targetId = 0;
        if (now >= enemy.wanderAt) {
            enemy.wanderAt = now + 1500 + Math.random() * 3500;
            enemy.moving = Math.random() < 0.6;
            enemy.rotation = Math.random() * Math.PI * 2;
        }

        // Монстры без игроков поблизости исчезают и появляются снова там, где есть кому в них стрелять
        if (now - enemy.lastSeenPlayerAt > 45000 && enemy.type !== "boss"
            && !this.isNearAnyPlayer(enemy.x, enemy.y, WORLD.enemyAreaRadius + 200)) {
            this.enemies.delete(enemy.id);
        }
    }

    private enemyAttack(enemy:Enemy, now:number) {
        const target = enemy.targetId ? this.players.get(enemy.targetId) : null;
        const ranged = enemy.cfg.ranged;
        if (target && !target.dead && ranged && now >= enemy.nextShotAt) {
            const dist = Math.hypot(target.x - enemy.x, target.y - enemy.y);
            if (dist < ranged.range) {
                enemy.nextShotAt = now + ranged.interval;
                const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                const bullet:Bullet = {
                    id: this.nextId++, ownerId: 0, fromEnemy: true,
                    x: enemy.x, y: enemy.y,
                    vx: Math.cos(angle) * ranged.speed, vy: Math.sin(angle) * ranged.speed,
                    left: ranged.range * 1.2, speed: ranged.speed, damage: ranged.damage,
                    pierceLeft: 0, ricochetLeft: 0, explosion: 0,
                    size: ranged.kind === "shot" ? 3 : 7, kind: ranged.kind || "acid",
                    hit: new Set(), crit: false
                };
                this.bullets.push(bullet);
                this.announceBullet(bullet);
            }
        }

        if (now < enemy.nextAttackAt) {
            return;
        }
        for (const player of this.players.values()) {
            if (player.dead) {
                continue;
            }
            const reach = enemy.cfg.radius + WORLD.playerRadius + 4;
            if (enemy.cfg.damage > 0 && distSq(enemy.x, enemy.y, player.x, player.y) < reach * reach) {
                if (now < enemy.chargeUntil) {
                    enemy.chargeUntil = 0;
                }
                enemy.nextAttackAt = now + enemy.cfg.attackInterval;
                const hpBefore = player.hp;
                this.damagePlayer(player, enemy.cfg.damage, null, null);
                const thorns = player.stats.thorns;
                if (thorns > 0 && hpBefore > player.hp) {
                    this.damageEnemy(enemy, (hpBefore - player.hp) * thorns, player, player.weaponId);
                }
                return;
            }
        }
    }

    private isNearAnyPlayer(x:number, y:number, radius:number) {
        for (const player of this.players.values()) {
            if (distSq(x, y, player.x, player.y) < radius * radius) {
                return true;
            }
        }
        return false;
    }

    private spawnEnemies(now:number) {
        // Вокруг каждого игрока держим столько монстров, сколько положено зоне, где он стоит
        let budget = 8;
        for (const player of this.players.values()) {
            if (player.dead || budget <= 0 || this.enemies.size >= WORLD.maxEnemies) {
                continue;
            }
            const want = WORLD.enemiesAround[zoneLevel(player.zone)];
            let around = 0;
            this.enemyGrid.query(player.x, player.y, WORLD.enemyAreaRadius, (enemy) => {
                if (distSq(enemy.x, enemy.y, player.x, player.y) < WORLD.enemyAreaRadius ** 2) {
                    around++;
                }
            });
            for (let i = around; i < want && budget > 0; i++) {
                budget--;
                const spot = this.findEnemySpawn(player);
                if (spot) {
                    this.spawnEnemyAt(spot.x, spot.y, now);
                }
            }
        }

        if (!this.nextBossAt) {
            this.nextBossAt = now + WORLD.bossEveryMs / 2;
        }
        if (now >= this.nextBossAt) {
            this.nextBossAt = now + WORLD.bossEveryMs;
            const hasBoss = [...this.enemies.values()].some(el => el.type === "boss");
            const spot = this.findBossSpot();
            if (!hasBoss && spot) {
                this.createEnemy("boss", spot.x, spot.y, now);
                const place = this.settlementAt(spot.x, spot.y);
                this.emit("announce", `Появился Владыка${place ? `: ${place.name}` : " в мёртвых землях"}. С него падает лучшее оружие.`);
            }
        }
    }

    /** Мёртвые земли, но не ядовитый воздух: туда можно дойти без противогаза. */
    private findBossSpot():Coords | null {
        for (let i = 0; i < 300; i++) {
            const x = 300 + Math.random() * (WORLD.size - 600);
            const y = 300 + Math.random() * (WORLD.size - 600);
            const zone = this.zoneAt(x, y);
            if (zone > ZONES.danger + 0.03 && zone < ZONES.toxic - 0.03 && !this.isBlocked(x, y, 70)) {
                return { x, y };
            }
        }
        return null;
    }

    private findEnemySpawn(anchor:Player):Coords | null {
        for (let attempt = 0; attempt < 10; attempt++) {
            // За краем экрана игрока, но в пределах его области
            const angle = Math.random() * Math.PI * 2;
            const dist = SPAWN_MIN_DIST + Math.random() * (WORLD.enemyAreaRadius - SPAWN_MIN_DIST);
            const x = anchor.x + Math.cos(angle) * dist;
            const y = anchor.y + Math.sin(angle) * dist;
            if (x < 40 || y < 40 || x > WORLD.size - 40 || y > WORLD.size - 40) {
                continue;
            }
            // В безопасной зоне почти пусто: точка с низкой опасностью часто отбраковывается
            const zone = this.zoneAt(x, y);
            if (Math.random() > 0.15 + zone) {
                continue;
            }
            if (this.isNearAnyPlayer(x, y, SPAWN_MIN_DIST - 50) || this.isBlocked(x, y, 40)) {
                continue;
            }
            return { x, y };
        }
        return null;
    }

    private spawnEnemyAt(x:number, y:number, now:number) {
        const zone = this.zoneAt(x, y);
        const urban = !!this.settlementAt(x, y);
        const pool = Object.values(ENEMIES).filter(el => el.weight > 0 && zone >= el.zoneMin && zone <= el.zoneMax);
        if (!pool.length) {
            return;
        }
        const weightOf = (cfg:typeof pool[number]) => cfg.weight * (urban ? cfg.urban || 1 : 1);
        const total = pool.reduce((sum, el) => sum + weightOf(el), 0);
        let roll = Math.random() * total;
        let chosen = pool[0];
        for (const cfg of pool) {
            roll -= weightOf(cfg);
            if (roll <= 0) {
                chosen = cfg;
                break;
            }
        }
        this.createEnemy(chosen.id, x, y, now);
    }

    createEnemy(type:string, x:number, y:number, now = Date.now()) {
        const cfg = ENEMIES[type];
        const id = this.nextId++;
        const enemy:Enemy = {
            id, type, cfg, x, y,
            rotation: Math.random() * Math.PI * 2,
            hp: cfg.health, maxHp: cfg.health,
            speed: cfg.speed + Math.random() * cfg.speedJitter,
            flankBias: (Math.random() - 0.5) * 1.2,
            wanderAt: 0, thinkAt: 0, targetId: 0,
            nextAttackAt: 0, nextShotAt: now + Math.random() * 1000,
            lastSeenPlayerAt: now, moving: false,
            nextSummonAt: now + 2000, nextChargeAt: now + 1500, chargeUntil: 0, revealedUntil: 0, summonedBy: 0
        };
        this.enemies.set(id, enemy);
        return enemy;
    }

    private scheduleNextChest(now:number, first = false) {
        const delay = first
            ? WORLD.chestFirstDelayMs
            : WORLD.chestMinIntervalMs + Math.random() * (WORLD.chestMaxIntervalMs - WORLD.chestMinIntervalMs);
        this.nextChestAt = now + delay;
    }

    private findChestSpot():Coords | null {
        const margin = 250;
        for (let attempt = 0; attempt < 80; attempt++) {
            const x = margin + Math.random() * (WORLD.size - margin * 2);
            const y = margin + Math.random() * (WORLD.size - margin * 2);
            if (this.isBlocked(x, y, 60)) {
                continue;
            }
            let tooClose = false;
            for (const chest of this.chests.values()) {
                if (distSq(x, y, chest.x, chest.y) < 900 * 900) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) {
                return { x, y };
            }
        }
        return null;
    }

    createChest(x:number, y:number, opensAt = Date.now() + WORLD.chestCountdownMs) {
        const id = this.nextId++;
        const chest:Chest = { id, x, y, opensAt };
        this.chests.set(id, chest);
        return chest;
    }

    private updateChests(now:number) {
        if (!this.nextChestAt) {
            this.scheduleNextChest(now, true);
        }
        if (now >= this.nextChestAt && this.chests.size < WORLD.maxChests) {
            const spot = this.findChestSpot();
            if (spot) {
                this.createChest(spot.x, spot.y, now + WORLD.chestCountdownMs);
                this.emit("announce", "На карте появился сундук. Он откроется через 60 секунд.");
            }
            this.scheduleNextChest(now);
        }

        for (const chest of [...this.chests.values()]) {
            if (now >= chest.opensAt) {
                this.openChest(chest, now);
            }
        }
    }

    private openChest(chest:Chest, now:number) {
        this.chests.delete(chest.id);
        const roll = Math.random();
        let rewardName:string;
        if (roll < 0.65) {
            const weaponId = rollWeapon(3);
            this.dropWeapon(weaponId, chest.x, chest.y, WORLD.chestRewardLifetimeMs);
            rewardName = WEAPONS[weaponId].name;
        } else if (roll < 0.88) {
            const perk = POSITIVE_PERKS[Math.floor(Math.random() * POSITIVE_PERKS.length)];
            this.dropPerk(perk.id, chest.x, chest.y, WORLD.chestRewardLifetimeMs);
            rewardName = perk.name;
        } else {
            const id = this.nextId++;
            this.pickups.set(id, {
                id, kind: "medkit", x: chest.x, y: chest.y,
                expiresAt: now + WORLD.chestRewardLifetimeMs
            });
            rewardName = "большая аптечка";
        }
        this.addFx(["chest", chest.x, chest.y]);
        this.emit("announce", `Сундук открылся: ${rewardName}. Награда исчезнет через 3 минуты.`);
    }

    private updatePickups(now:number) {
        for (const item of this.pickups.values()) {
            if (now >= item.expiresAt) {
                this.pickups.delete(item.id);
                continue;
            }
            if (item.kind === "item" && item.itemId) {
                for (const player of this.players.values()) {
                    if (!player.dead && distSq(item.x, item.y, player.x, player.y) < WORLD.pickupRadius * WORLD.pickupRadius) {
                        const left = this.addItem(player, item.itemId, item.count || 1);
                        if (left < (item.count || 1)) {
                            this.addFx(["loot", player.x, player.y, (item.count || 1) - left]);
                        }
                        if (left > 0) {
                            item.count = left;
                        } else {
                            this.pickups.delete(item.id);
                        }
                        break;
                    }
                }
            } else if (item.kind === "medkit") {
                for (const player of this.players.values()) {
                    if (!player.dead && player.hp < player.stats.maxHp
                        && distSq(item.x, item.y, player.x, player.y) < WORLD.pickupRadius * WORLD.pickupRadius) {
                        player.hp = Math.min(player.stats.maxHp, player.hp + WORLD.medkitHeal);
                        this.pickups.delete(item.id);
                        this.addFx(["heal", player.x, player.y]);
                        break;
                    }
                }
            } else if (item.kind === "perk" && item.perkId) {
                const perk = getPerk(item.perkId);
                if (!perk) {
                    this.pickups.delete(item.id);
                    continue;
                }
                for (const player of this.players.values()) {
                    if (!player.dead && !player.perks.has(perk.id)
                        && distSq(item.x, item.y, player.x, player.y) < WORLD.pickupRadius * WORLD.pickupRadius) {
                        this.applyPerk(player, perk);
                        this.pickups.delete(item.id);
                        this.addFx(["perk", player.x, player.y]);
                        this.emit("announce", `${player.name} нашёл перк «${perk.name}» в сундуке.`);
                        break;
                    }
                }
            }
        }
    }

    private addFx(fx:Fx) {
        this.fxByCell.insert({ x: fx[1], y: fx[2], fx });
    }

    // ---------- Данные для клиентов ----------

    buildSnapshot(me:Player) {
        const now = Date.now();
        const halfW = WORLD.viewHalfWidth;
        const halfH = WORLD.viewHalfHeight;
        const inView = (x:number, y:number) => Math.abs(x - me.x) < halfW && Math.abs(y - me.y) < halfH;
        const radius = Math.hypot(halfW, halfH);

        const players:any[] = [];
        for (const other of this.players.values()) {
            if (other !== me && !other.dead && inView(other.x, other.y)) {
                players.push([
                    other.id, Math.round(other.x), Math.round(other.y), Number(other.rotation.toFixed(2)),
                    Math.round(other.hp), Math.round(other.stats.maxHp), other.weaponId,
                    now < other.protectedUntil ? 1 : 0
                ]);
            }
        }

        const enemies:any[] = [];
        this.enemyGrid.query(me.x, me.y, radius, (enemy) => {
            if (enemy.hp > 0 && this.enemies.has(enemy.id) && inView(enemy.x, enemy.y)) {
                // Невидимку видно, только если он рядом или недавно ранен
                const hidden = !!enemy.cfg.stealth && now > enemy.revealedUntil;
                enemies.push([
                    enemy.id, enemy.type, Math.round(enemy.x), Math.round(enemy.y),
                    Number(enemy.rotation.toFixed(2)), Math.round(enemy.hp), enemy.maxHp,
                    (enemy.moving ? 1 : 0) | (hidden ? 2 : 0) | (now < enemy.chargeUntil ? 4 : 0)
                ]);
            }
        });

        const pickups:any[] = [];
        for (const item of this.pickups.values()) {
            if (inView(item.x, item.y)) {
                pickups.push([
                    item.id, item.kind, item.weaponId || item.perkId || item.itemId || item.owner || "",
                    Math.round(item.x), Math.round(item.y), Math.max(0, item.expiresAt - now), item.count || 0
                ]);
            }
        }

        const chests:any[] = [];
        for (const chest of this.chests.values()) {
            if (inView(chest.x, chest.y)) {
                chests.push([
                    chest.id, Math.round(chest.x), Math.round(chest.y),
                    Math.max(0, chest.opensAt - now)
                ]);
            }
        }

        const bullets:any[] = [];
        this.newBullets.query(me.x, me.y, radius, (el) => bullets.push(el.data));

        const fx:any[] = [];
        this.fxByCell.query(me.x, me.y, radius, (el) => {
            fx.push(el.fx.map(val => typeof val === "number" ? Math.round(val) : val));
        });

        const curLevelExp = totalExpForLevel(me.level);
        const nextLevelExp = totalExpForLevel(me.level + 1);
        const offer = me.offers[0];
        const weapon = this.weaponOf(me);

        return {
            t: now,
            me: {
                x: Math.round(me.x * 10) / 10,
                y: Math.round(me.y * 10) / 10,
                hp: Math.round(me.hp),
                maxHp: Math.round(me.stats.maxHp),
                dead: me.dead,
                canRespawn: me.dead && now - me.deadAt >= WORLD.respawnDelayMs,
                exp: Math.floor(me.exp),
                level: me.level,
                levelProgress: clamp((me.exp - curLevelExp) / (nextLevelExp - curLevelExp), 0, 1),
                kills: me.kills,
                weapon: me.weaponId,
                ammo: me.ammo,
                clip: this.clipOf(me),
                reloadLeft: me.reloadEndsAt ? Math.max(0, me.reloadEndsAt - now) : 0,
                reloadTotal: weapon.reloadTime * 1000 / me.stats.reload,
                speed: Math.round(this.speedOf(me) * 10) / 10,
                fireInterval: weapon.fireRate / me.stats.fireRate,
                spread: Number((me.spreadNow * me.stats.spread).toFixed(3)),
                teamId: me.teamId,
                prot: now < me.protectedUntil,
                offersLeft: me.offers.length,
                offer: offer ? offer.map(el => ({
                    id: el.id, name: el.name, description: el.description, rarity: el.rarity,
                    category: el.category, icon: el.icon || ""
                })) : null,
                perks: [...me.perks],
                inv: me.inventory,
                armor: me.armorId,
                mask: me.maskId,
                zone: Math.round(me.zone * 1000) / 1000,
                toxic: me.toxicDamage > 0,
                place: this.settlementAt(me.x, me.y)?.name || ""
            },
            p: players,
            e: enemies,
            k: pickups,
            c: chests,
            b: bullets,
            fx
        };
    }

    /**
     * Сводка раз в секунду: рейтинг, команды, метки на миникарте.
     */
    buildRoster() {
        const all = [...this.players.values()];
        const rows = all
            .map(el => ({
                id: el.id,
                name: el.name,
                exp: Math.floor(el.exp),
                level: el.level,
                kills: el.kills,
                weapon: el.weaponId,
                teamId: el.teamId,
                dead: el.dead
            }))
            .sort((a, b) => b.exp - a.exp);
        const teams = [...this.teams.values()].map(el => ({
            id: el.id, name: el.name, members: [...el.members]
        }));
        const exposed = all.filter(el => el.stats.exposed > 0 && !el.dead)
            .map(el => [el.id, Math.round(el.x), Math.round(el.y)]);
        const bosses = [...this.enemies.values()].filter(el => el.type === "boss")
            .map(el => [Math.round(el.x), Math.round(el.y)]);
        const now = Date.now();
        const chests = [...this.chests.values()].map(el => [
            Math.round(el.x), Math.round(el.y), Math.max(0, el.opensAt - now)
        ]);
        return { rows, teams, exposed, bosses, chests };
    }

    getTeammatePositions(player:Player) {
        const team = this.teams.get(player.teamId);
        if (!team) {
            return [];
        }
        return [...team.members]
            .filter(id => id !== player.id)
            .map(id => this.players.get(id))
            .filter((el):el is Player => !!el && !el.dead)
            .map(el => [el.id, Math.round(el.x), Math.round(el.y)]);
    }

    allPlayers() {
        return this.players.values();
    }

    getPerkById(id:string) {
        return getPerk(id);
    }
}

// Сумма опыта, нужная для достижения уровня
const totalExpCache:number[] = [0, 0];
function totalExpForLevel(level:number):number {
    for (let i = totalExpCache.length; i <= level; i++) {
        totalExpCache[i] = totalExpCache[i - 1] + expForLevel(i - 1);
    }
    return totalExpCache[level];
}

function sanitizeName(raw:unknown, id:number):string {
    const cleaned = typeof raw === "string"
        ? raw.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯]/g, "").trim().slice(0, 16)
        : "";
    return cleaned || `Игрок ${id}`;
}
