import { Missile, MissileParams } from "../../types";
import { Scene } from "../Scene";
import { RifleMissile } from "./RifleMissile";

export class Missiles {

    scene:Scene;
    items:Missile[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    createMissile (params:MissileParams) {
        if (params.weaponType === "Rifle") {
            const newMissile = new RifleMissile(this.scene, params);
            this.items.push(newMissile);
        } else {
            // TODO: unsupported weapon
        }
    }

    getMissilesWithServerTime () {
        return {
            serverCurrentDateTime: new Date().toISOString(),
            missiles: this.items
        };
    }

    getMissiles () {
        return this.items;
    }

    removeMissileById (missileId:string) {
        this.items = this.items.filter(el => el.id !== missileId);
        this.scene.io.emit("missilesRemoved", <any>missileId);
    }
}