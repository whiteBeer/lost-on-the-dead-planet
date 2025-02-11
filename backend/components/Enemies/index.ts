import {Scene} from "../Scene";
import {Spider} from "./Spider";
import {Zombie} from "./Zombie";

export class Enemies {

    scene:Scene;
    enemies:any[] = [];

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