import { Scene } from "../Scene";
import { BaseEnemy } from "./BaseEnemy";
import { EnemyParams } from "../../types";
import { ENEMIES } from "../../configs/Enemies";

export interface SpiderParams extends EnemyParams {
    radius?:number;
}

export class Spider extends BaseEnemy {

    moveInterval:NodeJS.Timeout | null = null;

    private pivotX:number;
    private pivotY:number;
    private radius:number;
    private currentAngle:number = 0;

    // Храним базовую скорость отдельно, чтобы не перезаписывать this.speedInSecond
    private baseSpeed:number;

    private readonly UPDATE_DELAY = 500;

    constructor(scene:Scene, params:SpiderParams) {
        super(scene, params);
        this.scene = scene;

        this.width = ENEMIES.Spider.width;
        this.length = ENEMIES.Spider.length;
        this.color = "black";
        this.health = ENEMIES.Spider.health;
        this.maxHealth = ENEMIES.Spider.health;
        this.damageValue = ENEMIES.Spider.damage;
        this.attackInterval = ENEMIES.Spider.attackInterval;

        // Запоминаем реальную скорость из конфига
        this.baseSpeed = ENEMIES.Spider.speed + Math.round(Math.random() * 50);

        this.pivotX = params.startX;
        this.pivotY = params.startY;
        this.radius = params.radius || 200;

        this.currentAngle = Math.random() * Math.PI * 2;
        this.calculateNextMove();
        this.move();
    }

    private calculateNextMove() {
        const timeStep = this.UPDATE_DELAY / 1000;

        // А. Где мы сейчас (Точка А)
        const currentX = this.pivotX + Math.cos(this.currentAngle) * this.radius;
        const currentY = this.pivotY + Math.sin(this.currentAngle) * this.radius;

        // Б. Где мы будем (Точка Б)
        const angularSpeed = this.baseSpeed / this.radius;
        const nextAngle = this.currentAngle + (angularSpeed * timeStep);

        const nextX = this.pivotX + Math.cos(nextAngle) * this.radius;
        const nextY = this.pivotY + Math.sin(nextAngle) * this.radius;

        // В. Вычисляем хорду
        const dx = nextX - currentX;
        const dy = nextY - currentY;
        const chordDistance = Math.hypot(dx, dy);

        // Г. Обновляем свойства объекта (их увидит клиент при создании)
        this.startX = currentX;
        this.startY = currentY;
        this.rotation = Math.atan2(dy, dx) + Math.PI; // Смотрим на следующую точку
        this.speedInSecond = chordDistance / timeStep; // Скорость для прохождения хорды
        this.updatedAt = new Date().toISOString();

        // Д. Сдвигаем угол в будущее для следующего шага
        this.currentAngle = nextAngle;
    }

    move() {
        this.moveInterval = setInterval(() => {
            this.calculateNextMove();
            this.scene.emit("enemiesUpdated", { enemy: this.toJSON() });
        }, this.UPDATE_DELAY);
    }
}