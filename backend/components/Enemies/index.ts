import { randomUUID } from "crypto";

import { Enemy } from "../../types";
import { Scene } from "../Scene";

export class Enemies {

    scene:Scene;
    items:Enemy[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
        const createdAt = new Date().toISOString();
        const enemy = {
            id: randomUUID(),
            color: "black",
            length: 50,
            width: 80,
            speedInSecond: 30,
            rotation: 0.1,
            startX: 500,
            startY: 500,
            createdAt: createdAt,
            updatedAt: createdAt
        };
        this.items.push(enemy);

        setInterval(() => {
            const currentTime = new Date();
            const timeDistSeconds = (
                currentTime.getTime() - new Date(enemy.updatedAt).getTime()
            ) / 1000;

            const cos = Math.cos(enemy.rotation);
            const sin = Math.sin(enemy.rotation);
            const dx = -cos * (enemy.speedInSecond * timeDistSeconds);
            const dy = -sin * (enemy.speedInSecond * timeDistSeconds);

            enemy.startX += dx;
            enemy.startY += dy;
            enemy.rotation += 0.5;
            enemy.updatedAt = currentTime.toISOString();

            this.scene.io.emit("enemiesUpdated", <any>{
                serverCurrentDateTime: new Date().toISOString(),
                enemy: enemy
            });
        }, 5000);
    }

    getEnemiesWithServerTime () {
        return {
            serverCurrentDateTime: new Date().toISOString(),
            enemies: this.items
        };
    }

    getEnemies () {
        return this.items;
    }
}