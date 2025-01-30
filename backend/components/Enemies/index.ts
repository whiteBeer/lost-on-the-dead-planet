import {Scene} from "../Scene";
import {Spider} from "./Spider";
import {Zombie} from "./Zombie";

export class Enemies {

    scene:Scene;
    enemies:any[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
        this.enemies.push(new Spider(scene, {
            rotation: 0.1,
            startX: 500,
            startY: 500
        }));
        this.enemies.push(new Zombie(scene, {
            rotation: Math.PI,
            startX: -100,
            startY: -100
        }));
        // this.enemies.push(new Zombie(scene, {
        //     rotation: Math.PI,
        //     startX: 1000,
        //     startY: 1000
        // }));
    }

    getEnemiesWithServerTime () {
        return {
            serverCurrentDateTime: new Date().toISOString(),
            enemies: this.enemies.map(el => el.toJSON())
        };
    }

    getEnemies () {
        return this.enemies;
    }
}