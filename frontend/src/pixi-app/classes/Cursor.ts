import * as PIXI from "pixi.js";
import { App } from "../App";
import { IMouseCoords } from "../Types";
import Player from "./players/Player";

export class Cursor {
    private app:App;
    private mePlayer:Player;
    private pixiObj:PIXI.Graphics;

    constructor(app:App, mePlayer:Player) {
        this.app = app;
        this.mePlayer = mePlayer;
        this.pixiObj = new PIXI.Graphics();
    }

    getPixiObj(){
        return this.pixiObj;
    }

    public update(mouseCoords:IMouseCoords):void {
        if (!this.mePlayer || !this.app.scene) {
            this.pixiObj.clear();
            return;
        }

        // Calculate distance between player and cursor
        const playerCoords = this.mePlayer.getStageCoords();
        const distance = Math.hypot(
            mouseCoords.pageX - playerCoords.pageX, mouseCoords.pageY - playerCoords.pageY
        );

        // Get the current spread angle in radians
        const spreadAngle = this.mePlayer.weapon.currentSpread;

        // Calculate the radius of the spread circle at that distance using trigonometry
        const spreadRadiusInPixels = distance * Math.tan(spreadAngle);

        // Draw the circle
        this.pixiObj.clear();
        if (spreadRadiusInPixels > 10) { // Only draw if the circle is noticeable
            this.pixiObj.position.set(mouseCoords.pageX, mouseCoords.pageY);
            this.pixiObj.circle(0, 0, spreadRadiusInPixels);
            this.pixiObj.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
        }
    }
}