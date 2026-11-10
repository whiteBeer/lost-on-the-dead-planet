import { EventEmitter } from "events";
import {
    checkLineRectangleCollision,
    checkCircleRotatedRectangleCollision,
    checkLineCircleCollision,
    calcTimedPoint
} from "../utils/geometry";
import { Enemies } from "./Enemies";
import { Missiles } from "./Missiles";
import { Players } from "./Players";
import { Pickups } from "./Pickups";
import { WaveDirector } from "./WaveDirector";
import { BaseEnemy } from "./Enemies/BaseEnemy";
import { clearInterval } from "timers";
import { WEAPONS } from "../configs/Weapons";
import { PLAYER_CONFIG } from "../configs/Players";
import { SCENE_CONFIG } from "../configs/Scene";
import { ENEMIES } from "../configs/Enemies";
import { PERKS } from "../configs/Perks";
interface CachedEnemy {
    original:BaseEnemy;
    x:number;
    y:number;
}

export type ScenePhase = "lobby" | "playing";

export class Scene extends EventEmitter {

    private verifyInterval:NodeJS.Timeout | null = null;
    private readonly roomId:string = "";
    private readonly width:number = SCENE_CONFIG.width;
    private readonly height:number = SCENE_CONFIG.height;
    private readonly edgePadX:number = SCENE_CONFIG.edgePadX;
    private readonly edgePadY:number = SCENE_CONFIG.edgePadY;
    private phase:ScenePhase = "lobby";
    private hostSocketId:string | null = null;
    private paused = false;
    private spectators = new Set<string>();

    enemiesCollection:Enemies;
    missilesCollection:Missiles;
    playersCollection:Players;
    pickupsCollection:Pickups;
    waveDirector:WaveDirector;

    constructor(roomId:string) {
        super();
        this.roomId = roomId;

        this.enemiesCollection = new Enemies(this);
        this.missilesCollection = new Missiles(this);
        this.playersCollection = new Players(this);
        this.pickupsCollection = new Pickups(this);
        this.waveDirector = new WaveDirector(this);

        this.startGameLoop();
    }

    getPhase() {
        return this.phase;
    }

    isLobby() {
        return this.phase === "lobby";
    }

    isPaused() {
        return this.paused;
    }

    isJoinable() {
        return this.phase === "lobby";
    }

    addSpectator(socketId:string) {
        this.spectators.add(socketId);
    }

    removeSpectator(socketId:string) {
        this.spectators.delete(socketId);
    }

    isSpectator(socketId:string) {
        return this.spectators.has(socketId);
    }

    setPaused(paused:boolean) {
        if (this.phase !== "playing") {
            return false;
        }
        if (this.paused === paused) {
            return true;
        }
        this.paused = paused;
        if (paused) {
            this.waveDirector.pause();
            this.enemiesCollection.pauseAll();
        } else {
            this.enemiesCollection.resumeAll();
            this.waveDirector.resume();
        }
        this.emit("gamePaused", { paused: this.paused });
        return true;
    }

    togglePause() {
        return this.setPaused(!this.paused);
    }

    getHostSocketId() {
        return this.hostSocketId;
    }

    ensureHost(socketId:string) {
        if (!this.hostSocketId) {
            this.hostSocketId = socketId;
        }
    }

    reassignHostIfNeeded() {
        const players = this.playersCollection.getPlayers();
        if (players.length === 0) {
            this.hostSocketId = null;
            return;
        }
        if (!this.hostSocketId || !players.some(p => p.socketId === this.hostSocketId)) {
            this.hostSocketId = players[0].socketId;
        }
    }

    /** Можно стартовать: один игрок ИЛИ все готовы. */
    canHostStart() {
        const players = this.playersCollection.getPlayers();
        if (players.length === 0) return false;
        if (players.length === 1) return true;
        return this.playersCollection.areAllReady();
    }

    emitLobbyState() {
        this.emit("lobbyUpdated", {
            phase: this.phase,
            hostSocketId: this.hostSocketId,
            canStart: this.canHostStart(),
            players: this.playersCollection.getPlayersJSON()
        });
    }

    /** Хост жмёт «Поехали». */
    startGameByHost(socketId:string) {
        if (this.phase !== "lobby") {
            return false;
        }
        if (socketId !== this.hostSocketId) {
            return false;
        }
        if (!this.canHostStart()) {
            return false;
        }
        this.phase = "playing";
        this.playersCollection.getPlayers().forEach(p => {
            p.setReady(true);
            p.grantSpawnProtection();
        });
        this.emit("gameStarted", {
            phase: this.phase,
            hostSocketId: this.hostSocketId,
            players: this.playersCollection.getPlayersJSON()
        });
        this.waveDirector.start();
        return true;
    }

    setPlayerReady(socketId:string, ready:boolean) {
        if (this.phase !== "lobby") {
            return false;
        }
        const player = this.playersCollection.getPlayerById(socketId);
        if (!player) {
            return false;
        }
        player.setReady(ready);
        this.emitLobbyState();
        return true;
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
        if (this.phase !== "playing" || this.paused) {
            return;
        }
        this.playersCollection.tick(0.02);
        this.pickupsCollection.removeExpired();
        this.pickupsCollection.autoPickupNearPlayers();
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
        this.verifyEnemyProjectilePlayerCollisions();
        this.verifyPlayerEnemyCollisions(cachedEnemies);
    }

    destroy() {
        if (this.verifyInterval) {
            clearInterval(this.verifyInterval);
            this.verifyInterval = null;
        }
        this.waveDirector.destroy();
        this.removeAllListeners();
    }

    /** Если живых нет — стоп волн и чистка арены (ждём «Начать заново»). */
    wipeIfNoSurvivors(reason:"allDead" | "empty" = "allDead") {
        if (this.phase !== "playing") {
            return false;
        }
        if (this.playersCollection.getLivePlayers().length > 0) {
            return false;
        }
        this.paused = false;
        this.waveDirector.reset();
        this.enemiesCollection.removeAllEnemies();
        this.missilesCollection.removeAll();
        this.pickupsCollection.removeAll();
        this.emit("gameOver", { reason, wave: 0 });
        this.emit("sceneReset", this.getScene());
        return true;
    }

    /** После смерти всех / паузы — снова лобби, ждут «Я готов». */
    newGame() {
        this.phase = "lobby";
        this.paused = false;
        this.waveDirector.reset();
        for (const id of [...this.spectators]) {
            if (this.playersCollection.addPlayer(id)) {
                this.spectators.delete(id);
            }
        }
        this.playersCollection.getPlayers().forEach((player) => {
            player.respawn();
            player.pageX = this.width / 2 + (Math.random() - 0.5) * 200;
            player.pageY = this.height / 2 + (Math.random() - 0.5) * 200;
        });
        this.enemiesCollection.removeAllEnemies();
        this.missilesCollection.removeAll();
        this.pickupsCollection.removeAll();
        this.startGameLoop();
        this.emit("sceneReset", this.getScene());
        this.emitLobbyState();
    }

    getScene() {
        return {
            serverCurrentDateTime: new Date().toISOString(),
            width: this.width,
            height: this.height,
            edgePadX: this.edgePadX,
            edgePadY: this.edgePadY,
            phase: this.phase,
            hostSocketId: this.hostSocketId,
            canStart: this.canHostStart(),
            paused: this.paused,
            wave: this.waveDirector.getDisplayWave(),
            waveAnnouncing: this.waveDirector.isAnnouncing(),
            players: this.playersCollection.getPlayersJSON(),
            enemies: this.enemiesCollection.getEnemiesJSON(),
            missiles: this.missilesCollection.getMissilesJSON(),
            pickups: this.pickupsCollection.getPickupsJSON()
        };
    }

    getSceneWithConfigs() {
        return {
            ...this.getScene(),
            configs: {
                weapons: WEAPONS,
                enemies: ENEMIES,
                perks: Object.fromEntries(PERKS.map(el => [el.id, {
                    name: el.name,
                    description: el.description,
                    icon: el.icon || "",
                    rarity: el.rarity
                }]))
            }
        };
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getEdgePadX() {
        return this.edgePadX;
    }

    getEdgePadY() {
        return this.edgePadY;
    }

    getRoomId() {
        return this.roomId;
    }

    private verifyEnemyMissileCollisions(cachedEnemies:CachedEnemy[]) {
        const missiles = this.missilesCollection.getMissiles();

        missiles.forEach((missile) => {
            if (missile.isEnemyShot()) {
                return;
            }

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
                if (missile.hitEnemyIds.includes(cachedEnemy.original.id)) {
                    continue;
                }

                const isHit = checkLineRectangleCollision(
                    previousPos,
                    currentMissilePos,
                    { x: cachedEnemy.x, y: cachedEnemy.y },
                    cachedEnemy.original.getBulletHitRect()
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
                const owner = this.playersCollection.getPlayerById(missile.ownerId);
                let damage = missile.damage;
                if (owner) {
                    // Крит / miss из перков
                    if (Math.random() < owner.stats.miss) {
                        damage = 0;
                    } else if (Math.random() < owner.stats.crit) {
                        damage *= owner.stats.critDamage;
                    }
                    if (owner.stats.lifesteal > 0 && damage > 0) {
                        owner.heal(damage * owner.stats.lifesteal);
                    }
                }

                this.enemiesCollection.damageEnemyById(
                    closestHitEnemy.original.id,
                    Math.round(damage),
                    missile.ownerId,
                    closestHitEnemy.x,
                    closestHitEnemy.y,
                    missile.rotation
                );

                missile.hitEnemyIds.push(closestHitEnemy.original.id);

                if (missile.pierceLeft > 0) {
                    missile.pierceLeft -= 1;
                    missile.previousPos = {
                        x: closestHitEnemy.x,
                        y: closestHitEnemy.y
                    };
                } else {
                    this.missilesCollection.removeMissileById(missile.id);
                }
            } else {
                missile.previousPos = {
                    x: currentMissilePos.x,
                    y: currentMissilePos.y
                };
            }
        });
    }

    /** Пули врагов → игроки */
    private verifyEnemyProjectilePlayerCollisions() {
        const missiles = this.missilesCollection.getMissiles();
        const players = this.playersCollection.getLivePlayers();
        if (players.length === 0) {
            return;
        }

        for (const missile of missiles) {
            if (!missile.isEnemyShot()) {
                continue;
            }

            const currentMissilePos = calcTimedPoint(
                missile.startX, missile.startY, missile.rotation, missile.speedInSecond, missile.createdAt
            );
            const previousPos = missile.previousPos || {
                x: missile.startX,
                y: missile.startY
            };
            // Базовый запас 8 ≈ радиус обычной пули; × bulletScale для босса
            const hitRadius = PLAYER_CONFIG.radius + 8 * (missile.bulletScale || 1);

            let hitPlayer = null as typeof players[number] | null;
            let minDistSq = Infinity;

            for (const player of players) {
                const isHit = checkLineCircleCollision(
                    previousPos,
                    currentMissilePos,
                    { x: player.pageX, y: player.pageY, radius: hitRadius }
                );
                if (!isHit) {
                    continue;
                }
                const distSq = Math.pow(player.pageX - previousPos.x, 2) +
                    Math.pow(player.pageY - previousPos.y, 2);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    hitPlayer = player;
                }
            }

            if (hitPlayer) {
                const damage = missile.damage;
                const died = hitPlayer.takeDamage(damage);
                this.missilesCollection.removeMissileById(missile.id);

                if (died) {
                    this.emit("playersDied", {
                        socketId: hitPlayer.socketId,
                        killedBy: missile.ownerId
                    });
                    this.wipeIfNoSurvivors("allDead");
                } else if (!hitPlayer.isDead) {
                    this.emit("playersDamaged", {
                        socketId: hitPlayer.socketId,
                        health: hitPlayer.health,
                        maxHealth: hitPlayer.maxHealth,
                        damage
                    });
                }
            } else {
                missile.previousPos = {
                    x: currentMissilePos.x,
                    y: currentMissilePos.y
                };
            }
        }
    }

    private verifyPlayerEnemyCollisions(cachedEnemies:CachedEnemy[]) {
        const players = this.playersCollection.getPlayers();
        const playerRadius = PLAYER_CONFIG.radius;
        for (const cachedEnemy of cachedEnemies) {
            const enemy = cachedEnemy.original;
            if (!enemy.canAttack()) {
                continue;
            }
            const enemyRect = enemy.getPlayerTouchRect(cachedEnemy.x, cachedEnemy.y);
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
                    const died = player.takeBite(damage);

                    enemy.attack();

                    if (died) {
                        this.emit("playersDied", {
                            socketId: player.socketId,
                            killedBy: enemy.id
                        });
                        this.wipeIfNoSurvivors("allDead");
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
