import { randomUUID } from "crypto";

import { Missile } from "../../types";
import { Scene } from "../Scene";

export class Missiles {

    scene:Scene;
    items:Missile[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    createMissile (params:Missile, socketId:string) {
        const missileId = randomUUID();
        const newMissile = Object.assign(params, {
            id: missileId,
            ownerId: socketId,
            createdAt: new Date().toISOString()
        });
        this.items.push(newMissile);
        this.scene.io.emit("missilesAdded", {
            serverCurrentDateTime: new Date().toISOString(),
            newMissile: newMissile
        });

        setTimeout(() => {
            this.items = this.items.filter(el => el.id !== missileId);
            this.scene.io.emit("missilesRemoved", missileId);
        }, params.range / params.speedInSecond * 1000);
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
}