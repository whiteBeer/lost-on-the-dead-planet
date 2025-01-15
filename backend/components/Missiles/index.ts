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
        this.items.push(Object.assign(params, {
            id: missileId,
            ownerId: socketId,
            createdAt: new Date().toISOString()
        }));
        this.scene.io.emit("missilesAll", this.getMissilesWithServerTime());

        // TODO: need remove on leave the scene
        setTimeout(() => {
            this.items = this.items.filter(el => el.id !== missileId);
        }, 5000);
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