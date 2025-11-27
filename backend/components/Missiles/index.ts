import {MissileParams} from "../../types";
import {Scene} from "../Scene";
import {RifleMissile} from "./RifleMissile";
import {BaseMissile} from "./BaseMissile";

const MISSILE_MAP: Record<string, new (scene: Scene, params: MissileParams) => BaseMissile> = {
    "Rifle": RifleMissile
    // "Shotgun": ShotgunMissile,
    // "Bazooka": BazookaMissile
};

export class Missiles {

    private readonly scene:Scene;
    private items:BaseMissile[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    createMissile (params:MissileParams) {
        const MissileClass = MISSILE_MAP[params.weaponType];

        if (!MissileClass) {
            console.warn(`Unknown weapon type: ${params.weaponType}`);
            return;
        }

        const newMissile = new MissileClass(this.scene, params);
        this.items.push(newMissile);
        this.scene.emit("missilesAdded", { missile: newMissile.toJSON() });
    }

    getMissiles () {
        return this.items;
    }

    getMissilesJSON () {
        return this.items.map(el => el.toJSON());
    }

    removeMissileById (missileId:string) {
        const index = this.items.findIndex(el => el.id === missileId);
        if (index !== -1) {
            const missile = this.items[index];
            missile.destroy();
            this.items.splice(index, 1);
            this.scene.emit("missilesRemoved", { missile: missile.toJSON() });
        }
    }
}