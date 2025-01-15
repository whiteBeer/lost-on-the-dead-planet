import { config } from "../../config";
import { Enemy } from "../../types";
import { Scene } from "../Scene";

export class Enemies {

    scene:Scene;
    items:Enemy[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
        const createdAt = new Date().toISOString();
        const enemy = {
            color: "black",
            size: 50,
            speedInSecond: 50,
            rotation: 3.5,
            pageX: 300,
            pageY: 200,
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

            enemy.pageX += dx;
            enemy.pageY += dy;
            enemy.rotation += 1;
            enemy.updatedAt = currentTime.toISOString();

            this.scene.io.emit("allEnemies", this.getEnemiesWithServerTime());
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