import {randomUUID} from "crypto";
import {MissileParams, MissileJSON} from "../../types";
import {Scene} from "../Scene";
import {server} from "../../classes/ServerFacade";

export class BaseMissile implements MissileJSON {

    scene:Scene;
    previousPos: {x: number, y: number, timestamp: number} | null = null;

    id: string;
    ownerId: string;
    damage = -1;
    startX = -1;
    startY = -1;
    speedInSecond = -1;
    rotation = 0;
    range = 0;
    createdAt:string;
    updatedAt:string;

    constructor(scene:Scene, params:MissileParams) {
        this.scene = scene;
        const createdAt = new Date().toISOString();
        this.id = randomUUID();
        this.ownerId = params.ownerId;
        this.startX = params.startX;
        this.startY = params.startY;
        this.rotation = params.rotation;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    handleEvents () {
        server.emit(this.scene.roomId, "missilesAdded", {
            serverCurrentDateTime: new Date().toISOString(),
            newMissile: this.toJSON()
        });

        setTimeout(() => {
            this.scene.missilesCollection.removeMissileById(this.id);
        }, this.range / this.speedInSecond * 1000);
    }

    toJSON() {
        //TODO: https://stackoverflow.com/questions/43909566/get-keys-of-a-typescript-interface-as-array-of-strings
        return {
            id: this.id,
            ownerId: this.ownerId,
            damage: this.damage,
            startX: this.startX,
            startY: this.startY,
            speedInSecond: this.speedInSecond,
            rotation: this.rotation,
            range: this.range,
            createdAt: this.createdAt
        };
    }
}