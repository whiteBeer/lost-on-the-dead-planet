import * as PIXI from "pixi.js";
import Player from "./players/Player";
import {PlayersCollection} from "./players";
import {EnemiesCollection} from "./enemies";
import {MissilesCollection} from "./missiles";
import {App} from "../App";
import {BackendScene} from "../Types";

export class Scene {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;

    width:number;
    height:number;

    mePlayer:Player;
    playersCollection:PlayersCollection;
    enemiesCollection:EnemiesCollection;
    missilesCollection:MissilesCollection;

    constructor (app:App, backendScene:BackendScene) {
        this.app = app;

        this.width = backendScene.width;
        this.height = backendScene.height;

        this.mePlayer = new Player(app, {color: "#99B"});
        this.playersCollection = new PlayersCollection(app, this.mePlayer);
        this.enemiesCollection = new EnemiesCollection(app, backendScene);
        this.missilesCollection = new MissilesCollection(app, backendScene);

        const container = new PIXI.Container();
        const line = new PIXI.Graphics();
        line.moveTo(10, 10)
            .lineTo(this.width, 10)
            .lineTo(this.width, this.height)
            .lineTo(10, this.height)
            .lineTo(10, 10);
        line.stroke({color: "0xFFF", width: 4 });
        container.addChild(line);
        container.x = 0;
        container.y = 0;

        this.pixiObj = container;
        app.pixiApp.stage.addChild(this.pixiObj);
    }
}