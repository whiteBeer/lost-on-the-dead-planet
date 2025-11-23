import {checkLineRectangleCollision, calcTimedPoint} from "../utils/geometry";
import {Enemies} from "./Enemies";
import {Missiles} from "./Missiles";
import {Players} from "./Players";
import {clearInterval} from "timers";
import {Rectangle} from "../types";

export class Scene {

    verifyInterval:NodeJS.Timeout;
    roomId = "";
    width = 1000;
    height = 1000;

    enemiesCollection:Enemies;
    missilesCollection:Missiles;
    playersCollection:Players;

    constructor(roomId:string) {
        this.roomId = roomId;

        this.enemiesCollection = new Enemies(this);
        this.missilesCollection = new Missiles(this);
        this.playersCollection = new Players(this);

        this.verifyInterval = setInterval(() => {
            this.verifyScene();
        }, 30);
    }

    destroy () {
        clearInterval(this.verifyInterval);
    }

    newGame () {
        this.enemiesCollection.removeAllEnemies();
        this.enemiesCollection = new Enemies(this);
        this.enemiesCollection.addSpider();
        this.enemiesCollection.addZombie();

        clearInterval(this.verifyInterval);
        this.verifyInterval = setInterval(() => {
            this.verifyScene();
        }, 30);
    }

    getScene () {
        return {
            serverCurrentDateTime: new Date().toISOString(),
            width: this.width,
            height: this.height,
            players: this.playersCollection.getPlayers(),
            enemies: this.enemiesCollection.getEnemiesJSON(),
            missiles: this.missilesCollection.getMissilesJSON()
        };
    }

    verifyScene () {
        const players = this.playersCollection.getPlayers();
        const enemies = this.enemiesCollection.getEnemies();
        const missiles = this.missilesCollection.getMissiles();

        // Проверяем столкновения пуль с врагами
        missiles.forEach((missile) => {
            const currentMissilePos = calcTimedPoint(
                missile.startX, missile.startY, missile.rotation, missile.speedInSecond, missile.createdAt
            );

            // Получаем предыдущую позицию пули или используем стартовую позицию игрока
            let previousPos = missile.previousPos;

            if (!previousPos) {
                // Первая проверка - используем позицию игрока как предыдущую
                const owner = this.playersCollection.getPlayerById(missile.ownerId);
                if (owner) {
                    previousPos = {
                        x: owner.pageX,
                        y: owner.pageY,
                        timestamp: Date.parse(missile.createdAt)
                    };
                } else {
                    // Если игрок не найден, используем стартовую позицию пули
                    previousPos = {
                        x: missile.startX,
                        y: missile.startY,
                        timestamp: Date.parse(missile.createdAt)
                    };
                }
            }

            // Сортируем врагов по расстоянию от начала траектории пули
            const sortedEnemies = [...enemies].sort((a, b) => {
                const aPos = calcTimedPoint(a.startX, a.startY, a.rotation, a.speedInSecond, a.updatedAt);
                const bPos = calcTimedPoint(b.startX, b.startY, b.rotation, b.speedInSecond, b.updatedAt);

                const distA = Math.sqrt(Math.pow(aPos.x - previousPos.x, 2) + Math.pow(aPos.y - previousPos.y, 2));
                const distB = Math.sqrt(Math.pow(bPos.x - previousPos.x, 2) + Math.pow(bPos.y - previousPos.y, 2));

                return distA - distB;
            });

            // Проверяем столкновение по траектории от предыдущей до текущей позиции
            let hitEnemy = false;
            for (const enemy of sortedEnemies) {
                const enemyPos = calcTimedPoint(
                    enemy.startX, enemy.startY, enemy.rotation, enemy.speedInSecond, enemy.updatedAt
                );

                if (checkLineRectangleCollision(previousPos, currentMissilePos, enemyPos, enemy as Rectangle)) {
                    this.missilesCollection.removeMissileById(missile.id);
                    this.enemiesCollection.damageEnemyById(enemy.id, missile.damage);
                    hitEnemy = true;
                    break; // Прерываем цикл после первого попадания
                }
            }

            // Если пуля не попала ни в кого, сохраняем позицию для следующей проверки
            if (!hitEnemy) {
                missile.previousPos = {
                    x: currentMissilePos.x,
                    y: currentMissilePos.y,
                    timestamp: Date.now()
                };
            }
        });
    }
}