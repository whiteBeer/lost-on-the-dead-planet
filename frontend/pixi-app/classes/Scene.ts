import * as PIXI from "pixi.js";
import Player from "./players/Player";
import {PlayersCollection} from "./players";
import {EnemiesCollection} from "./enemies";
import {MissilesCollection} from "./missiles";
import {App} from "../App";
import {BackendPlayer, BackendScene} from "../Types";

export class Scene {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;

    width:number;
    height:number;
    scale = 1.7;
    tx = 0;
    ty = 0;
    marginX = 100;
    marginY = 100;

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
        const rect = new PIXI.Graphics();
        rect.rect(0, 0, this.width, this.height);
        rect.stroke({color: "0xFFF", width: 4 });
        rect.fill("#1099bb");
        container.addChild(rect);
        for (let i = 100; i < this.width; i += 100) {
            const coordsLine = new PIXI.Graphics();
            coordsLine.moveTo(i, 0).lineTo(i, this.height);
            coordsLine.stroke({color: "0xFFF", width: 1 });
            container.addChild(coordsLine);
        }
        for (let i = 100; i < this.height; i += 100) {
            const coordsLine = new PIXI.Graphics();
            coordsLine.moveTo(0, i).lineTo(this.width, i);
            coordsLine.stroke({color: "0xFFF", width: 1 });
            container.addChild(coordsLine);
        }
        this.tx = window.innerWidth / 2 - this.width / 2;
        this.ty = window.innerHeight / 2 - this.height / 2;
        container.x = this.tx;
        container.y = this.ty;
        container._zIndex = -1;

        this.pixiObj = container;
        this.app.pixiApp.stage.addChild(this.pixiObj);

        this.app.socket?.on("sceneChanged", (newScene:BackendScene) => {
            this.enemiesCollection.enemiesFromBackendScene(newScene);
        });
    }

    setMePlayer (mePlayer:Player) {
        this.mePlayer = mePlayer;
        this.centerScene();
    }

    incrementTxTy (dtx:number, dty:number) {
        this.tx += dtx;
        this.ty += dty;
        this.updateScene();
    }

    incrementScale (val:number) {
        this.scale += val;
        this.centerScene();
    }

    centerScene () {
        if (this.mePlayer) {
            this.tx = (window.innerWidth / 2) - this.mePlayer.x * this.scale;
            this.ty = (window.innerHeight / 2) - this.mePlayer.y * this.scale;

            if (this.tx > this.marginX * this.scale) {
                this.tx = this.marginX * this.scale;
            }
            if (this.tx < window.innerWidth - this.width * this.scale - this.marginX * this.scale) {
                this.tx = window.innerWidth - this.width * this.scale - this.marginX * this.scale;
            }
            if (this.ty > this.marginY * this.scale) {
                this.ty = this.marginY * this.scale;
            }
            if (this.ty < window.innerHeight - this.height * this.scale - this.marginY * this.scale) {
                this.ty = window.innerHeight - this.height * this.scale - this.marginY * this.scale;
            }
            this.updateScene();
        }
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