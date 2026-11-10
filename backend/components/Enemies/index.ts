import { Scene } from "../Scene";
import { OrbitSpider } from "./OrbitSpider";
import { BaseEnemy } from "./BaseEnemy";
import { EnemyTier } from "../../configs/Enemies";
import { calcTimedPoint } from "../../utils/geometry";
import { dropChanceForWave } from "../../configs/Waves";
import { rollWeaponDrop } from "../../configs/Weapons";
import { createEnemyById, createEnemyForTier } from "./createEnemy";

export class Enemies {

    private readonly scene:Scene;
    private readonly enemies:BaseEnemy[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    spawnTier(
        tier:EnemyTier,
        x:number,
        y:number,
        hpMul = 1,
        damageMul = 1,
        speedMul = 1,
        fireRateMul = 1,
        wave = 1
    ) {
        const enemy = createEnemyForTier(this.scene, tier, x, y, hpMul, damageMul, speedMul, fireRateMul, wave);
        this.enemies.push(enemy);
        this.scene.emit("enemiesAdded", { enemy: enemy.toJSON() });
        return enemy;
    }

    spawnById(
        enemyId:string,
        x:number,
        y:number,
        hpMul = 1,
        damageMul = 1,
        speedMul = 1,
        colorTier:EnemyTier = "green"
    ) {
        const enemy = createEnemyById(this.scene, enemyId, {
            rotation: 0,
            startX: x,
            startY: y,
            hpMul,
            damageMul,
            speedMul,
            colorTier
        });
        this.enemies.push(enemy);
        this.scene.emit("enemiesAdded", { enemy: enemy.toJSON() });
        return enemy;
    }

    addZombie() {
        this.spawnTier("green", -100, -100 + Math.round(Math.random() * 1000));
    }

    addSpider() {
        this.enemies.push(new OrbitSpider(this.scene, {
            rotation: 0.1,
            startX: 500,
            startY: 500,
            radius: 200 + Math.round(Math.random() * 200)
        }));
    }

    removeAllEnemies() {
        const removed = [...this.enemies];
        removed.forEach(el => {
            el.remove();
            this.scene.emit("enemiesRemoved", { enemy: el.toJSON() });
        });
        this.enemies.length = 0;
    }

    getEnemyById(id:string):BaseEnemy | undefined {
        return this.enemies.find(el => el.id === id);
    }

    damageEnemyById(
        enemyId:string,
        missileDamage:number,
        killerSocketId?:string,
        hitX?:number,
        hitY?:number,
        dir?:number
    ) {
        const enemy = this.getEnemyById(enemyId);
        if (!enemy) {
            return false;
        }

        enemy.damage(missileDamage);

        if (hitX !== undefined && hitY !== undefined) {
            this.scene.emit("hitFx", {
                x: hitX,
                y: hitY,
                tint: enemy.tint,
                dir: dir ?? 0
            });
        }

        if (enemy.health <= 0) {
            this.killEnemy(enemy, killerSocketId);
            return true;
        }

        this.scene.emit("enemiesDamaged", { enemy: enemy.toJSON() });
        return false;
    }

    private killEnemy(enemy:BaseEnemy, killerSocketId?:string) {
        const pos = calcTimedPoint(
            enemy.startX, enemy.startY, enemy.rotation, enemy.speedInSecond, enemy.updatedAt
        );

        this.scene.emit("enemyDied", {
            id: enemy.id,
            x: pos.x,
            y: pos.y,
            tint: enemy.tint,
            spriteKey: enemy.spriteKey,
            tier: enemy.tier,
            width: enemy.width,
            height: enemy.height
        });

        if (killerSocketId) {
            const killer = this.scene.playersCollection.getPlayerById(killerSocketId);
            if (killer) {
                killer.onKill(enemy.exp);
            }
        }

        const wave = this.scene.waveDirector.getWave();
        if (Math.random() < dropChanceForWave(wave)) {
            const weaponId = rollWeaponDrop(wave);
            this.scene.pickupsCollection.addWeaponPickup(pos.x, pos.y, weaponId);
        }

        this.removeEnemyById(enemy.id);

        if (this.enemies.length === 0) {
            this.scene.waveDirector.onEnemiesCleared();
        }
    }

    removeEnemyById(enemyId:string) {
        const index = this.enemies.findIndex(el => el.id === enemyId);
        if (index !== -1) {
            const enemy = this.enemies[index];
            enemy.remove();
            this.enemies.splice(index, 1);
            this.scene.emit("enemiesRemoved", { enemy: enemy.toJSON() });
        }
    }

    getEnemies():readonly BaseEnemy[] {
        return this.enemies;
    }

    getAliveCount() {
        return this.enemies.length;
    }

    getEnemiesJSON() {
        return this.enemies.map(el => el.toJSON());
    }

    pauseAll() {
        this.enemies.forEach((enemy) => enemy.pauseMovement());
    }

    resumeAll() {
        this.enemies.forEach((enemy) => enemy.resumeMovement());
    }
}
