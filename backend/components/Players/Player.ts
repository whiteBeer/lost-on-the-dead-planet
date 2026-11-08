import { Weapon } from "./Weapon";
import { PLAYER_CONFIG } from "../../configs/Players";
import { STARTING_WEAPON } from "../../configs/Weapons";
import {
    BASE_STATS,
    PlayerStats,
    computeStats,
    getPerk,
    rollPerkOffer,
    Perk
} from "../../configs/Perks";
import { expForLevel } from "../../configs/Waves";
import { Scene } from "../Scene";

export class Player {
    public socketId:string;
    public color:string;
    public pageX:number;
    public pageY:number;
    public rotation:number;
    public radius:number;

    public health = PLAYER_CONFIG.defaultHealth;
    public maxHealth = PLAYER_CONFIG.defaultHealth;
    public isDead = false;
    public isReady = false;

    public weapon:Weapon;
    public inventory:Array<Weapon | null>;
    public equippedSlot = 0;
    public stamina = PLAYER_CONFIG.maxStamina;
    public maxStamina = PLAYER_CONFIG.maxStamina;
    public sprinting = false;
    public aiming = false;
    public exp = 0;
    public level = 1;
    public perks:string[] = [];
    public stats:PlayerStats = { ...BASE_STATS };
    public perkOffer:Perk[] = [];
    public combo = 0;
    public bestCombo = 0;

    private scene:Scene | null = null;
    private regenAcc = 0;
    private lastStillAt = Date.now();
    private spawnProtectedUntil = 0;
    private staminaSpentAt = 0;
    private dashReadyAt = 0;
    private lastResourceEmitAt = 0;
    private comboExpiresAt = 0;

    constructor(socketId:string, color:string, startX:number, startY:number, scene?:Scene) {
        this.socketId = socketId;
        this.color = color;
        this.pageX = startX;
        this.pageY = startY;
        this.rotation = 0;
        this.radius = PLAYER_CONFIG.radius;
        this.scene = scene || null;

        this.weapon = new Weapon(STARTING_WEAPON);
        this.inventory = Array.from({ length: PLAYER_CONFIG.inventorySize }, () => null);
        this.inventory[0] = this.weapon;
        this.refreshStats();
        this.health = this.maxHealth;
        this.grantSpawnProtection();
    }

    public setScene(scene:Scene) {
        this.scene = scene;
    }

    public getSpeed() {
        const sprintMul = this.sprinting && !this.aiming && this.stamina > 0
            ? PLAYER_CONFIG.sprintMultiplier
            : 1;
        const aimMul = this.aiming ? PLAYER_CONFIG.aimSpeedMultiplier : 1;
        return PLAYER_CONFIG.baseSpeed * this.stats.speed * sprintMul * aimMul;
    }

    public getBaseSpeed() {
        return PLAYER_CONFIG.baseSpeed * this.stats.speed;
    }

    public setMovementState(sprinting:boolean, aiming:boolean) {
        this.aiming = !!aiming;
        this.sprinting = !!sprinting && !this.aiming && this.stamina > 0;
        this.weapon.setAiming(this.aiming);
    }

    public tryDash(rotation:number):boolean {
        const now = Date.now();
        if (this.isDead || now < this.dashReadyAt || this.stamina < PLAYER_CONFIG.dashCost) {
            return false;
        }
        this.stamina -= PLAYER_CONFIG.dashCost;
        this.staminaSpentAt = now;
        this.dashReadyAt = now + PLAYER_CONFIG.dashCooldownMs;
        const scene = this.scene;
        if (scene) {
            const minX = scene.getEdgePadX() + this.radius;
            const maxX = scene.getWidth() - scene.getEdgePadX() - this.radius;
            const minY = scene.getEdgePadY() + this.radius;
            const maxY = scene.getHeight() - scene.getEdgePadY() - this.radius;
            this.pageX = Math.max(minX, Math.min(maxX,
                this.pageX + Math.cos(rotation) * PLAYER_CONFIG.dashDistance));
            this.pageY = Math.max(minY, Math.min(maxY,
                this.pageY + Math.sin(rotation) * PLAYER_CONFIG.dashDistance));
        }
        this.emitStats();
        return true;
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

        if (Math.random() < this.stats.dodge) {
            return false;
        }

        let dmg = amount;
        dmg *= Math.max(0, 1 - this.stats.armor);
        dmg *= Math.max(0, 1 - this.stats.monsterArmor);
        dmg = Math.max(1, Math.round(dmg));

        this.health -= dmg;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            return true;
        }
        return false;
    }

    public onKill(baseExp:number) {
        if (this.isDead) return;

        if (this.stats.onKillHeal > 0) {
            this.heal(this.stats.onKillHeal);
        }
        if (this.stats.reloadOnKill > 0 && Math.random() < this.stats.reloadOnKill) {
            this.weapon.refill();
        }

        const now = Date.now();
        this.combo = now <= this.comboExpiresAt ? this.combo + 1 : 1;
        this.comboExpiresAt = now + 3500;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        if (this.combo > 1 && this.combo % 5 === 0) {
            this.heal(4);
            this.stamina = Math.min(this.maxStamina, this.stamina + 12);
            this.scene?.emit("comboBurst", { socketId: this.socketId, combo: this.combo });
        }

        const comboExp = 1 + Math.min(0.5, Math.max(0, this.combo - 1) * 0.03);
        const gained = Math.round(baseExp * this.stats.exp * comboExp);
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

        const regen = this.stats.regen;
        // stillRegen: считаем «стоит», если давно не обновлял позицию — упрощённо всегда добавляем маленький вклад не используем
        if (regen > 0) {
            this.regenAcc += regen * deltaSec;
            if (this.regenAcc >= 1) {
                const heal = Math.floor(this.regenAcc);
                this.regenAcc -= heal;
                this.heal(heal);
                this.emitStats();
            }
        }


        const oldStamina = this.stamina;
        const now = Date.now();
        if (this.sprinting && !this.aiming) {
            this.stamina = Math.max(0,
                this.stamina - PLAYER_CONFIG.sprintDrainPerSecond * deltaSec);
            this.staminaSpentAt = now;
            if (this.stamina <= 0) {
                this.sprinting = false;
            }
        } else if (now - this.staminaSpentAt >= PLAYER_CONFIG.staminaRegenDelayMs) {
            this.stamina = Math.min(this.maxStamina,
                this.stamina + PLAYER_CONFIG.staminaRegenPerSecond * deltaSec);
        }
        if (Math.abs(this.stamina - oldStamina) >= 0.01 && now - this.lastResourceEmitAt >= 100) {
            this.lastResourceEmitAt = now;
            this.emitStats();
        }
        if (this.combo > 0 && now > this.comboExpiresAt) {
            this.combo = 0;
            this.emitStats();
        }
    }

    private checkLevelUp() {
        while (this.exp >= expForLevel(this.level)) {
            this.exp -= expForLevel(this.level);
            this.level += 1;
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

    public addWeapon(weaponId:string, level = 1):boolean {
        const slot = this.inventory.findIndex(item => item === null);
        if (slot === -1) return false;
        const weapon = new Weapon(weaponId, level);
        weapon.setStats(this.stats);
        this.inventory[slot] = weapon;
        this.emitStats();
        return true;
    }

    public equipInventorySlot(slot:number):boolean {
        const weapon = this.inventory[slot];
        if (!weapon) return false;
        this.weapon.cancelReload();
        this.weapon = weapon;
        this.equippedSlot = slot;
        this.weapon.setStats(this.stats);
        this.weapon.setAiming(this.aiming);
        this.emitStats();
        return true;
    }

    public moveInventoryItem(from:number, to:number):boolean {
        if (from === to || from < 0 || to < 0 ||
            from >= this.inventory.length || to >= this.inventory.length || !this.inventory[from]) {
            return false;
        }
        const equippedWeapon = this.weapon;
        [this.inventory[from], this.inventory[to]] = [this.inventory[to], this.inventory[from]];
        this.equippedSlot = this.inventory.findIndex(item => item === equippedWeapon);
        this.emitStats();
        return true;
    }

    public mergeInventoryItems(from:number, to:number):boolean {
        if (from === to || from < 0 || to < 0 ||
            from >= this.inventory.length || to >= this.inventory.length) return false;
        const source = this.inventory[from];
        const target = this.inventory[to];
        if (!source || !target || source.id !== target.id || source.level !== target.level ||
            target.level >= PLAYER_CONFIG.maxWeaponLevel) return false;
        source.cancelReload();
        target.upgrade();
        this.inventory[from] = null;
        if (this.weapon === source) {
            this.weapon = target;
            this.equippedSlot = to;
        }
        this.emitStats();
        return true;
    }

    public dropInventoryItem(slot:number):boolean {
        if (slot < 0 || slot >= this.inventory.length || !this.inventory[slot]) return false;
        const weapons = this.inventory.filter(Boolean);
        if (weapons.length <= 1) return false;
        const dropped = this.inventory[slot];
        if (!dropped) return false;
        dropped.cancelReload();
        this.inventory[slot] = null;
        if (this.weapon === dropped) {
            const nextSlot = this.inventory.findIndex(Boolean);
            const next = this.inventory[nextSlot];
            if (!next) return false;
            this.weapon = next;
            this.equippedSlot = nextSlot;
        }
        this.scene?.pickupsCollection.addWeaponPickup(
            this.pageX + Math.cos(this.rotation) * 38,
            this.pageY + Math.sin(this.rotation) * 38,
            dropped.id,
            dropped.level
        );
        this.emitStats();
        return true;
    }

    public rewardWaveClear() {
        if (this.isDead) return;
        this.heal(Math.max(12, Math.round(this.maxHealth * 0.18)));
        this.stamina = this.maxStamina;
        this.weapon.refill();
        this.emitStats();
    }

    public refreshStats() {
        this.stats = computeStats(this.perks);
        this.maxHealth = Math.round(this.stats.maxHp);
        this.inventory.forEach(weapon => weapon?.setStats(this.stats));
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    public setReady(ready:boolean) {
        this.isReady = ready;
    }

    public respawn() {
        this.exp = 0;
        this.level = 1;
        this.perks = [];
        this.perkOffer = [];
        this.inventory.forEach(weapon => weapon?.cancelReload());
        this.weapon = new Weapon(STARTING_WEAPON);
        this.inventory = Array.from({ length: PLAYER_CONFIG.inventorySize }, () => null);
        this.inventory[0] = this.weapon;
        this.equippedSlot = 0;
        this.stamina = this.maxStamina;
        this.sprinting = false;
        this.aiming = false;
        this.dashReadyAt = 0;
        this.combo = 0;
        this.bestCombo = 0;
        this.comboExpiresAt = 0;
        this.refreshStats();
        this.health = this.maxHealth;
        this.isDead = false;
        this.isReady = false;
        this.grantSpawnProtection();
        this.emitStats();
    }

    public destroy() {
        this.inventory.forEach(weapon => weapon?.cancelReload());
    }

    private emitStats() {
        if (this.scene) {
            this.scene.emit("playerStats", { player: this.toJSON() });
        }
    }

    public toJSON() {
        return {
            socketId: this.socketId,
            color: this.color,
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
            baseSpeed: this.getBaseSpeed(),
            stamina: Math.round(this.stamina * 10) / 10,
            maxStamina: this.maxStamina,
            sprinting: this.sprinting,
            aiming: this.aiming,
            dashCooldownMs: Math.max(0, this.dashReadyAt - Date.now()),
            combo: this.combo,
            bestCombo: this.bestCombo,
            weapon: this.weapon.toJSON(),
            equippedSlot: this.equippedSlot,
            inventory: this.inventory.map((weapon, slot) => weapon
                ? { slot, ...weapon.toJSON() }
                : null),
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
