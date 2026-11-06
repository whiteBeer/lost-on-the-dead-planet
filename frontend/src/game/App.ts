import * as PIXI from "pixi.js";
import { io, Socket } from "socket.io-client";
import { Assets } from "./Assets";
import { Control } from "./Control";
import { ChestView, EnemyView, PickupView, PlayerView } from "./Views";
import { Effects } from "./Effects";
import { FeedEvent, HudState, Invite, MeState, Roster, Snapshot, WorldConfig } from "./Types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || undefined;
const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";
const PICKUP_REACH = 60;

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
    private chests = new Map<number, ChestView>();
    private effects:Effects | null = null;
    private mine:PlayerView | null = null;

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

    async init() {
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

        this.control = new Control(this.pixi.canvas, code => this.onKey(code));

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
        const ground = new PIXI.TilingSprite({
            texture: Assets.tex("ground"), width: config.size, height: config.size
        });
        this.layerGround.addChild(ground);

        // Ближе к центру земля мертвее: там сильнее монстры и лучше добыча
        const dead = new PIXI.TilingSprite({
            texture: Assets.tex("ground_dead"), width: config.size, height: config.size
        });
        const mask = new PIXI.Graphics();
        mask.circle(config.size / 2, config.size / 2, config.size * 0.2).fill(0xffffff);
        dead.mask = mask;
        this.layerGround.addChild(dead, mask);

        const border = new PIXI.Graphics();
        border.rect(0, 0, config.size, config.size).stroke({ width: 10, color: 0x000000, alpha: 0.7 });
        this.layerGround.addChild(border);

        for (const [kind, x, y, radius, rotation] of config.obstacles) {
            const sprite = new PIXI.Sprite(Assets.tex(`obstacle_${kind}`));
            sprite.anchor.set(0.5);
            // Крона дерева шире ствола: за ней можно спрятаться
            const visual = radius * (kind === "tree" ? 3.1 : 2.3);
            const base = Math.max(sprite.texture.width, sprite.texture.height);
            sprite.scale.set(visual / base);
            sprite.position.set(x, y);
            sprite.rotation = rotation;
            (kind === "tree" ? this.layerTop : this.layerItems).addChild(sprite);
        }
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
            view.setTarget(x, y, rotation, moving === 1);
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
        for (const [id, kind, itemId, x, y] of snapshot.k) {
            seen.add(id);
            if (!this.pickups.has(id)) {
                const view = new PickupView(kind, itemId, x, y, this.config!.weapons[itemId]?.rarity);
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
                this.layerItems.addChild(view.root);
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

        if (this.mine) {
            this.mine.teleport(this.x, this.y, this.rotation);
            const move = this.control.moveVector();
            this.mine.setMoving((move.x !== 0 || move.y !== 0) && !!me && !me.dead);
        }

        this.players.forEach(view => view.update(dt));
        this.enemies.forEach(view => view.update(dt));
        this.pickups.forEach(view => view.update(dt));
        this.chests.forEach(view => view.update(dt));
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
        let x = this.x + dx * me.speed * dt;
        let y = this.y + dy * me.speed * dt;

        // Те же столкновения, что и на сервере, иначе персонаж дёргался бы у препятствий
        const radius = this.config!.playerRadius;
        for (const [, ox, oy, oRadius] of this.config!.obstacles) {
            const distX = x - ox;
            const distY = y - oy;
            const min = oRadius + radius;
            if (Math.abs(distX) < min && Math.abs(distY) < min) {
                const dist = Math.hypot(distX, distY);
                if (dist < min && dist > 0.001) {
                    x = ox + distX / dist * min;
                    y = oy + distY / dist * min;
                }
            }
        }
        const size = this.config!.size;
        this.x = Math.max(radius, Math.min(size - radius, x));
        this.y = Math.max(radius, Math.min(size - radius, y));
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
            f: this.control.isFiring && !this.meState.dead
        });
    }

    private onKey(code:string) {
        const me = this.meState;
        if (code === "KeyR") {
            this.socket?.emit("reload");
        } else if (code === "KeyE") {
            this.socket?.emit("pickup");
        } else if (code === "Digit1" || code === "Digit2" || code === "Digit3") {
            this.pickPerk(Number(code.slice(5)) - 1);
        } else if (code === "Enter" || code === "Space") {
            if (me?.dead) {
                this.respawn();
            }
        } else if (code === "KeyY" && this.invites.length) {
            this.acceptInvite(this.invites[0].fromId);
        } else if (code === "KeyN" && this.invites.length) {
            this.declineInvite(this.invites[0].fromId);
        } else {
            this.onUiKey(code);
        }
    }

    private nearPickupName() {
        const me = this.meState;
        if (!me || me.dead) {
            return "";
        }
        let best = "";
        let bestDist = PICKUP_REACH;
        this.pickups.forEach((view) => {
            if (view.kind === "weapon") {
                const dist = Math.hypot(view.x - this.x, view.y - this.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = view.weaponId;
                }
            }
        });
        return best;
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
            perkCatalog: this.config?.perks || {}
        });
    }

    // Действия интерфейса

    reload() {
        this.socket?.emit("reload");
    }

    pickup() {
        this.socket?.emit("pickup");
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
