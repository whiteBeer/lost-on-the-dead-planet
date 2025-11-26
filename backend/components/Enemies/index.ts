import {Scene} from "../Scene";
import {Spider} from "./Spider";
import {Zombie} from "./Zombie";
import {BaseEnemy} from "./BaseEnemy";

export class Enemies {

    private readonly scene:Scene;
    private enemies:BaseEnemy[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    addZombie () {
        this.enemies.push(new Zombie(this.scene, {
            rotation: Math.PI,
            startX: -100,
            startY: -100 + Math.round(Math.random() * 1000)
        }));
    }

    addSpider () {
        this.enemies.push(new Spider(this.scene, {
            rotation: 0.1,
            startX: 500 + Math.round(Math.random() * 300),
            startY: 500 + Math.round(Math.random() * 300)
        }));
    }

    removeAllEnemies () {
        this.enemies.forEach(el => {
            el.remove();
        });
    }

    damageEnemyById (enemyId:string, missileDamage:number) {
        const enemy = this.enemies.find(el => el.id === enemyId);
        if (enemy) {
            enemy.damage(missileDamage);
            if (enemy.health <= 0) {
                this.removeEnemyById(enemyId);
                this.scene.emit("enemiesRemoved", { enemy: enemy.toJSON() });
            } else {
                this.scene.emit("enemiesDamaged", { enemy: enemy.toJSON() });
            }
        }
    }

    removeEnemyById (enemyId:string) {
        const enemy = this.enemies.find(el => el.id === enemyId);
        if (enemy) {
            enemy.remove();
            this.enemies = this.enemies.filter(el => el.id !== enemyId);
        }
    }

    getEnemies () {
        return this.enemies;
    }

    getEnemiesJSON () {
        return this.enemies.map(el => el.toJSON());
    }

}