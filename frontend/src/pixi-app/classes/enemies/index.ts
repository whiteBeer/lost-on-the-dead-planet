import { Scene } from "../Scene";
import { Enemy } from "./Enemy";
import { App } from "../../App";
import { BackendScene, BackendEnemy } from "../../Types";

interface IBackendEnemyUpdatedSocket {
    enemy:BackendEnemy,
    serverCurrentDateTime:string
}

export class EnemiesCollection {

    app:App;
    scene:Scene;
    enemies:Enemy[] = [];
    private debugHitboxes = false;

    constructor(app:App, scene:Scene, backendScene:BackendScene) {
        this.app = app;
        this.scene = scene;

        this.enemiesFromBackendScene(backendScene);

        this.app.socket?.on("enemiesUpdated", (beObj:IBackendEnemyUpdatedSocket) => {
            const existEnemy = this.enemies.find(el => el.getId() === beObj.enemy.id);
            if (existEnemy) {
                existEnemy.update(beObj.enemy, beObj.serverCurrentDateTime);
            } else {
                this.addEnemy(beObj.enemy, beObj.serverCurrentDateTime);
            }
        });

        this.app.socket?.on("enemiesAdded", (beObj:IBackendEnemyUpdatedSocket) => {
            this.addEnemy(beObj.enemy, beObj.serverCurrentDateTime);
        });

        this.app.socket?.on("enemiesRemoved", (beObj:IBackendEnemyUpdatedSocket) => {
            this.removeEnemy(beObj.enemy.id);
        });

        this.app.socket?.on("enemiesDamaged", (beObj:IBackendEnemyUpdatedSocket) => {
            const existEnemy = this.enemies.find(el => el.getId() === beObj.enemy.id);
            if (existEnemy) {
                existEnemy.setHealth(beObj?.enemy?.health || 0);
            }
        });
    }

    addEnemy(enemyJson:BackendEnemy, serverCurrentDateTime:string) {
        if (this.enemies.find(el => el.getId() === enemyJson.id)) {
            return;
        }
        const enemy = new Enemy(this.app, enemyJson, serverCurrentDateTime);
        enemy.setDebugVisible(this.debugHitboxes);
        this.enemies.push(enemy);
        this.scene.addToScene(enemy.getPixiObj());
    }

    removeEnemy(id:string) {
        const existEnemy = this.enemies.find(el => el.getId() === id);
        if (existEnemy) {
            existEnemy.clear();
            this.scene.removeFromScene(existEnemy.getPixiObj());
            this.enemies = this.enemies.filter(el => el.getId() !== id);
        }
    }

    enemiesFromBackendScene(backendScene:BackendScene) {
        this.enemies.forEach(el => {
            el.clear();
            this.scene.removeFromScene(el.getPixiObj());
        });
        this.enemies = [];
        backendScene.enemies.forEach((el:BackendEnemy) => {
            this.addEnemy(el, backendScene.serverCurrentDateTime);
        });
    }

    setDebugHitboxes(on:boolean) {
        this.debugHitboxes = on;
        this.enemies.forEach(enemy => enemy.setDebugVisible(on));
    }

    toggleDebugHitboxes() {
        this.setDebugHitboxes(!this.debugHitboxes);
    }

    getEnemies() {
        return this.enemies;
    }
}

export default EnemiesCollection;
