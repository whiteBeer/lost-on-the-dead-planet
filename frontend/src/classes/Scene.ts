import * as PIXI from "pixi.js";
import Player from "./players/Player";
import {PlayersCollection} from "./players";
import {EnemiesCollection} from "./enemies";
import {MissilesCollection} from "./missiles";
import {App} from "../App";

export class Scene {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;

    width = 1000;
    height = 1000;

    mePlayer:Player;
    playersCollection:PlayersCollection;
    enemiesCollection:EnemiesCollection;
    missilesCollection:MissilesCollection;

    constructor (app:App) {
        this.app = app;

        this.mePlayer = new Player(app, {color: "#99B"});
        this.playersCollection = new PlayersCollection(app, this.mePlayer);
        this.enemiesCollection = new EnemiesCollection(app);
        this.missilesCollection = new MissilesCollection(app);

        const container = new PIXI.Container();
        const line = new PIXI.Graphics();
        line.moveTo(10, 10)
            .lineTo(this.width, 10)
            .lineTo(this.width, this.height)
            .lineTo(10, this.height)
            .lineTo(10, 10);
        line.stroke({color: "0xFFF", width: 2 });
        container.addChild(line);
        container.x = 0;
        container.y = 0;

        this.pixiObj = container;
        app.pixiApp.stage.addChild(this.pixiObj);

        this.app.socket.on("missilesAll", (params:any) => {
            params.missiles.forEach((el:any) => {
                if (el.ownerId !== app.socket.id) {
                    this.missilesCollection.createMissile(el, params.serverCurrentDateTime);
                }
            });
        });
    }
}

export default Scene;