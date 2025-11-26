import {MissileParams} from "../../types";
import {Scene} from "../Scene";
import {RifleMissile} from "./RifleMissile";
import {BaseMissile} from "./BaseMissile";

export class Missiles {

    private readonly scene:Scene;
    private items:BaseMissile[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    createMissile (params:MissileParams) {
        let newMissile;
        if (params.weaponType === "Rifle") {
            newMissile = new RifleMissile(this.scene, params);
        } else {
            // TODO: unsupported weapon
        }
        if (newMissile) {
            this.items.push(newMissile);
            this.scene.emit("missilesAdded", { missile: newMissile.toJSON() });
        }
    }

    getMissiles () {
        return this.items;
    }

    getMissilesJSON () {
        return this.items.map(el => el.toJSON());
    }

    removeMissileById (missileId:string) {
        const missile = this.items.find(el => el.id === missileId);
        if (missile) {
            this.items = this.items.filter(el => el.id !== missileId);
            this.scene.emit("missilesRemoved", { missile: missile.toJSON() });
        }
    }
}