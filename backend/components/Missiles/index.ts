import {MissileParams} from "../../types";
import {Scene} from "../Scene";
import {RifleMissile} from "./RifleMissile";
import {BaseMissile} from "./BaseMissile";
import { emitManager } from "../../classes/EmitManager";

export class Missiles {

    scene:Scene;
    items:BaseMissile[] = [];

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

    getMissilesJSON () {
        return this.items.map(el => el.toJSON());
    }

    removeMissileById (missileId:string) {
        this.items = this.items.filter(el => el.id !== missileId);
        emitManager.emit(this.scene.roomId, "missilesRemoved", missileId);
    }
}