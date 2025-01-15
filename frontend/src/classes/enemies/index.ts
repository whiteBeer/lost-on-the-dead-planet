import * as PIXI from "pixi.js";
import {Enemy} from "./Enemy";
import {App} from "../../App";
import {BackendScene, BackendEnemy} from "../../Types";

export class EnemiesCollection {

    app:App;
    socket = null;
    enemies:Enemy[] = [];

    constructor (app:App, backendScene:BackendScene) {
        this.app = app;

        backendScene.enemies.forEach((el:BackendEnemy) => {
            const enemy = new Enemy(this.app, el, backendScene.serverCurrentDateTime);
            this.enemies.push(enemy);
            app.pixiApp.stage.addChild(enemy.pixiObj);
        });

        this.app.socket.on("allEnemies", (beObj:any) => {
            this.enemies.forEach(el => {
                el.remove();
            });
            beObj.enemies.forEach((el:BackendEnemy) => {
                const enemy = new Enemy(this.app, el, beObj.serverCurrentDateTime);
                this.enemies.push(enemy);
                app.pixiApp.stage.addChild(enemy.pixiObj);
            });
        });
    }
}

export default EnemiesCollection;