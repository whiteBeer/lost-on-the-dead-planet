import * as PIXI from "pixi.js";
import {Enemy} from "./Enemy";
import {App} from "../../App";

export class EnemiesCollection {

    app:App;
    socket = null;
    enemies:Enemy[] = [];

    constructor (app:App) {
        this.app = app;

        this.app.socket.on("allEnemies", (backendEnemies:any) => {
            this.enemies.forEach(el => {
                el.remove();
            });
            backendEnemies.enemies.forEach((el:any) => {
                const enemy = new Enemy(this.app, el, backendEnemies.serverCurrentDateTime);
                this.enemies.push(enemy);
                app.pixiApp.stage.addChild(enemy.pixiObj);
            });
        });
    }
}

export default EnemiesCollection;