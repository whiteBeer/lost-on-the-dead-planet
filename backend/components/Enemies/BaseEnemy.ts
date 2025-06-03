import {randomUUID} from "crypto";
import {EnemyParams, EnemyJSON} from "../../types";
import {Scene} from "../Scene";
import {clearInterval} from "timers";
import {server} from "../../classes/ServerFacade";

export class BaseEnemy implements EnemyJSON {

    scene:Scene;

    id: string;
    color = "black";
    health = -1;
    currentHealth = -1;
    length = -1;
    width = -1;
    rotation = 0;
    speedInSecond = 0;
    startX:number;
    startY:number;
    createdAt:string;
    updatedAt:string;
    moveInterval:NodeJS.Timeout|null = null;

    constructor(scene:Scene, params:EnemyParams) {
        this.scene = scene;
        const createdAt = new Date().toISOString();
        this.id = randomUUID();
        this.startX = params.startX;
        this.startY = params.startY;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    damage (missileDamage:number) {
        this.health = this.health - missileDamage;
    }

    damageEvent () {
        server.emit(this.scene.roomId, "enemiesDamaged",{
            serverCurrentDateTime: new Date().toISOString(),
            enemy: this.toJSON()
        });
    }

    remove () {
        if (this.moveInterval !== null) {
            clearInterval(this.moveInterval);
        }
        server.emit(this.scene.roomId, "enemiesRemoved",{
            serverCurrentDateTime: new Date().toISOString(),
            enemy: this.toJSON()
        });
    }

    toJSON() {
        //TODO: https://stackoverflow.com/questions/43909566/get-keys-of-a-typescript-interface-as-array-of-strings
        return {
            id: this.id,
            color: this.color,
            length: this.length,
            width: this.width,
            health: this.health,
            currentHealth: this.currentHealth,
            rotation: this.rotation,
            speedInSecond: this.speedInSecond,
            startX: this.startX,
            startY: this.startY,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}