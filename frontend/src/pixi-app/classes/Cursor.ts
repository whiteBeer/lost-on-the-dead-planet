import * as PIXI from "pixi.js";
import { App } from "../App";
import { IMouseCoords } from "../Types";
import Player from "./players/Player";

export class Cursor {
    private app:App;
    private mePlayer:Player;
    private graphics:PIXI.Graphics;

    constructor(app:App, mePlayer:Player) {
        this.app = app;
        this.mePlayer = mePlayer;
        this.graphics = new PIXI.Graphics();
        this.app.pixiApp.stage.addChild(this.graphics);
    }

    public update(mouseCoords:IMouseCoords):void {
        if (!this.mePlayer) {
            this.graphics.clear();
            return;
        }

        // Calculate distance between player and cursor
        const distance = Math.hypot(
            mouseCoords.pageX - this.mePlayer.pixiObj.x, mouseCoords.pageY - this.mePlayer.pixiObj.y
        );

        // Get the current spread angle in radians
        const spreadAngle = this.mePlayer.weapon.currentSpread;

        // Calculate the radius of the spread circle at that distance using trigonometry
        const spreadRadiusInPixels = distance * Math.tan(spreadAngle);

        // Draw the circle
        this.graphics.clear();
        if (spreadRadiusInPixels > 10) { // Only draw if the circle is noticeable
            this.graphics.position.set(mouseCoords.pageX, mouseCoords.pageY);
            this.graphics.circle(0, 0, spreadRadiusInPixels);
            this.graphics.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
        }
    }
}