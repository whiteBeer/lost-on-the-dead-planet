import { App } from "../../App";
import { Player } from "./Player";
import { BackendWeaponState, BackendWeaponConfig } from "../../Types";

export class Weapon {

    app:App;
    player:Player;
    config:BackendWeaponConfig;

    lastFire = 0;

    id = "";
    ammo = 0;
    clipSize = 0;
    isReloading = false;
    damage = 0;
    /** Пауза между выстрелами, мс. Сервер присылает уже с перками. */
    fireRate = 0;

    currentSpread = 0;
    lastShotTime = 0;
    /** Как Weapon.getSpreadMul на сервере. Без него круг меньше конуса пуль. */
    private spreadMul = 1;

    constructor(app:App, player:Player, config:BackendWeaponConfig) {
        this.app = app;
        this.player = player;
        this.config = config;
        this.id = config.id || "";
        this.clipSize = config.clipSize || 0;
        this.ammo = this.clipSize;
        this.currentSpread = config.spreadBase;
    }

    updateState(state:BackendWeaponState) {
        this.id = state.id;
        this.ammo = state.ammo;
        this.clipSize = state.clipSize;
        this.isReloading = state.isReloading;
        if (state.damage) {
            this.damage = state.damage;
        }
        if (typeof state.spread === "number" && state.spread > 0) {
            this.spreadMul = state.spread;
        }
        if (typeof state.fireRate === "number" && state.fireRate > 0) {
            this.fireRate = state.fireRate;
        }
    }

    switchConfig(weaponId:string, config:BackendWeaponConfig) {
        this.id = weaponId;
        this.config = config;
        this.clipSize = config.clipSize || this.clipSize;
        this.ammo = this.clipSize;
        this.isReloading = false;
        this.currentSpread = this.spreadFloor();
        this.fireRate = config.fireRate;
        this.lastFire = 0;
        this.lastShotTime = 0;
    }

    private spreadFloor() {
        return this.config.spreadBase * this.spreadMul;
    }

    /** Затухание разброса каждый кадр — как на сервере в applySpread. */
    update(deltaMS:number) {
        const floor = this.spreadFloor();
        if (this.lastShotTime <= 0) {
            this.currentSpread = floor;
            return;
        }
        const recoveryThisFrame = this.config.spreadRecovery * (deltaMS / 1000);
        this.currentSpread = Math.max(floor, this.currentSpread - recoveryThisFrame);
        if (this.currentSpread <= floor + 0.0001) {
            this.currentSpread = floor;
            this.lastShotTime = 0;
        }
    }

    fire() {
        const now = Date.now();
        const fireRateDelay = Math.max(15, this.fireRate || this.config.fireRate);

        if (this.isReloading || this.ammo <= 0 || now - this.lastFire < fireRateDelay) {
            if (this.ammo <= 0 && !this.isReloading) {
                this.reload();
            }
            return;
        }

        if (this.app.scene && this.app?.socket?.id) {
            this.lastFire = now;

            // Затухание уже крутится в update() каждый кадр — тут только bloom
            const playerCoords = this.player.getCoords();
            this.app.socket.emit("missileCreate", {
                weaponType: this.id,
                startX: playerCoords.pageX,
                startY: playerCoords.pageY,
                rotation: playerCoords.rotation
            });

            this.currentSpread = Math.min(
                this.config.spreadMax * this.spreadMul,
                this.currentSpread + this.config.spreadIncrement * this.spreadMul
            );
            this.lastShotTime = now;
            this.ammo = Math.max(0, this.ammo - 1);
            if (this.ammo <= 0) {
                this.reload();
            }
        }
    }

    reload() {
        if (this.isReloading || this.ammo >= this.clipSize) {
            return;
        }

        if (this.app.socket?.id) {
            this.isReloading = true;
            this.app.socket.emit("playerReload", { weaponId: this.id });
        }
    }
}

export default Weapon;
