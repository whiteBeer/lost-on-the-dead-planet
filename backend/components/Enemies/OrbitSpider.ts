import { Scene } from "../Scene";
import { BaseEnemy } from "./BaseEnemy";
import { EnemyParams } from "../../types";

export interface OrbitSpiderParams extends EnemyParams {
    radius?:number;
}

/** Sandbox orbit-AI (не путать с арена-Spider). */
export class OrbitSpider extends BaseEnemy {

    type = "orbit_spider";

    moveInterval:NodeJS.Timeout | null = null;

    private pivotX:number;
    private pivotY:number;
    private radius:number;
    private currentAngle = 0;
    private baseSpeed:number;
    private readonly UPDATE_DELAY = 200;

    constructor(scene:Scene, params:OrbitSpiderParams) {
        super(scene, params);
        this.scene = scene;

        this.width = 80;
        this.height = 50;
        this.bulletHit = { width: 80, height: 50 };
        this.playerTouch = { width: 48, height: 30 };
        this.color = "black";
        this.tint = 0x222222;
        this.spriteKey = "monster_spider";
        this.tier = "yellow";
        this.exp = 40;
        this.health = 100;
        this.maxHealth = 100;
        this.damageValue = 50;
        this.attackInterval = 1000;

        this.baseSpeed = 200 + Math.round(Math.random() * 50);
        this.pivotX = params.startX;
        this.pivotY = params.startY;
        this.radius = params.radius || 200;

        this.currentAngle = Math.random() * Math.PI * 2;
        this.calculateNextMove();
        this.move();
    }

    private calculateNextMove() {
        const timeStep = this.UPDATE_DELAY / 1000;
        const currentX = this.pivotX + Math.cos(this.currentAngle) * this.radius;
        const currentY = this.pivotY + Math.sin(this.currentAngle) * this.radius;
        const angularSpeed = this.baseSpeed / this.radius;
        const nextAngle = this.currentAngle + (angularSpeed * timeStep);
        const nextX = this.pivotX + Math.cos(nextAngle) * this.radius;
        const nextY = this.pivotY + Math.sin(nextAngle) * this.radius;
        const dx = nextX - currentX;
        const dy = nextY - currentY;
        const chordDistance = Math.hypot(dx, dy);

        this.startX = currentX;
        this.startY = currentY;
        this.rotation = Math.atan2(dy, dx);
        this.speedInSecond = chordDistance / timeStep;
        this.updatedAt = new Date().toISOString();
        this.currentAngle = nextAngle;
    }

    protected restartMovement() {
        this.move();
    }

    move() {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
        this.moveInterval = setInterval(() => {
            this.calculateNextMove();
            this.scene.emit("enemiesUpdated", { enemy: this.toJSON() });
        }, this.UPDATE_DELAY);
    }
}
