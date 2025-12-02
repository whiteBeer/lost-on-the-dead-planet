import * as PIXI from "pixi.js";
import { App } from "../App";
import { IMouseCoords } from "../Types";
import Player from "./players/Player";

export class Cursor {
    private app: App;
    private mePlayer: Player;
    private graphics: PIXI.Graphics;

    constructor(app: App, mePlayer: Player) {
        this.app = app;
        this.mePlayer = mePlayer;
        this.graphics = new PIXI.Graphics();
        this.app.pixiApp.stage.addChild(this.graphics);
    }

    public update(mouseCoords: IMouseCoords): void {
        if (!this.mePlayer) {
            this.graphics.clear();
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
        this.graphics.clear();
        this.graphics.position.set(cursorX, cursorY);

        if (spreadRadiusInPixels > 10) { // Only draw if the circle is noticeable
            this.graphics.circle(0, 0, spreadRadiusInPixels);
            this.graphics.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
        }
    }
}