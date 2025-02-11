import * as PIXI from "pixi.js";
import {Enemy} from "./Enemy";
import {App} from "../../App";
import {BackendScene, BackendEnemy} from "../../Types";

interface BackendEnemyUpdatedSocket {
    enemy: BackendEnemy,
    serverCurrentDateTime: string
}

export class EnemiesCollection {

    app:App;
    socket = null;
    enemies:Enemy[] = [];

    constructor (app:App, backendScene:BackendScene) {
        this.app = app;

        this.enemiesFromBackendScene(backendScene);

        this.app.socket.on("enemiesUpdated", (beObj:BackendEnemyUpdatedSocket) => {
            const existEnemy = this.enemies.find(el => el.id === beObj.enemy.id);
            if (existEnemy) {
                existEnemy.remove();
                this.enemies = this.enemies.filter(el => el.id !== beObj.enemy.id);
            }
            const enemy = new Enemy(this.app, beObj.enemy, beObj.serverCurrentDateTime);
            this.enemies.push(enemy);
            app.pixiApp.stage.addChild(enemy.pixiObj);
        });

        this.app.socket.on("enemiesRemoved", (beObj:BackendEnemyUpdatedSocket) => {
            const existEnemy = this.enemies.find(el => el.id === beObj.enemy.id);
            if (existEnemy) {
                existEnemy.remove();
                this.enemies = this.enemies.filter(el => el.id !== beObj.enemy.id);
            }
        });
    }

    enemiesFromBackendScene (backendScene:BackendScene) {
        this.enemies.forEach(el => {
            el.remove();
        });
        this.enemies = [];
        backendScene.enemies.forEach((el:BackendEnemy) => {
            const enemy = new Enemy(this.app, el, backendScene.serverCurrentDateTime);
            this.enemies.push(enemy);
            this.app.pixiApp.stage.addChild(enemy.pixiObj);
        });
    }

    getEnemies () {
        return this.enemies;
    }
}

export default EnemiesCollection;