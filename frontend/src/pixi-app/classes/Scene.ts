import * as PIXI from "pixi.js";
import Player from "./players/Player";
import {PlayersCollection} from "./players";
import {EnemiesCollection} from "./enemies";
import {MissilesCollection} from "./missiles";
import {App} from "../App";
import {BackendScene, IMouseCoords} from "../Types";

export class Scene {

    app:App;
    pixiObj:PIXI.Container<PIXI.ContainerChild>;
    cursorCircle: PIXI.Graphics;
    ammoText: PIXI.Text;

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
        
        this.cursorCircle = new PIXI.Graphics();
        this.app.pixiApp.stage.addChild(this.cursorCircle);

        // Initialize ammo display
        this.ammoText = new PIXI.Text({
            text: "Ammo: --/--",
            style: {
                fill: 0xffffff,
                fontSize: 24,
                align: "right"
            }
        });
        this.ammoText.anchor.set(1, 0); // Anchor to top-right
        this.ammoText.x = this.app.pixiApp.screen.width - 10; // 10px padding from right
        this.ammoText.y = 10; // 10px padding from top
        this.app.pixiApp.stage.addChild(this.ammoText);

        const mePlayer = this.playersCollection.initPlayers(backendScene.players);
        if (mePlayer) {
            this.setMePlayer(mePlayer);
        }

        this.app.socket?.on("sceneChanged", (newScene:BackendScene) => {
            this.playersCollection.updatePlayers(newScene.players);
            this.enemiesCollection.enemiesFromBackendScene(newScene);
        });
    }
    
    updateCursorCircle (mouseCoords: IMouseCoords) {
        if (!this.mePlayer) {
            this.cursorCircle.clear();
            return;
        }

        // 1. Get cursor position on canvas
        const cursorX = mouseCoords.pageX - this.app.getCanvasOffsetLeft();
        const cursorY = mouseCoords.pageY - this.app.getCanvasOffsetTop();

        // 2. Get player's visual position on canvas
        const playerX = this.mePlayer.pixiObj.x;
        const playerY = this.mePlayer.pixiObj.y;

        // 3. Calculate distance between player and cursor
        const distance = Math.hypot(cursorX - playerX, cursorY - playerY);

        // 4. Get the current spread angle in radians
        const spreadAngle = this.mePlayer.weapon.currentSpread;

        // 5. Calculate the radius of the spread circle at that distance using trigonometry
        const spreadRadiusInPixels = distance * Math.tan(spreadAngle);

        // 6. Draw the circle
        this.cursorCircle.clear();
        if (spreadRadiusInPixels > 10) {
            this.cursorCircle.position.set(cursorX, cursorY);
            this.cursorCircle.circle(0, 0, spreadRadiusInPixels);
            this.cursorCircle.stroke({color: 0xffffff, width: 1, alpha: 0.5});
        }
    }

    updateAmmoDisplay() {
        if (this.mePlayer) {
            const ammo = this.mePlayer.weapon.ammo;
            const clipSize = this.mePlayer.weapon.clipSize;
            const isReloading = this.mePlayer.weapon.isReloading;

            if (isReloading || ammo < 0) {
                this.ammoText.text = "Ammo: (Reloading...)";
            } else {
                this.ammoText.text = `Ammo: ${ammo}/${clipSize}`;
            }
        } else {
            this.ammoText.text = "Ammo: --/--";
        }
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