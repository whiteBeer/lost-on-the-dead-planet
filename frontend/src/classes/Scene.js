import * as PIXI from "pixi.js";
import Player from "./players/Player";
import { PlayersCollection } from "./players";
import { EnemiesCollection } from "./enemies";
import { MissilesCollection } from "./missiles";

export class Scene {

    app = null;
    pixiObj = null;

    width = 1000;
    height = 1000;

    mePlayer = null;
    playersCollection = null;
    enemiesCollection = null;
    missilesCollection = null;

    constructor (app, params = {}) {
        this.app = app;
        this.socketId = params.socketId || "me";

        this.mePlayer = new Player(app, {color: "#99B"});
        this.playersCollection = new PlayersCollection(app, this.mePlayer);
        this.enemiesCollection = new EnemiesCollection(app);
        this.missilesCollection = new MissilesCollection(app);

        const container = new PIXI.Container();
        const line = new PIXI.Graphics();
        line.lineStyle(2, "#FFF");
        line.moveTo(10, 10);
        line.lineTo(this.width, 10);
        line.lineTo(this.width, this.height);
        line.lineTo(10, this.height);
        line.lineTo(10, 10);
        container.addChild(line);
        container.position.set(0, 0);
        
        this.pixiObj = container;
        app.pixiApp.stage.addChild(this.pixiObj);

        this.app.socket.on('missilesAll', (params) => {
            params.missiles.forEach(el => {
                if (el.ownerId !== app.socket.id) {
                    this.missilesCollection.createMissile(el, params.serverCurrentDateTime);
                }
            });
        });
    }
}

export default Scene;