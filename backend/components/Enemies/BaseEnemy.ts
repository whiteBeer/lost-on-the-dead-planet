import { randomUUID } from "crypto";
import { EnemyParams, EnemyJSON, Rectangle } from "../../types";
import { Scene } from "../Scene";
import { clearInterval } from "timers";

export class BaseEnemy implements EnemyJSON, Rectangle {

    scene:Scene;
    moveInterval:NodeJS.Timeout|null = null;

    id:string;
    color = "black";
    health = -1;
    maxHealth = -1;
    length = -1;
    width = -1;
    rotation = 0;
    defaultSpeedInSecond = 0;
    speedInSecond = 0;
    startX:number;
    startY:number;
    createdAt:string;
    updatedAt:string;

    // Параметры атаки
    public damageValue = 0;
    public attackInterval = 1000;
    private lastAttackTime = 0;

    constructor(scene:Scene, params:EnemyParams) {
        this.scene = scene;
        const createdAt = new Date().toISOString();
        this.id = randomUUID();
        this.startX = params.startX;
        this.startY = params.startY;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    canAttack() {
        const now = Date.now();
        const cooldownMs = this.attackInterval;
        return now - this.lastAttackTime >= cooldownMs;
    }

    attack() {
        this.lastAttackTime = Date.now();
    }

    damage(missileDamage:number) {
        this.health = this.health - missileDamage;
    }

    remove() {
        if (this.moveInterval !== null) {
            clearInterval(this.moveInterval);
        }
    }

    toJSON() {
        const { scene, moveInterval, ...json } = this;
        return json;
    }
}