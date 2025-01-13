import * as PIXI from "pixi.js";
import {io} from "socket.io-client";
import {Enemy} from "./Enemy";

export class EnemiesCollection {

    app = null;
    socket = null;
    enemies = [];

    constructor (app) {
        this.app = app;

        this.app.socket.on('allEnemies', (backendEnemies) => {
            this.enemies.forEach(el => {
                el.remove();
            });
            backendEnemies.enemies.forEach(el => {
                const enemy = new Enemy(this.app, el, backendEnemies.serverCurrentDateTime);
                this.enemies.push(enemy);
                app.pixiApp.stage.addChild(enemy.pixiObj);
            });
        });
    }
}

export default EnemiesCollection;