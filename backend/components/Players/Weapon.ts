import { WEAPONS, WeaponConfig } from "../../configs/Weapons";

export class Weapon {
    public readonly id:string;
    public readonly config:WeaponConfig;

    // Состояние
    public ammo:number;
    public isReloading = false;

    // Разброс
    private currentSpread = 0;
    private lastShotTime = 0;

    private nextShotAvailableTime = 0;

    private reloadTimer:NodeJS.Timeout | null = null;

    constructor(weaponId:string) {
        this.id = weaponId;
        this.config = WEAPONS[weaponId];

        if (!this.config) {
            throw new Error(`Weapon config not found for ID: ${weaponId}`);
        }

        this.ammo = this.config.clipSize;
    }

    public tryShoot():boolean {
        const now = Date.now();

        if (this.isReloading || this.ammo <= 0) {
            return false;
        }
        if (now < this.nextShotAvailableTime) {
            return false;
        }
        const delayMs = this.config.fireRate;
        this.nextShotAvailableTime = now + delayMs;

        this.ammo--;
        return true;
    }

    public applySpread(baseRotation:number):number {
        const now = Date.now();
        const timeDelta = (now - this.lastShotTime) / 1000;

        // 1. Восстановление
        if (timeDelta > 0) {
            const recovery = this.config.spreadRecovery * timeDelta;
            this.currentSpread = Math.max(this.config.spreadBase, this.currentSpread - recovery);
        }

        // 2. Рандомное отклонение
        const deviation = (Math.random() - 0.5) * 2 * this.currentSpread;
        const finalRotation = baseRotation + deviation;

        // 3. Нарастание
        this.currentSpread = Math.min(this.config.spreadMax, this.currentSpread + this.config.spreadIncrement);
        this.lastShotTime = now;

        return finalRotation;
    }

    public reload(callback?:(ammo:number) => void):boolean {
        if (this.ammo >= this.config.clipSize || this.isReloading) {
            return false;
        }

        this.isReloading = true;

        this.cancelReload();

        this.reloadTimer = setTimeout(() => {
            this.ammo = this.config.clipSize;
            this.isReloading = false;
            this.reloadTimer = null;

            if (callback) callback(this.ammo);
        }, this.config.reloadTime * 1000);

        return true;
    }

    public cancelReload() {
        if (this.reloadTimer) {
            clearTimeout(this.reloadTimer);
            this.reloadTimer = null;
            this.isReloading = false;
        }
    }

    public toJSON() {
        return {
            id: this.id,
            ammo: this.ammo,
            clipSize: this.config.clipSize,
            isReloading: this.isReloading
        };
    }
}