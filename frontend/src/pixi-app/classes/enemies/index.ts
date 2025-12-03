import { Enemy } from "./Enemy";
import { App } from "../../App";
import { BackendScene, BackendEnemy } from "../../Types";

interface IBackendEnemyUpdatedSocket {
    enemy:BackendEnemy,
    serverCurrentDateTime:string
}

export class EnemiesCollection {

    app:App;
    socket = null;
    enemies:Enemy[] = [];

    constructor(app:App, backendScene:BackendScene) {
        this.app = app;

        this.enemiesFromBackendScene(backendScene);

        this.app.socket?.on("enemiesUpdated", (beObj:IBackendEnemyUpdatedSocket) => {
            const existEnemy = this.enemies.find(el => el.getId() === beObj.enemy.id);
            if (existEnemy) {
                existEnemy.update(beObj.enemy, beObj.serverCurrentDateTime);
            }
        });

        this.app.socket?.on("enemiesRemoved", (beObj:IBackendEnemyUpdatedSocket) => {
            const existEnemy = this.enemies.find(el => el.getId() === beObj.enemy.id);
            if (existEnemy) {
                existEnemy.remove();
                this.enemies = this.enemies.filter(el => el.getId() !== beObj.enemy.id);
            }
        });

        this.app.socket?.on("enemiesDamaged", (beObj:IBackendEnemyUpdatedSocket) => {
            const existEnemy = this.enemies.find(el => el.getId() === beObj.enemy.id);
            if (existEnemy) {
                existEnemy.setHealth(beObj?.enemy?.health || 0);
            }
        });
    }

    enemiesFromBackendScene(backendScene:BackendScene) {
        this.enemies.forEach(el => {
            el.remove();
        });
        this.enemies = [];
        backendScene.enemies.forEach((el:BackendEnemy) => {
            const enemy = new Enemy(this.app, el, backendScene.serverCurrentDateTime);
            this.enemies.push(enemy);
            enemy.addToStage();
        });
    }

    getEnemies() {
        return this.enemies;
    }
}

export default EnemiesCollection;