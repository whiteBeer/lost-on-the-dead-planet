import { Scene } from "../Scene";
import { Pickup } from "./Pickup";
import { PLAYER_CONFIG } from "../../configs/Players";

export class Pickups {
    private readonly scene:Scene;
    private readonly items:Pickup[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    addWeaponPickup(x:number, y:number, weaponId:string, weaponLevel = 1) {
        const pickup = new Pickup("weapon", x, y, weaponId, weaponLevel);
        this.items.push(pickup);
        this.scene.emit("pickupAdded", { pickup: pickup.toJSON() });
        return pickup;
    }

    removeAll() {
        const removed = [...this.items];
        this.items.length = 0;
        removed.forEach(pickup => {
            this.scene.emit("pickupRemoved", { pickup: pickup.toJSON() });
        });
    }

    /** Убрать просроченные дропы */
    removeExpired() {
        const now = Date.now();
        for (let i = this.items.length - 1; i >= 0; i--) {
            if (this.items[i].expiresAt <= now) {
                const pickup = this.items[i];
                this.items.splice(i, 1);
                this.scene.emit("pickupRemoved", { pickup: pickup.toJSON() });
            }
        }
    }

    /** Оставлено для совместимости; оружие теперь подбирается явно в инвентарь. */
    autoPickupNearPlayers() {
        return;
    }

    tryPickup(socketId:string):boolean {
        const player = this.scene.playersCollection.getPlayerById(socketId);
        if (!player || player.isDead) {
            return false;
        }

        const reach = PLAYER_CONFIG.pickupRadius;
        let best:Pickup | null = null;
        let bestDist = reach * reach;

        for (const item of this.items) {
            const dx = item.x - player.pageX;
            const dy = item.y - player.pageY;
            const distSq = dx * dx + dy * dy;
            if (distSq <= bestDist) {
                best = item;
                bestDist = distSq;
            }
        }

        if (!best || best.kind !== "weapon" || !best.weaponId) {
            return false;
        }

        if (!player.addWeapon(best.weaponId, best.weaponLevel)) {
            return false;
        }
        this.removeById(best.id);
        this.scene.emit("playerStats", { player: player.toJSON() });
        return true;
    }

    removeById(id:string) {
        const index = this.items.findIndex(el => el.id === id);
        if (index === -1) {
            return;
        }
        const pickup = this.items[index];
        this.items.splice(index, 1);
        this.scene.emit("pickupRemoved", { pickup: pickup.toJSON() });
    }

    getPickupsJSON() {
        return this.items.map(el => el.toJSON());
    }
}
