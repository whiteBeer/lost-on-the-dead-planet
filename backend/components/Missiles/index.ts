import { EnemyMissileParams, MissileParams } from "../../types";
import { Scene } from "../Scene";
import { WeaponMissile } from "./WeaponMissile";
import { EnemyMissile } from "./EnemyMissile";
import { BaseMissile } from "./BaseMissile";
import { WEAPONS } from "../../configs/Weapons";

export class Missiles {

    private readonly scene:Scene;
    private items:BaseMissile[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    createMissile(params:MissileParams) {
        if (!WEAPONS[params.weaponType]) {
            console.warn(`Unknown weapon type: ${params.weaponType}`);
            return;
        }

        try {
            const newMissile = new WeaponMissile(this.scene, params);
            this.items.push(newMissile);
            this.scene.emit("missilesAdded", { missile: newMissile.toJSON() });
        } catch (e) {
            console.warn(e);
        }
    }

    createEnemyMissile(params:EnemyMissileParams) {
        try {
            const newMissile = new EnemyMissile(this.scene, params);
            this.items.push(newMissile);
            this.scene.emit("missilesAdded", { missile: newMissile.toJSON() });
        } catch (e) {
            console.warn(e);
        }
    }

    getMissiles() {
        return this.items;
    }

    getMissilesJSON() {
        return this.items.map(el => el.toJSON());
    }

    removeMissileById(missileId:string) {
        const index = this.items.findIndex(el => el.id === missileId);
        if (index !== -1) {
            const missile = this.items[index];
            missile.destroy();
            this.items.splice(index, 1);
            this.scene.emit("missilesRemoved", { missile: missile.toJSON() });
        }
    }

    removeAll() {
        [...this.items].forEach(missile => {
            missile.destroy();
        });
        this.items.length = 0;
    }
}
