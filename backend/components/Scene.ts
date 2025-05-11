import {rotate, calcTimedPoint} from "../utils/geometry";
import {Enemies} from "./Enemies";
import {Missiles} from "./Missiles";
import {Players} from "./Players";
import {BaseEnemy} from "./Enemies/BaseEnemy";
import {BaseMissile} from "./Missiles/BaseMissile";
import {clearInterval} from "timers";

export class Scene {

    verifyInterval:NodeJS.Timeout;

    width = 1000;
    height = 1000;

    enemiesCollection:Enemies;
    missilesCollection:Missiles;
    playersCollection:Players;

    constructor() {
        this.enemiesCollection = new Enemies(this);
        this.missilesCollection = new Missiles(this);
        this.playersCollection = new Players(this);

        this.verifyInterval = setInterval(() => {
            this.verifyScene();
        }, 50);
    }

    newGame () {
        this.enemiesCollection.removeAllEnemies();
        this.enemiesCollection = new Enemies(this);
        this.enemiesCollection.addSpider();
        this.enemiesCollection.addZombie();

        clearInterval(this.verifyInterval);
        this.verifyInterval = setInterval(() => {
            this.verifyScene();
        }, 50);
    }

    verifyScene () {
        const players = this.playersCollection.getPlayers();
        const enemies = this.enemiesCollection.getEnemies();
        const missiles = this.missilesCollection.getMissiles();

        missiles.forEach((missile:BaseMissile) => {
            const missileCoords = calcTimedPoint(
                missile.startX, missile.startY, missile.rotation, missile.speedInSecond, missile.createdAt
            );
            enemies.forEach((enemy:BaseEnemy) => {
                const enemyCoords = calcTimedPoint(
                    enemy.startX, enemy.startY, enemy.rotation, enemy.speedInSecond, enemy.updatedAt
                );
                const rotatedEnemy = rotate(enemyCoords.x, enemyCoords.y, enemy.rotation);
                const rotatedMissile = rotate(missileCoords.x, missileCoords.y, enemy.rotation);
                if (
                    rotatedMissile.x > rotatedEnemy.x - enemy.width/2 &&
                    rotatedMissile.x < rotatedEnemy.x + enemy.width/2 &&
                    rotatedMissile.y > rotatedEnemy.y - enemy.length/2 &&
                    rotatedMissile.y < rotatedEnemy.y + enemy.length/2
                ) {
                    this.missilesCollection.removeMissileById(missile.id);
                    this.enemiesCollection.damageEnemyById(enemy.id, missile.damage);
                }
            });
        });
    }
}