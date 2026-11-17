import { Weapon } from "./Weapon";
import { PLAYER_CONFIG } from "../../configs/Players";
import { STARTING_WEAPON } from "../../configs/Weapons";
import {
    BASE_STATS,
    AdditionalStats,
    computeStats,
    getPerk,
    rollPerkOffer,
    Perk
} from "../../configs/Perks";
import { expForLevel } from "../../configs/Waves";
import { Scene } from "../Scene";
import { PlayerMoveInput } from "../../types";
import { calcTimedPoint } from "../../utils/geometry";

export class Player {
    public socketId:string;
    public clientId = "";
    public color:string;
    public name = "Игрок";
    public rotation:number;
    public radius:number;

    private startX:number;
    private startY:number;
    /** atan2 вектора бега. К прицелу (rotation) не относится. */
    private moveRotation = 0;
    private moveSpeed = 0;
    private savedMoveSpeed = 0;
    private moveUpdatedAt = new Date().toISOString();

    public health = PLAYER_CONFIG.defaultHealth;
    public maxHealth = PLAYER_CONFIG.defaultHealth;
    public isDead = false;
    public isReady = false;

    public weapon:Weapon;
    public exp = 0;
    public level = 1;
    public perks:string[] = [];
    public additionalStats:AdditionalStats = { ...BASE_STATS };
    public perkOffer:Perk[] = [];

    private scene:Scene | null = null;
    private spawnProtectedUntil = 0;
    /** Доля замедления от укусов, 0…0.5 */
    private biteSlow = 0;
    private sentBiteSlow = 0;

    constructor(socketId:string, color:string, startX:number, startY:number, scene?:Scene) {
        this.socketId = socketId;
        this.color = color;
        this.startX = startX;
        this.startY = startY;
        this.rotation = 0;
        this.radius = PLAYER_CONFIG.radius;
        this.scene = scene || null;

        this.weapon = new Weapon(STARTING_WEAPON);
        this.refreshStats();
        this.health = this.maxHealth;
        this.grantSpawnProtection();
    }

    public setScene(scene:Scene) {
        this.scene = scene;
    }

    /** Живая точка. Столкновения, подбор и снимок читают её, не место нажатия. */
    get pageX() {
        return this.livePoint().x;
    }

    get pageY() {
        return this.livePoint().y;
    }

    set pageX(x:number) {
        this.startX = x;
        this.moveSpeed = 0;
        this.savedMoveSpeed = 0;
        this.moveUpdatedAt = new Date().toISOString();
    }

    set pageY(y:number) {
        this.startY = y;
        this.moveSpeed = 0;
        this.savedMoveSpeed = 0;
        this.moveUpdatedAt = new Date().toISOString();
    }

    /** Новая прямая. Скорость не выше серверной: стик шлёт долю, чит — нет. */
    public applyMove(params:PlayerMoveInput):boolean {
        const x = Number(params.pageX);
        const y = Number(params.pageY);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return false;
        }
        const spot = this.clamp(x, y);
        const cap = Math.max(0, this.getSpeed());
        const requested = Number(params.speedInSecond);
        this.startX = spot.x;
        this.startY = spot.y;
        this.moveSpeed = Number.isFinite(requested) ? Math.max(0, Math.min(cap, requested)) : 0;
        if (Number.isFinite(params.moveRotation)) {
            this.moveRotation = params.moveRotation;
        }
        if (Number.isFinite(params.rotation)) {
            this.rotation = params.rotation;
        }
        this.moveUpdatedAt = new Date().toISOString();
        return true;
    }

    /** Старт прямой, как у монстра. pageX здесь — точка смены клавиш, не живая. */
    public movementSnap() {
        return {
            socketId: this.socketId,
            pageX: this.startX,
            pageY: this.startY,
            moveRotation: this.moveRotation,
            speedInSecond: this.moveSpeed,
            rotation: this.rotation,
            updatedAt: this.moveUpdatedAt
        };
    }

    public pauseMovement() {
        if (this.isDead) {
            return;
        }
        this.savedMoveSpeed = this.moveSpeed;
        this.rebase(0);
    }

    public resumeMovement() {
        if (this.isDead) {
            return;
        }
        this.rebase(this.savedMoveSpeed);
    }

    public getSpeed() {
        return PLAYER_CONFIG.baseSpeed * (1 + this.additionalStats.speed) * (1 - this.biteSlow);
    }

    /** Укус в ближнем бою. Попавший укус замедляет на 12%, но не больше чем на 50%. */
    public takeBite(amount:number):boolean {
        const before = this.health;
        const died = this.takeDamage(amount);
        if (this.health < before) {
            this.biteSlow = Math.min(0.5, this.biteSlow + 0.12);
            this.sentBiteSlow = this.biteSlow;
            if (!died) {
                this.emitStats();
            }
        }
        return died;
    }

    public grantSpawnProtection() {
        this.spawnProtectedUntil = Date.now() + PLAYER_CONFIG.spawnProtectionMs;
    }

    public isSpawnProtected() {
        return Date.now() < this.spawnProtectedUntil;
    }

    public takeDamage(amount:number):boolean {
        if (this.isDead) return false;
        if (this.isSpawnProtected()) return false;

        if (Math.random() < this.additionalStats.dodge) {
            return false;
        }

        let dmg = amount;
        dmg *= Math.max(0, 1 - this.additionalStats.armor);
        dmg *= Math.max(0, 1 - this.additionalStats.monsterArmor);
        dmg = Math.max(1, Math.round(dmg));

        this.health -= dmg;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            this.rebase(0);
            return true;
        }
        return false;
    }

    public onKill(baseExp:number) {
        if (this.isDead) return;

        if (this.additionalStats.reloadOnKill > 0 && Math.random() < this.additionalStats.reloadOnKill) {
            this.weapon.refill();
        }

        const gained = Math.round(baseExp * this.additionalStats.exp);
        this.exp += gained;
        this.checkLevelUp();
        this.emitStats();
    }

    public heal(amount:number) {
        if (this.isDead) return;
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    public tick(deltaSec:number) {
        if (this.isDead) return;

        if (this.biteSlow > 0) {
            this.biteSlow = Math.max(0, this.biteSlow - 0.12 * deltaSec);
            if (this.sentBiteSlow - this.biteSlow >= 0.04 || this.biteSlow === 0) {
                this.sentBiteSlow = this.biteSlow;
                this.emitStats();
            }
        }
    }

    private checkLevelUp() {
        while (this.exp >= expForLevel(this.level)) {
            this.exp -= expForLevel(this.level);
            const oldMax = this.maxHealth;
            this.level += 1;
            this.refreshStats();
            if (this.maxHealth > oldMax) {
                this.health += this.maxHealth - oldMax;
            }
            this.offerPerks();
        }
    }

    private offerPerks() {
        if (this.perkOffer.length > 0) {
            return;
        }
        const taken = new Set(this.perks);
        this.perkOffer = rollPerkOffer(taken, this.level, 3);
        if (this.perkOffer.length && this.scene) {
            this.scene.emit("perkOffer", {
                socketId: this.socketId,
                level: this.level,
                perks: this.perkOffer.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    rarity: p.rarity,
                    icon: p.icon || ""
                }))
            });
        }
    }

    public pickPerk(perkId:string):boolean {
        if (!this.perkOffer.length) {
            return false;
        }
        const perk = this.perkOffer.find(p => p.id === perkId) || getPerk(perkId);
        if (!perk || this.perks.includes(perk.id)) {
            return false;
        }
        this.perks.push(perk.id);
        this.perkOffer = [];
        const oldMax = this.maxHealth;
        this.refreshStats();
        // При росте maxHp чуть подлечиваем
        if (this.maxHealth > oldMax) {
            this.health += this.maxHealth - oldMax;
        }
        this.health = Math.min(this.health, this.maxHealth);
        this.emitStats();
        return true;
    }

    public equipWeapon(weaponId:string) {
        this.weapon.switchTo(weaponId);
        this.weapon.setAdditionalStats(this.additionalStats);
    }

    public refreshStats() {
        this.additionalStats = computeStats(this.perks);
        this.maxHealth = Math.round(PLAYER_CONFIG.defaultHealth + this.additionalStats.maxHp);
        this.weapon.setAdditionalStats(this.additionalStats);
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    public setReady(ready:boolean) {
        this.isReady = ready;
    }

    public setName(raw:string) {
        const cleaned = String(raw || "")
            .replace(/[^\p{L}\p{N}\s_-]/gu, "")
            .trim()
            .slice(0, 16);
        if (!cleaned) {
            return;
        }
        this.name = cleaned;
    }

    public respawn() {
        this.exp = 0;
        this.level = 1;
        this.perks = [];
        this.perkOffer = [];
        this.refreshStats();
        this.health = this.maxHealth;
        this.isDead = false;
        this.biteSlow = 0;
        this.sentBiteSlow = 0;
        this.isReady = false;
        this.grantSpawnProtection();
        this.weapon.switchTo(STARTING_WEAPON);
        this.weapon.setAdditionalStats(this.additionalStats);
        this.emitStats();
    }

    public destroy() {
        this.weapon.cancelReload();
    }

    private livePoint() {
        const pos = calcTimedPoint(
            this.startX, this.startY, this.moveRotation, this.moveSpeed, this.moveUpdatedAt
        );
        return this.clamp(pos.x, pos.y);
    }

    private rebase(speed:number) {
        const pos = this.livePoint();
        this.startX = pos.x;
        this.startY = pos.y;
        this.moveSpeed = speed;
        this.moveUpdatedAt = new Date().toISOString();
    }

    private clamp(x:number, y:number) {
        if (!this.scene) {
            return { x, y };
        }
        const margin = this.radius || 13;
        const minX = margin + this.scene.getEdgePadX();
        const maxX = Math.max(minX, this.scene.getWidth() - margin - this.scene.getEdgePadX());
        const minY = margin + this.scene.getEdgePadY();
        const maxY = Math.max(minY, this.scene.getHeight() - margin - this.scene.getEdgePadY());
        return {
            x: Math.min(maxX, Math.max(minX, x)),
            y: Math.min(maxY, Math.max(minY, y))
        };
    }

    private emitStats() {
        if (this.scene) {
            this.scene.emit("playerStats", { player: this.toJSON() });
        }
    }

    public toJSON() {
        return {
            socketId: this.socketId,
            clientId: this.clientId,
            color: this.color,
            name: this.name,
            pageX: this.pageX,
            pageY: this.pageY,
            rotation: this.rotation,
            radius: this.radius,
            health: this.health,
            maxHealth: this.maxHealth,
            isDead: this.isDead,
            isReady: this.isReady,
            exp: this.exp,
            level: this.level,
            perks: [...this.perks],
            speed: this.getSpeed(),
            dodge: this.additionalStats.dodge,
            crit: this.additionalStats.crit,
            miss: this.additionalStats.miss,
            armor: this.additionalStats.armor,
            weapon: this.weapon.toJSON(),
            perkOffer: this.perkOffer.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                rarity: p.rarity,
                icon: p.icon || ""
            }))
        };
    }
}
