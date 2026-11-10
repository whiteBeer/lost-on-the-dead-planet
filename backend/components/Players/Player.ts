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
    public stats:PlayerStats = { ...BASE_STATS };
    public perkOffer:Perk[] = [];

    private scene:Scene | null = null;
    private regenAcc = 0;
    private lastStillAt = Date.now();
    private spawnProtectedUntil = 0;

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
        return PLAYER_CONFIG.baseSpeed * this.stats.speed;
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

        const gained = Math.round(baseExp * this.stats.exp);
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

        const regen = Math.min(3, this.stats.regen);
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

    public equipWeapon(weaponId:string) {
        this.weapon.switchTo(weaponId);
        this.weapon.setStats(this.stats);
    }

    public refreshStats() {
        this.stats = computeStats(this.perks);
        this.maxHealth = Math.round(this.stats.maxHp);
        this.weapon.setStats(this.stats);
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
        this.isReady = false;
        this.grantSpawnProtection();
        this.weapon.switchTo(STARTING_WEAPON);
        this.weapon.setStats(this.stats);
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
