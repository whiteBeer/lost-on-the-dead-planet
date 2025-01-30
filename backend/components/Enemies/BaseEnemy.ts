import {randomUUID} from "crypto";
import {EnemyParams} from "../../types";
import {Scene} from "../Scene";

export class BaseEnemy {

    scene:Scene;

    id: string;
    color = "black";
    length = -1;
    width = -1;
    rotation = 0;
    speedInSecond = 0;
    startX: number;
    startY: number;
    createdAt: string;
    updatedAt: string;

    constructor(scene:Scene, params:EnemyParams) {
        this.scene = scene;
        const createdAt = new Date().toISOString();
        this.id = randomUUID();
        this.startX = params.startX;
        this.startY = params.startY;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    toJSON() {
        return {
            id: this.id,
            color: this.color,
            length: this.length,
            width: this.width,
            rotation: this.rotation,
            speedInSecond: this.speedInSecond,
            startX: this.startX,
            startY: this.startY,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}