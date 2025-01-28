import { Server } from "socket.io";

import { rotate, calcTimedPoint } from "./../utils/geometry";
import { Enemies } from "./Enemies";
import { Missiles } from "./Missiles";
import { Players } from "./Players";
import { Enemy, Missile } from "../types";

export class Scene {

    io:Server;

    width = 700;
    height = 700;

    enemiesCollection:Enemies;
    missilesCollection:Missiles;
    playersCollection:Players;

    constructor(io:Server) {
        this.io = io;
        this.enemiesCollection = new Enemies(this);
        this.missilesCollection = new Missiles(this);
        this.playersCollection = new Players(this);

        setInterval(() => {
            this.verifyScene();
        }, 100);
    }

    verifyScene () {
        const players = this.playersCollection.getPlayers();
        const enemies = this.enemiesCollection.getEnemies();
        const missiles = this.missilesCollection.getMissiles();

        missiles.forEach((missile:Missile) => {
            const missileCoords = calcTimedPoint(
                missile.startX, missile.startY, missile.rotation, missile.speedInSecond, missile.createdAt
            );
            enemies.forEach((enemy:Enemy) => {
                const enemyCoords = calcTimedPoint(
                    enemy.startX, enemy.startY, enemy.rotation, enemy.speedInSecond, enemy.updatedAt
                );
                const rotatedEnemy = rotate(enemyCoords.x, enemyCoords.y, enemy.rotation);
                const rotatedMissile = rotate(missileCoords.x, missileCoords.y, enemy.rotation);
                if (
                    rotatedMissile.x > rotatedEnemy.x &&
                    rotatedMissile.x < rotatedEnemy.x + enemy.width &&
                    rotatedMissile.y > rotatedEnemy.y &&
                    rotatedMissile.y < rotatedEnemy.y + enemy.length
                ) {
                    this.missilesCollection.removeMissile(missile.id);
                }
            });
        });
    }
}