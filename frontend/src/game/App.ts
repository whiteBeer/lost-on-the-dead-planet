import * as PIXI from "pixi.js";
import { io, Socket } from "socket.io-client";
import { Assets } from "./Assets";
import { Control } from "./Control";
import { ChestView, EnemyView, PickupView, PlayerView } from "./Views";
import { Sound } from "./Sound";
import { Effects } from "./Effects";
import { WorldMap } from "./WorldMap";
import { FeedEvent, HudState, Invite, MeState, Roster, Snapshot, WorldConfig } from "./Types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || undefined;
const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";
const PICKUP_REACH = 60;
const CHEST_REACH = 90;
const SHELF_REACH = 62;
const TRADER_NEAR = 115;
const SPRINT_MUL = 1.45;
const DASH_MUL = 3.4;
const DASH_MS = 220;

export class App {
    private pixi = new PIXI.Application();
    private socket:Socket | null = null;
    private control:Control | null = null;
    private config:WorldConfig | null = null;

    private world = new PIXI.Container();
    private layerGround = new PIXI.Container();
    private layerItems = new PIXI.Container();
    private layerUnits = new PIXI.Container();
    private layerBullets = new PIXI.Container();
    private layerTop = new PIXI.Container();
    private layerFx = new PIXI.Container();
    private crosshair = new PIXI.Graphics();

    private players = new Map<number, PlayerView>();
    private enemies = new Map<number, EnemyView>();
    private pickups = new Map<number, PickupView>();
    private nearPickupId = -1;
    private chests = new Map<number, ChestView>();
    readonly sound = new Sound();
    private reticle = new PIXI.Graphics();
    private dashUntil = 0;
    private dashReadyAt = 0;
    private toasts:{ key:number, text:string, id:string, until:number }[] = [];
    private toastKey = 0;
    private lastHint = "";
    private effects:Effects | null = null;
    private mine:PlayerView | null = null;
    private map:WorldMap | null = null;

    private myId = 0;
    private x = 0;
    private y = 0;
    private rotation = 0;
    private meState:MeState | null = null;
    private nameById = new Map<number, string>();
    private teamById = new Map<number, number>();

    private roster:Roster | null = null;
    private feed:(FeedEvent & { key:number })[] = [];
    private feedKey = 0;
    private invites:Invite[] = [];
    private announce = "";
    private announceUntil = 0;
    private connected = false;
    private worldFull = false;
    private lastHudAt = 0;
    private inputTimer:ReturnType<typeof setInterval> | null = null;
    private destroyed = false;
    private initialized = false;

    constructor(
        private readonly $el:HTMLElement,
        private readonly name:string,
        private readonly onHud:(hud:HudState) => void,
        private readonly onUiKey:(code:string) => void
    ) {}

    /** Только для автотестов (адрес с ?bot): состояние игры для бета-тестеров-ботов. */
    botState() {
        return {
            me: this.meState, x: this.x, y: this.y, near: this.nearPickupName(),
            screen: { w: this.pixi.screen.width, h: this.pixi.screen.height, scale: this.world.scale.x },
            enemies: [...this.enemies.values()].map(v => ({ type: v.type, x: v.x, y: v.y })),
            pickups: [...this.pickups.values()].map(v => ({ kind: v.kind, id: v.weaponId, x: v.x, y: v.y })),
            shelves: (this.map?.shelves || []).filter(el => el.alive && Math.hypot(el.x - this.x, el.y - this.y) < 900).map(el => ({ x: el.x, y: el.y })),
            trees: [...(this.map?.obstacles.values() || [])].filter(el => el.alive && (el.kind === "tree" || el.kind === "rock")
                && Math.hypot(el.x - this.x, el.y - this.y) < 700).map(el => ({ kind: el.kind, x: el.x, y: el.y, r: el.r }))
        };
    }

    async init() {
        if (typeof location !== "undefined" && location.search.includes("bot")) {
            (window as unknown as { __lpt:App }).__lpt = this;
        }
        await this.pixi.init({
            background: "#10130f",
            resizeTo: window,
            antialias: true,
            // На телефонах с плотным экраном иначе картинка мылится. Больше 2 не даёт заметной разницы
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true
        });
        if (this.destroyed) {
            this.pixi.destroy(true, { children: true });
            return;
        }
        await Assets.load();
        this.initialized = true;
        this.$el.appendChild(this.pixi.canvas);
        this.pixi.canvas.style.cursor = "none";

        this.world.addChild(
            this.layerGround, this.layerItems, this.layerUnits,
            this.layerBullets, this.layerTop, this.layerFx
        );
        this.pixi.stage.addChild(this.world, this.crosshair);
        this.effects = new Effects(this.layerBullets, this.layerFx);

        this.control = new Control(this.pixi.canvas, (code, mod) => this.onKey(code, mod));

        this.socket = io(BACKEND, {
            path: SOCKET_PATH,
            auth: { name: this.name },
            transports: ["websocket", "polling"],
            reconnection: false
        });
        this.bindSocket(this.socket);
        this.pixi.ticker.add(this.frame, this);
        this.inputTimer = setInterval(() => this.sendInput(), 50);
    }

    private bindSocket(socket:Socket) {
        socket.on("connect", () => {
            this.connected = true;
            this.pushHud(true);
        });
        socket.on("disconnect", () => {
            this.connected = false;
            this.pushHud(true);
        });
        socket.on("connect_error", () => {
            this.connected = false;
            this.pushHud(true);
        });
        socket.on("worldFull", () => {
            this.worldFull = true;
            this.pushHud(true);
        });
        socket.on("welcome", (data:{ id:number, world:WorldConfig }) => {
            this.myId = data.id;
            this.config = data.world;
            this.buildMap(data.world);
        });
        socket.on("obs", (changes:[number, number][]) => {
            changes.forEach(([id, alive]) => this.map?.setAlive(id, alive === 1));
        });
        socket.on("s", (snapshot:Snapshot) => this.applySnapshot(snapshot));
        socket.on("roster", (roster:Roster) => {
            this.roster = roster;
            roster.rows.forEach((row) => {
                this.nameById.set(row.id, row.name);
                this.teamById.set(row.id, row.teamId);
            });
        });
        socket.on("feed", (event:FeedEvent) => {
            this.feed = [...this.feed.slice(-4), { ...event, key: ++this.feedKey }];
            const key = this.feedKey;
            setTimeout(() => {
                this.feed = this.feed.filter(el => el.key !== key);
            }, 6000);
        });
        socket.on("announce", (text:string) => {
            this.announce = text;
            this.announceUntil = Date.now() + 7000;
        });
        socket.on("teamInvited", (invite:Invite) => {
            this.invites = [...this.invites.filter(el => el.fromId !== invite.fromId), invite];
            setTimeout(() => {
                this.invites = this.invites.filter(el => el.fromId !== invite.fromId);
            }, 30000);
        });
    }

    private buildMap(config:WorldConfig) {
        this.map = new WorldMap(config, this.layerGround, this.layerItems, this.layerTop);
    }

    private applySnapshot(snapshot:Snapshot) {
        if (!this.config) {
            return;
        }
        const me = snapshot.me;
        const wasDead = this.meState?.dead;
        this.meState = me;

        // Свой персонаж движется на клиенте сразу. Сервер исправляет его, только если разница велика
        const drift = Math.hypot(me.x - this.x, me.y - this.y);
        if (drift > 140 || wasDead !== me.dead || this.mine === null) {
            this.x = me.x;
            this.y = me.y;
        }

        this.syncMine(me);
        this.syncPlayers(snapshot);
        this.syncEnemies(snapshot);
        this.syncPickups(snapshot);
        this.syncChests(snapshot);
        this.effects?.spawnBullets(snapshot.b);
        this.effects?.applyFx(snapshot.fx, this.config);
        this.sound.fromSnapshot(snapshot, this.x, this.y);
        if (me.hint && me.hint !== this.lastHint && me.hint.startsWith("Нет патронов")) {
            this.sound.play("empty", this.x, this.y, this.x, this.y);
        }
        this.lastHint = me.hint;
        for (const [id, n] of me.got || []) {
            const name = id.startsWith("w:") ? this.config?.weapons[id.slice(2)]?.name : this.config?.items[id]?.name;
            this.toasts.push({ key: ++this.toastKey, id, text: `+${n > 1 ? n + " " : ""}${name || id}`, until: Date.now() + 3200 });
        }
        if (this.toasts.length > 5) {
            this.toasts.splice(0, this.toasts.length - 5);
        }
    }

    private syncMine(me:MeState) {
        if (!this.mine) {
            this.mine = new PlayerView(this.name || "Ты", "me", this.config!.playerRadius);
            this.layerUnits.addChild(this.mine.root);
        }
        this.mine.root.visible = !me.dead;
        this.mine.setHealth(me.hp, me.maxHp);
        this.mine.setProtected(me.prot);
    }

    private relationOf(id:number):"ally" | "enemy" {
        const mine = this.meState?.teamId;
        return mine && this.teamById.get(id) === mine ? "ally" : "enemy";
    }

    private syncPlayers(snapshot:Snapshot) {
        const seen = new Set<number>();
        for (const [id, x, y, rotation, hp, maxHp, , prot] of snapshot.p) {
            seen.add(id);
            let view = this.players.get(id);
            if (!view) {
                view = new PlayerView(this.nameById.get(id) || "...", this.relationOf(id), this.config!.playerRadius);
                view.teleport(x, y, rotation);
                this.players.set(id, view);
                this.layerUnits.addChild(view.root);
            }
            view.setTarget(x, y, rotation);
            view.setHealth(hp, maxHp);
            view.setProtected(prot === 1);
            view.setIdentity(this.nameById.get(id) || "...", this.relationOf(id));
        }
        for (const [id, view] of this.players) {
            if (!seen.has(id)) {
                view.destroy();
                this.players.delete(id);
            }
        }
    }

    private syncEnemies(snapshot:Snapshot) {
        const seen = new Set<number>();
        for (const [id, type, x, y, rotation, hp, maxHp, moving] of snapshot.e) {
            seen.add(id);
            let view = this.enemies.get(id);
            if (!view) {
                view = new EnemyView(type, this.config!.enemies[type]?.size || 70);
                view.teleport(x, y, rotation);
                this.enemies.set(id, view);
                this.layerUnits.addChild(view.root);
            }
            view.setTarget(x, y, rotation, moving);
            view.setHealth(hp, maxHp);
        }
        for (const [id, view] of this.enemies) {
            if (!seen.has(id)) {
                view.destroy();
                this.enemies.delete(id);
            }
        }
    }

    private syncPickups(snapshot:Snapshot) {
        const seen = new Set<number>();
        for (const [id, kind, itemId, x, y, , count] of snapshot.k) {
            seen.add(id);
            const old = this.pickups.get(id);
            // Если часть предметов забрали, перерисовываем с новым количеством
            if (old && old.count !== count) {
                old.destroy();
                this.pickups.delete(id);
            }
            if (!this.pickups.has(id)) {
                const view = new PickupView(kind, itemId, x, y, this.config!.weapons[itemId]?.rarity, count);
                this.pickups.set(id, view);
                this.layerItems.addChild(view.root);
            }
        }
        for (const [id, view] of this.pickups) {
            if (!seen.has(id)) {
                view.destroy();
                this.pickups.delete(id);
            }
        }
    }

    private syncChests(snapshot:Snapshot) {
        const seen = new Set<number>();
        for (const [id, x, y, opensInMs] of snapshot.c || []) {
            seen.add(id);
            let view = this.chests.get(id);
            if (!view) {
                view = new ChestView(x, y, opensInMs);
                this.chests.set(id, view);
                // Парашют летит над крышами и деревьями
                this.layerTop.addChild(view.root);
            } else {
                view.setRemaining(opensInMs);
            }
        }
        for (const [id, view] of this.chests) {
            if (!seen.has(id)) {
                view.destroy();
                this.chests.delete(id);
            }
        }
    }

    private frame(ticker:PIXI.Ticker) {
        if (!this.config || !this.control) {
            return;
        }
        // deltaMS у Pixi ограничен при низком FPS: персонаж замедлился бы и разошёлся с сервером
        const dt = Math.min(0.25, ticker.elapsedMS / 1000);
        const me = this.meState;

        if (me && !me.dead) {
            this.moveSelf(me, dt);
        }

        const mouse = this.control.mouse;
        const cx = this.pixi.screen.width / 2;
        const cy = this.pixi.screen.height / 2;
        if (this.control.isTouch) {
            this.rotation = this.control.aimAngle ?? this.rotation;
        } else {
            this.rotation = Math.atan2(mouse.y - cy, mouse.x - cx);
        }

        this.drawReticle(me);

        if (this.mine) {
            this.mine.teleport(this.x, this.y, this.rotation);
            const move = this.control.moveVector();
            this.mine.setMoving((move.x !== 0 || move.y !== 0) && !!me && !me.dead);
        }

        this.players.forEach(view => view.update(dt));
        this.enemies.forEach(view => view.update(dt));
        this.pickups.forEach(view => view.update(dt));
        this.chests.forEach(view => view.update(dt));
        this.map?.updateRoofs(this.x, this.y, dt);
        this.sound.ambient(this.enemies.size, dt);
        this.effects?.update(dt);

        this.updateCamera();
        this.drawCrosshair(mouse, me);
        this.pushHud();
    }

    private moveSelf(me:MeState, dt:number) {
        const { x: dx, y: dy } = this.control!.moveVector();
        if (dx === 0 && dy === 0) {
            return;
        }
        // Бег и рывок: те же множители, что на сервере
        const dashing = performance.now() < this.dashUntil;
        const aiming = this.control!.aimDown;
        const sprint = this.control!.sprinting && me.stamina > 0 && !aiming;
        const speed = me.speed * (dashing ? DASH_MUL : sprint ? SPRINT_MUL : 1) * (aiming && !dashing ? 0.7 : 1);
        // Те же столкновения, что и на сервере, иначе персонаж дёргался бы у препятствий
        const moved = this.map!.resolve(this.x + dx * speed * dt, this.y + dy * speed * dt, this.config!.playerRadius);
        this.x = moved.x;
        this.y = moved.y;
    }

    /** Прицеливание правой кнопкой: кружок, в пределах которого полетят пули. */
    private drawReticle(me:MeState | null) {
        const g = this.reticle;
        if (!g.parent) {
            this.layerFx.addChild(g);
        }
        g.clear();
        const weapon = me ? this.config?.weapons[me.weapon] : undefined;
        if (!me || me.dead || !this.control?.aimDown || this.control.isTouch || !weapon || weapon.melee) {
            return;
        }
        const scale = this.world.scale.x || 1;
        const mouse = this.control.mouse;
        const wx = this.x + (mouse.x - this.pixi.screen.width / 2) / scale;
        const wy = this.y + (mouse.y - this.pixi.screen.height / 2) / scale;
        const dist = Math.hypot(wx - this.x, wy - this.y);
        const radius = Math.max(6, dist * Math.tan(me.spread * 0.5)) + 2;
        g.circle(wx, wy, radius).stroke({ width: 2 / scale + 1, color: 0xffffff, alpha: 0.85 });
        g.circle(wx, wy, 2).fill({ color: 0xff5a3a });
        g.moveTo(wx - radius - 6, wy).lineTo(wx - radius + 3, wy).moveTo(wx + radius - 3, wy).lineTo(wx + radius + 6, wy)
            .moveTo(wx, wy - radius - 6).lineTo(wx, wy - radius + 3).moveTo(wx, wy + radius - 3).lineTo(wx, wy + radius + 6)
            .stroke({ width: 2, color: 0xffffff, alpha: 0.85 });
    }

    private updateCamera() {
        const config = this.config!;
        const { width, height } = this.pixi.screen;
        // Обзор одинаков для всех: широкий монитор не даёт преимущества в перестрелке
        // На телефоне в портретном режиме обзор поворачивается вместе с экраном
        const portrait = height > width;
        const viewW = portrait ? config.viewHeight : config.viewWidth;
        const viewH = portrait ? config.viewWidth : config.viewHeight;
        const scale = Math.max(width / viewW, height / viewH);
        this.world.scale.set(scale);
        this.world.position.set(width / 2 - this.x * scale, height / 2 - this.y * scale);
        const halfW = width / 2 / scale;
        const halfH = height / 2 / scale;
        this.map?.updateVisibility(this.x - halfW, this.y - halfH, this.x + halfW, this.y + halfH);
    }

    private drawCrosshair(mouse:{ x:number, y:number }, me:MeState | null) {
        const g = this.crosshair;
        g.clear();
        if (!me || me.dead) {
            return;
        }
        const cx = this.pixi.screen.width / 2;
        const cy = this.pixi.screen.height / 2;
        if (this.control?.isTouch) {
            this.drawTouchControls(cx, cy);
            return;
        }
        const distance = Math.hypot(mouse.x - cx, mouse.y - cy);
        const radius = Math.max(9, distance * Math.tan(Math.min(0.6, me.spread)));
        g.circle(mouse.x, mouse.y, radius).stroke({ color: 0xffffff, width: 1.5, alpha: 0.75 });
        g.moveTo(mouse.x - 5, mouse.y).lineTo(mouse.x + 5, mouse.y)
            .moveTo(mouse.x, mouse.y - 5).lineTo(mouse.x, mouse.y + 5)
            .stroke({ color: 0xffffff, width: 1.5, alpha: 0.9 });
    }

    private drawTouchControls(cx:number, cy:number) {
        const g = this.crosshair;
        const control = this.control!;
        for (const stick of control.sticks()) {
            g.circle(stick.originX, stick.originY, 60).fill({ color: 0xffffff, alpha: 0.08 })
                .stroke({ color: 0xffffff, width: 2, alpha: 0.4 });
            g.circle(stick.x, stick.y, 26).fill({ color: 0xffffff, alpha: 0.35 });
        }
        if (control.aimAngle !== null && control.isFiring) {
            const length = 170;
            g.moveTo(cx + Math.cos(this.rotation) * 30, cy + Math.sin(this.rotation) * 30)
                .lineTo(cx + Math.cos(this.rotation) * length, cy + Math.sin(this.rotation) * length)
                .stroke({ color: 0xffffff, width: 2, alpha: 0.45 });
        }
    }

    private sendInput() {
        if (!this.socket?.connected || !this.meState || !this.control) {
            return;
        }
        this.socket.emit("input", {
            x: Math.round(this.x * 10) / 10,
            y: Math.round(this.y * 10) / 10,
            r: Number(this.rotation.toFixed(3)),
            f: this.control.isFiring && !this.meState.dead,
            s: this.control.sprinting && !this.control.aimDown,
            a: this.control.aimDown
        });
    }

    private onKey(code:string, mod = false) {
        const me = this.meState;
        if (mod && /^Digit[1-3]$/.test(code)) {
            this.pickPerk(Number(code.slice(5)) - 1);
            return;
        }
        if (code === "KeyR") {
            this.socket?.emit("reload");
        } else if (code === "KeyE") {
            if (this.nearPickupName() === "trader") {
                this.onUiKey("OpenTrade");
            } else {
                this.pickup();
            }
        } else if (code === "KeyH") {
            this.socket?.emit("heal");
        } else if (code === "KeyG") {
            this.socket?.emit("grenade");
        } else if (code === "KeyM") {
            this.sound.toggle();
            this.pushHud(true);
        } else if (code === "KeyQ") {
            this.switchSlot("swap");
        } else if (code === "Digit1" || code === "Digit2") {
            this.switchSlot(code === "Digit1" ? "tool" : "gun");
        } else if (code === "KeyF") {
            this.quickUse("food");
        } else if (code === "KeyV") {
            this.quickUse("water");
        } else if (code === "Enter" || code === "Space") {
            if (me?.dead) {
                this.respawn();
            } else if (code === "Space") {
                this.dash();
            }
        } else if (code === "KeyY" && this.invites.length) {
            this.acceptInvite(this.invites[0].fromId);
        } else if (code === "KeyN" && this.invites.length) {
            this.declineInvite(this.invites[0].fromId);
        } else {
            this.onUiKey(code);
        }
    }

    /** Сквозь стены ничего не открываем и не подбираем. */
    private reach(x:number, y:number) {
        return !this.map || this.map.canReach(this.x, this.y, x, y);
    }

    private nearPickupName() {
        const me = this.meState;
        if (!me || me.dead) {
            return "";
        }
        for (const view of this.enemies.values()) {
            if (view.type === "trader" && Math.hypot(view.x - this.x, view.y - this.y) < TRADER_NEAR) {
                return "trader";
            }
        }
        let best = "";
        let bestDist = PICKUP_REACH;
        let chestDist = CHEST_REACH;
        let chest = false;
        let shelfNear = false;
        this.chests.forEach((view) => {
            const dist = Math.hypot(view.x - this.x, view.y - this.y);
            if (view.landed && dist < chestDist && this.reach(view.x, view.y)) {
                chest = true;
                chestDist = dist;
            }
        });
        for (const shelf of this.map?.shelves || []) {
            const dist = Math.hypot(shelf.x - this.x, shelf.y - this.y);
            if (shelf.alive && dist < SHELF_REACH && dist < chestDist && this.reach(shelf.x, shelf.y)) {
                chest = true;
                chestDist = dist;
                shelfNear = true;
            }
        }
        let bestId = -1;
        this.pickups.forEach((view, id) => {
            if (view.kind === "weapon" || view.kind === "bag" || view.kind === "drop") {
                const dist = Math.hypot(view.x - this.x, view.y - this.y);
                if (dist < bestDist && this.reach(view.x, view.y)) {
                    bestDist = dist;
                    bestId = id;
                    best = view.kind === "bag" ? `bag:${view.weaponId}` : view.kind === "drop" ? `item:${view.weaponId}` : view.weaponId;
                }
            }
        });
        this.nearPickupId = bestId;
        return chest && (!best || chestDist <= bestDist) ? (shelfNear ? "shelf" : "chest") : best;
    }

    private pushHud(force = false) {
        const now = performance.now();
        if (!force && now - this.lastHudAt < 150) {
            return;
        }
        this.lastHudAt = now;
        if (this.announce && Date.now() > this.announceUntil) {
            this.announce = "";
        }
        this.onHud({
            connected: this.connected,
            worldFull: this.worldFull,
            myId: this.myId,
            me: this.meState,
            roster: this.roster,
            feed: this.feed,
            invites: this.invites,
            announce: this.announce,
            weapons: this.config?.weapons || {},
            nearPickup: this.nearPickupName(),
            muted: this.sound.muted,
            toasts: this.toasts.filter(el => el.until > Date.now()),
            questCatalog: this.config?.quests || [],
            nearTraderCamp: (() => {
                const camps = this.config?.map.camps || [];
                return camps.findIndex(c => Math.abs(this.x - c.x) <= c.size / 2 && Math.abs(this.y - c.y) <= c.size / 2);
            })(),
            trades: this.config?.trades || [],
            camps: this.config?.map.camps || [],
            perkCatalog: this.config?.perks || {},
            items: this.config?.items || {},
            recipes: this.config?.recipes || [],
            zoneNames: this.config?.map.zoneNames || [],
            zones: this.config?.map.zones || null
        });
    }

    // Действия интерфейса

    reload() {
        this.socket?.emit("reload");
    }

    pickup() {
        const near = this.nearPickupName();
        const kind = near === "chest" || near === "shelf" ? near : near.startsWith("bag:") ? "bag"
            : near.startsWith("item:") ? "item" : near ? "weapon" : "";
        // Сервер берёт именно ту вещь, что подсвечена в подсказке, а не просто ближайшую
        this.socket?.emit("pickup", kind, kind === "chest" || kind === "shelf" ? -1 : this.nearPickupId);
    }

    useSlot(index:number) {
        this.socket?.emit("useSlot", index);
    }

    dropSlot(index:number) {
        this.socket?.emit("dropSlot", index);
    }

    unequip(what:"weapon" | "tool" | "gun" | "armor" | "mask") {
        this.socket?.emit("unequip", what);
    }

    dash() {
        const me = this.meState;
        const now = performance.now();
        if (!me || me.dead || now < this.dashReadyAt || me.stamina < 30) {
            return;
        }
        this.dashUntil = now + DASH_MS;
        this.dashReadyAt = now + 1500;
        this.socket?.emit("dash");
        this.sound.play("swing", this.x, this.y, this.x, this.y, 0.6);
    }

    setSprintToggle(on:boolean) {
        if (this.control) {
            this.control.sprintToggle = on;
        }
    }

    quickUse(what:"food" | "water") {
        this.socket?.emit("quickUse", what);
    }

    moveSlot(from:number, to:number) {
        this.socket?.emit("moveSlot", from, to);
    }

    quest(questId:string, action:"take" | "claim") {
        this.socket?.emit("quest", questId, action);
    }

    trade(tradeId:string) {
        this.socket?.emit("trade", tradeId);
    }

    switchSlot(which:"tool" | "gun" | "swap") {
        this.socket?.emit("slot", which);
    }

    craft(recipeId:string) {
        this.socket?.emit("craft", recipeId);
    }

    heal() {
        this.socket?.emit("heal");
    }

    grenade() {
        this.socket?.emit("grenade");
    }

    getMinimap() {
        return this.map?.minimap || null;
    }

    pickPerk(index:number) {
        if (this.meState?.offer?.[index]) {
            this.socket?.emit("perk", index);
        }
    }

    respawn() {
        this.socket?.emit("respawn");
    }

    invite(targetId:number) {
        this.socket?.emit("teamInvite", targetId);
    }

    acceptInvite(fromId:number) {
        this.socket?.emit("teamAccept", fromId);
        this.invites = this.invites.filter(el => el.fromId !== fromId);
    }

    declineInvite(fromId:number) {
        this.invites = this.invites.filter(el => el.fromId !== fromId);
    }

    leaveTeam() {
        this.socket?.emit("teamLeave");
    }

    getPosition() {
        return { x: this.x, y: this.y, size: this.config?.size || 1 };
    }

    destroy() {
        this.destroyed = true;
        if (this.inputTimer) {
            clearInterval(this.inputTimer);
        }
        this.control?.destroy();
        this.socket?.disconnect();
        if (this.initialized) {
            this.pixi.destroy(true, { children: true });
        }
    }
}
