import { randomUUID } from "crypto";
import { EnemyParams, EnemyJSON, Rectangle } from "../../types";
import { Scene } from "../Scene";
import { clearInterval } from "timers";
import { EnemyTier, HitboxRect } from "../../configs/Enemies";
import { calcTimedPoint } from "../../utils/geometry";

export class BaseEnemy implements EnemyJSON, Rectangle {

    scene:Scene;
    moveInterval:NodeJS.Timeout|null = null;
    private movementPaused = false;
    private savedSpeedInSecond = 0;

    id:string;
    type = "";
    color = "black";
    health = -1;
    maxHealth = -1;

    /** Размер спрайта (и fallback для legacy width/height) */
    width = -1;
    height = -1;

    /** Rect попадания пулей */
    bulletHit:HitboxRect = { width: -1, height: -1 };
    /** Rect касания игрока — отдельно от bulletHit */
    playerTouch:HitboxRect = { width: -1, height: -1 };

    rotation = 0;
    defaultSpeedInSecond = 0;
    speedInSecond = 0;
    startX:number;
    startY:number;
    createdAt:string;
    updatedAt:string;

    public damageValue = 0;
    public attackInterval = 1000;
    private lastAttackTime = 0;

    tier:EnemyTier = "green";
    tint = 0xffffff;
    spriteKey = "";
    exp = 0;

    protected serverProps:any;

    constructor(scene:Scene, params:EnemyParams) {
        this.scene = scene;
        const createdAt = new Date().toISOString();
        this.id = randomUUID();
        this.startX = params.startX;
        this.startY = params.startY;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    /** Rectangle для checkLineRectangleCollision — только bulletHit */
    getBulletHitRect():Rectangle {
        return {
            width: this.bulletHit.width,
            height: this.bulletHit.height,
            rotation: this.rotation
        };
    }

    /** Rectangle касания — только playerTouch */
    getPlayerTouchRect(x:number, y:number) {
        return {
            x,
            y,
            width: this.playerTouch.width,
            height: this.playerTouch.height,
            rotation: this.rotation
        };
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
            this.moveInterval = null;
        }
    }

    pauseMovement() {
        if (this.movementPaused) {
            return;
        }
        this.movementPaused = true;
        if (this.moveInterval !== null) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
        const pos = calcTimedPoint(
            this.startX, this.startY, this.rotation, this.speedInSecond, this.updatedAt
        );
        this.startX = pos.x;
        this.startY = pos.y;
        this.savedSpeedInSecond = this.speedInSecond;
        this.speedInSecond = 0;
        this.updatedAt = new Date().toISOString();
        this.scene.emit("enemiesUpdated", { enemy: this.toJSON() });
    }

    resumeMovement() {
        if (!this.movementPaused) {
            return;
        }
        this.movementPaused = false;
        this.speedInSecond = this.savedSpeedInSecond;
        this.updatedAt = new Date().toISOString();
        this.restartMovement();
        this.scene.emit("enemiesUpdated", { enemy: this.toJSON() });
    }

    /** Подклассы перезапускают AI после паузы. */
    protected restartMovement() {
        // no-op for base
    }

    toJSON() {
        const {
            scene,
            serverProps,
            moveInterval,
            movementPaused,
            savedSpeedInSecond,
            ...json
        } = this;
        return json;
    }
}
