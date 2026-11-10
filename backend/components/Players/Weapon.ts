import { WEAPONS, WeaponConfig } from "../../configs/Weapons";
import { PlayerStats } from "../../configs/Perks";

export class Weapon {
    public id:string;
    public config:WeaponConfig;

    public ammo:number;
    public isReloading = false;

    private currentSpread = 0;
    private lastShotTime = 0;
    private nextShotAvailableTime = 0;
    private reloadTimer:NodeJS.Timeout | null = null;
    private stats:PlayerStats | null = null;

    constructor(weaponId:string) {
        this.id = weaponId;
        this.config = WEAPONS[weaponId];

        if (!this.config) {
            throw new Error(`Weapon config not found for ID: ${weaponId}`);
        }

        this.ammo = this.getClipSize();
    }

    public setStats(stats:PlayerStats | null) {
        this.stats = stats;
    }

    public getClipSize() {
        const mul = this.stats?.clip ?? 1;
        return Math.max(1, Math.round(this.config.clipSize * mul));
    }

    public getFireRateMs() {
        const mul = this.stats?.fireRate ?? 1;
        return Math.max(30, this.config.fireRate / mul);
    }

    public getReloadTime() {
        const mul = this.stats?.reload ?? 1;
        return Math.max(0.2, this.config.reloadTime / mul);
    }

    public getDamage() {
        const mul = (this.stats?.damage ?? 1) * (this.stats?.monsterDamage ?? 1);
        return this.config.damage * mul;
    }

    public getPierce() {
        return (this.config.pierce ?? 0) + Math.floor(this.stats?.pierce ?? 0);
    }

    public getExtraBullets() {
        return Math.max(0, Math.floor(this.stats?.extraBullets ?? 0));
    }

    public getSpreadMul() {
        return this.stats?.spread ?? 1;
    }

    public getBulletSpeed() {
        return this.config.speedInSecond * (this.stats?.bulletSpeed ?? 1);
    }

    public getRange() {
        return this.config.range * (this.stats?.range ?? 1);
    }

    public tryShoot():boolean {
        const now = Date.now();

        if (this.isReloading) {
            return false;
        }
        if (this.ammo <= 0) {
            return false;
        }
        if (now < this.nextShotAvailableTime) {
            return false;
        }

        this.nextShotAvailableTime = now + this.getFireRateMs();

        // Обойма конечная; запас бесконечный (перезарядка всегда наполняет магазин)
        const refund = this.stats?.ammoRefund ?? 0;
        if (Math.random() >= refund) {
            this.ammo = Math.max(0, this.ammo - 1);
        }
        return true;
    }

    public applySpread(baseRotation:number):number {
        const now = Date.now();
        const timeDelta = (now - this.lastShotTime) / 1000;
        const spreadMul = this.getSpreadMul();

        if (timeDelta > 0) {
            const recovery = this.config.spreadRecovery * timeDelta;
            this.currentSpread = Math.max(this.config.spreadBase * spreadMul, this.currentSpread - recovery);
        }

        const maxSpread = this.config.spreadMax * spreadMul;
        const deviation = (Math.random() - 0.5) * 2 * this.currentSpread;
        const finalRotation = baseRotation + deviation;

        this.currentSpread = Math.min(maxSpread, this.currentSpread + this.config.spreadIncrement * spreadMul);
        this.lastShotTime = now;

        return finalRotation;
    }

    public reload(callback?:(ammo:number) => void):boolean {
        if (this.ammo >= this.getClipSize() || this.isReloading) {
            return false;
        }

        this.cancelReload();
        this.isReloading = true;

        this.reloadTimer = setTimeout(() => {
            this.ammo = this.getClipSize();
            this.isReloading = false;
            this.reloadTimer = null;

            if (callback) callback(this.ammo);
        }, this.getReloadTime() * 1000);

        return true;
    }

    public cancelReload() {
        if (this.reloadTimer) {
            clearTimeout(this.reloadTimer);
            this.reloadTimer = null;
            this.isReloading = false;
        }
    }

    public refill() {
        this.cancelReload();
        this.ammo = this.getClipSize();
    }

    public switchTo(weaponId:string) {
        if (!WEAPONS[weaponId]) {
            return;
        }
        this.cancelReload();
        this.id = weaponId;
        this.config = WEAPONS[weaponId];
        this.currentSpread = this.config.spreadBase;
        this.ammo = this.getClipSize();
        this.nextShotAvailableTime = 0;
    }

    public toJSON() {
        return {
            id: this.id,
            ammo: this.ammo,
            clipSize: this.getClipSize(),
            isReloading: this.isReloading,
            damage: Math.round(this.getDamage())
        };
    }
}
