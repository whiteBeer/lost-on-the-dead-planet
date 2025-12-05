import { Scene } from "../Scene";
import { Spider } from "./Spider";
import { Zombie } from "./Zombie";
import { BaseEnemy } from "./BaseEnemy";

export class Enemies {

    private readonly scene:Scene;
    private readonly enemies:BaseEnemy[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    addZombie() {
        this.enemies.push(new Zombie(this.scene, {
            rotation: Math.PI,
            startX: -100,
            startY: -100 + Math.round(Math.random() * 1000)
        }));
    }

    addSpider() {
        this.enemies.push(new Spider(this.scene, {
            rotation: 0.1,
            startX: 500,
            startY: 500,
            radius: 200 + Math.round(Math.random() * 200)
        }));
    }

    removeAllEnemies() {
        this.enemies.forEach(el => el.remove());
        // Очищаем массив без пересоздания объекта (оптимизация GC)
        this.enemies.length = 0;
    }

    getEnemyById(id:string):BaseEnemy | undefined {
        return this.enemies.find(el => el.id === id);
    }

    damageEnemyById(enemyId:string, missileDamage:number) {
        const enemy = this.getEnemyById(enemyId);
        if (enemy) {
            enemy.damage(missileDamage);
            if (enemy.health <= 0) {
                this.removeEnemyById(enemyId);
            } else {
                this.scene.emit("enemiesDamaged", { enemy: enemy.toJSON() });
            }
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

    getEnemiesJSON() {
        return this.enemies.map(el => el.toJSON());
    }
}