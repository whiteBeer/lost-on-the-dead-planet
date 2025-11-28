import {App} from "../../App";
import {Player} from "./Player";
import {BackendWeaponState, BackendWeaponConfig} from "../../Types";

export class Weapon {

    app: App;
    player: Player;
    config: BackendWeaponConfig;

    // Client-side fire rate limiting
    lastFire = 0;

    // State from backend
    id = "";
    ammo = 0;
    clipSize = 0;
    isReloading = false;

    // Spread logic
    currentSpread = 0;
    lastShotTime = 0; // Will be 0 until the first shot

    constructor (app:App, player:Player, config: BackendWeaponConfig) {
        this.app = app;
        this.player = player;
        this.config = config;
        this.currentSpread = config.spreadBase;
    }

    updateState(state: BackendWeaponState) {
        this.id = state.id;
        this.ammo = state.ammo;
        this.clipSize = state.clipSize;
        this.isReloading = state.isReloading;
    }

    // Called on every frame from App ticker
    update(deltaMS: number) {
        // Only start recovering spread *after* the first shot has been fired.
        if (this.lastShotTime > 0) {
            const recoveryPerSecond = this.config.spreadRecovery;
            const recoveryThisFrame = recoveryPerSecond * (deltaMS / 1000);
            this.currentSpread = Math.max(this.config.spreadBase, this.currentSpread - recoveryThisFrame);
        }
    }

    fire () {
        const now = Date.now();
        const fireRateDelay = this.config.fireRate;

        if (this.isReloading || now - this.lastFire < fireRateDelay) {
            return;
        }

        if (this.app.scene && this.app?.socket?.id) {
            this.lastFire = now;

            // Increase spread. Recovery is handled in update().
            this.currentSpread = Math.min(this.config.spreadMax, this.currentSpread + this.config.spreadIncrement);
            this.lastShotTime = now;

            const playerCoords = this.player.getCoords();
            this.app.socket.emit("missileCreate", {
                weaponType: this.id,
                startX: playerCoords.pageX,
                startY: playerCoords.pageY,
                rotation: playerCoords.rotation
            });
            this.ammo--;
        }
    }

    reload() {
        if (this.isReloading || this.ammo >= this.clipSize) {
            return;
        }

        if (this.app.socket?.id) {
            this.app.socket.emit("playerReload", { weaponId: this.id });
        }
    }
}

export default Weapon;