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

export class Player {
    public socketId:string;
    public clientId = "";
    public color:string;
    public name = "Игрок";
    public pageX:number;
    public pageY:number;
    public rotation:number;
    public radius:number;

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
    /** Попал союзник: до этого момента ни ходить, ни поворачиваться */
    private stunnedUntil = 0;
    /** Доля замедления от укусов, 0…0.5 */
    private biteSlow = 0;
    private sentBiteSlow = 0;

    constructor(socketId:string, color:string, startX:number, startY:number, scene?:Scene) {
        this.socketId = socketId;
        this.color = color;
        this.pageX = startX;
        this.pageY = startY;
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

    public isStunned() {
        return Date.now() < this.stunnedUntil;
    }

    /** Попадание союзника. Уже оглушённого не продлеваем, иначе можно держать вечно. */
    public stun(ms:number):boolean {
        if (this.isDead || this.isStunned() || this.isSpawnProtected()) {
            return false;
        }
        this.stunnedUntil = Date.now() + ms;
        this.emitStats();
        return true;
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
        this.stunnedUntil = 0;
        this.isReady = false;
        this.grantSpawnProtection();
        this.weapon.switchTo(STARTING_WEAPON);
        this.weapon.setAdditionalStats(this.additionalStats);
        this.emitStats();
    }

    public destroy() {
        this.weapon.cancelReload();
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
            // Остаток, а не момент окончания: часы клиента и сервера расходятся
            stunnedMs: Math.max(0, this.stunnedUntil - Date.now()),
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
