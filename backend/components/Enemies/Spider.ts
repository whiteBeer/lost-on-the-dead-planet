import {Scene} from "../Scene";
import {BaseEnemy} from "./BaseEnemy";
import {EnemyParams} from "../../types";

export class Spider extends BaseEnemy {

    moveInterval: NodeJS.Timeout|null = null;

    constructor(scene:Scene, params:EnemyParams) {
        super(scene, params);
        this.scene = scene;
        this.width = 80;
        this.length = 50;
        this.color = "black";
        this.speedInSecond = 30;
        this.health = 100;
        this.maxHealth = 100;

        this.move();
    }

    move () {
        this.moveInterval = setInterval(() => {
            const currentTime = new Date();
            const timeDistSeconds = (
                currentTime.getTime() - new Date(this.updatedAt).getTime()
            ) / 1000;

            const cos = Math.cos(this.rotation);
            const sin = Math.sin(this.rotation);
            const dx = -cos * (this.speedInSecond * timeDistSeconds);
            const dy = -sin * (this.speedInSecond * timeDistSeconds);

            this.startX += dx;
            this.startY += dy;
            this.rotation += 0.5;
            this.updatedAt = currentTime.toISOString();

            this.scene.emit("enemiesUpdated", { enemy: this.toJSON() });
        }, 5000);
    }
}