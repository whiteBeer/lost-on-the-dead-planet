import * as PIXI from "pixi.js";
import { App } from "../App";
import { IMouseCoords } from "../Types";
import Player from "./players/Player";

/** Только кольцо разброса у мыши — системный курсор остаётся. */
export class Cursor {
    private app:App;
    private mePlayer:Player;
    private pixiObj:PIXI.Graphics;

    constructor(app:App, mePlayer:Player) {
        this.app = app;
        this.mePlayer = mePlayer;
        this.pixiObj = new PIXI.Graphics();
        this.pixiObj.eventMode = "none";
    }

    getPixiObj() {
        return this.pixiObj;
    }

    public update(mouseCoords:IMouseCoords):void {
        if (!this.mePlayer || !this.app.scene) {
            this.pixiObj.clear();
            return;
        }

        const playerCoords = this.mePlayer.getStageCoords();
        const distance = Math.hypot(
            mouseCoords.pageX - playerCoords.pageX,
            mouseCoords.pageY - playerCoords.pageY
        );

        const weapon = this.mePlayer.weapon;
        const spreadAngle = weapon.currentSpread;
        const baseSpread = weapon.config.spreadBase;

        this.pixiObj.clear();
        this.pixiObj.position.set(mouseCoords.pageX, mouseCoords.pageY);

        // Кольцо только пока разброс выше базы — иначе у пистолета/SMG
        // при далёком курсоре tan(spreadBase) * distance > 4 и «залипает»
        if (spreadAngle <= baseSpread + 0.0005) {
            return;
        }

        const spreadRadiusInPixels = distance * Math.tan(spreadAngle);
        if (spreadRadiusInPixels > 4) {
            this.pixiObj.circle(0, 0, Math.max(4, spreadRadiusInPixels));
            this.pixiObj.stroke({ color: 0xffffff, width: 1.5, alpha: 0.55 });
        }
    }

    public destroy() {
        this.pixiObj.destroy({ children: true });
    }
}
