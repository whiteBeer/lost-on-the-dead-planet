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

    // line = {
    //     x: 200,
    //     y: 100,
    //     w: 200,
    //     h: 100,
    //     rotation: Math.PI + 1
    // };

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

        this.pixiObj = container;
        app.pixiApp.stage.addChild(this.pixiObj);

        ///////////////////////////////////////
        // const container1 = new PIXI.Container();
        //
        // const line1 = new PIXI.Graphics();
        // line1.moveTo(0, 0)
        //     .lineTo(1000, 0);
        // line1.stroke({color: "0xFF0", width: 1 });
        //
        // const line2 = new PIXI.Graphics();
        // line2.moveTo(0, 0)
        //     .lineTo(1000, 0);
        // line2.stroke({color: "0xFF0", width: 1 });
        //
        // const rectangle = new PIXI.Graphics();
        // rectangle
        //     .rect(0, 0, this.line.w, this.line.h)
        //     .fill("white");
        // container1.addChild(line1);
        // container1.addChild(rectangle);
        //
        // container1.position.set(this.tx + this.line.x * this.scale, this.ty + this.line.y * this.scale);
        //
        // container1.rotation = this.line.rotation;
        // app.pixiApp.stage.addChild(container1);
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