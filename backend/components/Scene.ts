import { EventEmitter } from "events";
import {
    checkLineRectangleCollision,
    checkCircleRotatedRectangleCollision,
    calcTimedPoint
} from "../utils/geometry";
import { Enemies } from "./Enemies";
import { Missiles } from "./Missiles";
import { Players } from "./Players";
import { BaseEnemy } from "./Enemies/BaseEnemy";
import { clearInterval } from "timers";
import { WEAPONS } from "../configs/Weapons";
import { PLAYER_CONFIG } from "../configs/Players";

interface CachedEnemy {
    original:BaseEnemy;
    x:number;
    y:number;
}

export class Scene extends EventEmitter {

    private verifyInterval:NodeJS.Timeout | null = null;
    private readonly roomId:string = "";
    private readonly width:number = 1000;
    private readonly height:number = 1000;

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

    private update() {
        const enemies = this.enemiesCollection.getEnemies();
        const cachedEnemies:CachedEnemy[] = enemies.map(enemy => {
            const pos = calcTimedPoint(
                enemy.startX, enemy.startY, enemy.rotation, enemy.speedInSecond, enemy.updatedAt
            );
            return {
                original: enemy,
                x: pos.x,
                y: pos.y
            };
        });
        this.verifyEnemyMissileCollisions(cachedEnemies);
        this.verifyPlayerEnemyCollisions(cachedEnemies);
    }

    destroy() {
        if (this.verifyInterval) {
            clearInterval(this.verifyInterval);
            this.verifyInterval = null;
        }
        this.removeAllListeners();
    }

    newGame() {
        this.playersCollection.getPlayers().forEach((player) => {
            player.respawn();
        });
        this.enemiesCollection.removeAllEnemies();
        this.enemiesCollection.addSpider();
        this.enemiesCollection.addZombie();

        this.startGameLoop();
    }

    getScene() {
        return {
            serverCurrentDateTime: new Date().toISOString(),
            width: this.width,
            height: this.height,
            players: this.playersCollection.getPlayersJSON(),
            enemies: this.enemiesCollection.getEnemiesJSON(),
            missiles: this.missilesCollection.getMissilesJSON()
        };
    }

    getSceneWithConfigs() {
        return {
            ...this.getScene(),
            configs: {
                weapons: WEAPONS
            }
        };
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getRoomId() {
        return this.roomId;
    }

    private verifyEnemyMissileCollisions(cachedEnemies:CachedEnemy[]) {
        const missiles = this.missilesCollection.getMissiles();

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

            let closestHitEnemy:CachedEnemy | null = null;
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

    private verifyPlayerEnemyCollisions(cachedEnemies:CachedEnemy[]) {
        const players = this.playersCollection.getPlayers();
        const playerRadius = PLAYER_CONFIG.radius;
        for (const cachedEnemy of cachedEnemies) {
            const enemy = cachedEnemy.original;
            if (!enemy.canAttack()) {
                continue;
            }
            const enemyRect = {
                x: cachedEnemy.x,
                y: cachedEnemy.y,
                width: enemy.width,
                length: enemy.length,
                rotation: enemy.rotation
            };
            for (const player of players) {
                if (player.isDead) {
                    continue;
                }
                const isHit = checkCircleRotatedRectangleCollision(
                    { x: player.pageX, y: player.pageY, radius: playerRadius },
                    enemyRect
                );
                if (isHit) {
                    const damage = enemy.damageValue;
                    const died = player.takeDamage(damage);

                    enemy.attack();

                    if (died) {
                        this.emit("playersDied", {
                            socketId: player.socketId,
                            killedBy: enemy.id
                        });
                    } else {
                        this.emit("playersDamaged", {
                            socketId: player.socketId,
                            health: player.health,
                            maxHealth: player.maxHealth,
                            damage: damage
                        });
                    }
                }
            }
        }
    }
}