import { EventEmitter } from "events";
import {checkLineRectangleCollision, calcTimedPoint} from "../utils/geometry";
import {Enemies} from "./Enemies";
import {Missiles} from "./Missiles";
import {Players} from "./Players";
import {BaseEnemy} from "./Enemies/BaseEnemy";
import {clearInterval} from "timers";
import {WEAPONS} from "../configs/Weapons";

interface CachedEnemy {
    original: BaseEnemy;
    x: number;
    y: number;
}

export class Scene extends EventEmitter {

    private verifyInterval: NodeJS.Timeout | null = null;
    private readonly roomId: string = "";
    private readonly width: number = 1000;
    private readonly height: number = 1000;

    enemiesCollection:Enemies;
    missilesCollection:Missiles;
    playersCollection:Players;

    constructor(roomId:string) {
        super();
        this.roomId = roomId;

        this.enemiesCollection = new Enemies(this);
        this.missilesCollection = new Missiles(this);
        this.playersCollection = new Players(this);

        this.startGameLoop();
    }

    private startGameLoop() {
        if (this.verifyInterval) {
            clearInterval(this.verifyInterval);
        }
        this.verifyInterval = setInterval(() => {
            this.update();
        }, 20);
    }

    private update () {
        // TODO: add enemy vs player collisions
        this.verifyEnemyMissileCollisions();
    }

    destroy () {
        if (this.verifyInterval) {
            clearInterval(this.verifyInterval);
            this.verifyInterval = null;
        }
        this.removeAllListeners();
    }

    newGame () {
        this.enemiesCollection.removeAllEnemies();
        this.enemiesCollection.addSpider();
        this.enemiesCollection.addZombie();

        this.startGameLoop();
    }

    getScene () {
        return {
            serverCurrentDateTime: new Date().toISOString(),
            width: this.width,
            height: this.height,
            players: this.playersCollection.getPlayersJSON(),
            enemies: this.enemiesCollection.getEnemiesJSON(),
            missiles: this.missilesCollection.getMissilesJSON()
        };
    }

    getSceneWithConfigs () {
        return {
            ...this.getScene(),
            configs: {
                weapons: WEAPONS
            }
        };
    }

    getWidth () {
        return this.width;
    }

    getHeight () {
        return this.height;
    }

    getRoomId () {
        return this.roomId;
    }

    private verifyEnemyMissileCollisions() {
        const enemies = this.enemiesCollection.getEnemies();
        const missiles = this.missilesCollection.getMissiles();

        // 1. КЭШИРОВАНИЕ: Считаем позиции врагов ОДИН раз за кадр
        const cachedEnemies: CachedEnemy[] = enemies.map(enemy => {
            const pos = calcTimedPoint(
                enemy.startX, enemy.startY, enemy.rotation, enemy.speedInSecond, enemy.updatedAt
            );
            return {
                original: enemy,
                x: pos.x,
                y: pos.y
            };
        });

        missiles.forEach((missile) => {
            const currentMissilePos = calcTimedPoint(
                missile.startX, missile.startY, missile.rotation, missile.speedInSecond, missile.createdAt
            );

            let previousPos = missile.previousPos;
            if (!previousPos) {
                const owner = this.playersCollection.getPlayerById(missile.ownerId);
                if (owner) {
                    previousPos = { x: owner.pageX, y: owner.pageY };
                } else {
                    previousPos = { x: missile.startX, y: missile.startY };
                }
            }

            let closestHitEnemy: CachedEnemy | null = null;
            let minDistanceSq = Infinity;

            for (const cachedEnemy of cachedEnemies) {
                const isHit = checkLineRectangleCollision(
                    previousPos,
                    currentMissilePos,
                    { x: cachedEnemy.x, y: cachedEnemy.y },
                    cachedEnemy.original           // Размеры берем напрямую из врага
                );

                if (isHit) {
                    const distSq = Math.pow(cachedEnemy.x - previousPos.x, 2) +
                        Math.pow(cachedEnemy.y - previousPos.y, 2);

                    if (distSq < minDistanceSq) {
                        minDistanceSq = distSq;
                        closestHitEnemy = cachedEnemy;
                    }
                }
            }

            if (closestHitEnemy) {
                this.missilesCollection.removeMissileById(missile.id);
                this.enemiesCollection.damageEnemyById(closestHitEnemy.original.id, missile.damage);
            } else {
                missile.previousPos = {
                    x: currentMissilePos.x,
                    y: currentMissilePos.y
                };
            }
        });
    }
}