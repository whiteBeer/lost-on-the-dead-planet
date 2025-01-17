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
    scale = 1;
    tx = 0;
    ty = 0;

    mePlayer:Player|null = null;
    playersCollection:PlayersCollection;
    enemiesCollection:EnemiesCollection;
    missilesCollection:MissilesCollection;

    constructor (app:App, backendScene:BackendScene) {
        this.app = app;

        this.width = backendScene.width;
        this.height = backendScene.height;

        this.playersCollection = new PlayersCollection(app);
        this.enemiesCollection = new EnemiesCollection(app, backendScene);
        this.missilesCollection = new MissilesCollection(app, backendScene);

        const container = new PIXI.Container();
        const line = new PIXI.Graphics();
        line.moveTo(0, 0)
            .lineTo(this.width, 0)
            .lineTo(this.width, this.height)
            .lineTo(0, this.height)
            .lineTo(0, 0);
        line.stroke({color: "0xFFF", width: 4 });
        container.addChild(line);
        this.tx = window.innerWidth / 2 - this.width / 2;
        this.ty = window.innerHeight / 2 - this.height / 2;
        container.x = this.tx;
        container.y = this.ty;

        this.pixiObj = container;
        app.pixiApp.stage.addChild(this.pixiObj);
    }

    setMePlayer (mePlayer:Player) {
        this.mePlayer = mePlayer;
    }

    incrementTxTy (dtx:number, dty:number) {
        this.tx += dtx;
        this.ty += dty;
        this.updateScene();
    }

    incrementScale (val:number) {
        this.scale += val;
        this.updateScene();
    }

    updateScene () {
        this.pixiObj.scale  = this.scale;
        this.pixiObj.x = this.tx;
        this.pixiObj.y = this.ty;
        this.playersCollection.getPlayers().forEach((el) => {
            el.pixiObj.scale = this.scale;
            el.pixiObj.x = this.tx + el.x * this.scale;
            el.pixiObj.y = this.ty + el.y * this.scale;
        });
        this.missilesCollection.getMissiles().forEach((el) => {
            el.pixiObj.scale = this.scale;
            el.pixiObj.x = this.tx + el.x * this.scale;
            el.pixiObj.y = this.ty + el.y * this.scale;
        });
        this.enemiesCollection.getEnemies().forEach((el) => {
            el.pixiObj.scale = this.scale;
            el.pixiObj.x = this.tx + el.x * this.scale;
            el.pixiObj.y = this.ty + el.y * this.scale;
        });
    }
}