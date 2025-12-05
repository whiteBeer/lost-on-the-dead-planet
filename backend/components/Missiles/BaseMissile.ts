import { randomUUID } from "crypto";
import { MissileParams, MissileJSON } from "../../types";
import { Scene } from "../Scene";

export class BaseMissile implements MissileJSON {

    public readonly scene:Scene;
    public previousPos:{x:number, y:number} | null = null;
    private lifeTimeout:NodeJS.Timeout | null = null;

    id:string;
    ownerId:string;
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

    handleEvents() {
        this.lifeTimeout = setTimeout(() => {
            if (this.scene && this.scene.missilesCollection) {
                this.scene.missilesCollection.removeMissileById(this.id);
            }
        }, this.range / this.speedInSecond * 1000);
    }

    destroy() {
        if (this.lifeTimeout) {
            clearTimeout(this.lifeTimeout);
            this.lifeTimeout = null;
        }
    }

    toJSON() {
        const { scene, previousPos, lifeTimeout, ...json } = this;
        return json;
    }
}