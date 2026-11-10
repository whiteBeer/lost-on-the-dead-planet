import * as PIXI from "pixi.js";
import { App } from "../App";
import { IMouseCoords } from "../Types";
import Player from "./players/Player";
import { Control } from "./Control";

/** Кольцо разброса у мыши; на телефоне — виртуальные стики и линия прицела. */
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
        this.pixiObj.clear();
        this.pixiObj.position.set(0, 0);

        if (!this.mePlayer || !this.app.scene) {
            return;
        }

        const control = this.app.getControl();
        if (control?.isTouch) {
            this.drawTouchControls(control);
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

        this.pixiObj.position.set(mouseCoords.pageX, mouseCoords.pageY);

        // Натуральную базу оружия не рисуем: у пистолета/SMG на дальней дистанции
        // tan(spreadBase) * distance > 4 и кольцо «залипает».
        // Пол, поднятый перком, выше этой базы — его показываем, иначе круг меньше пуль.
        if (spreadAngle <= baseSpread + 0.0005) {
            return;
        }

        const spreadRadiusInPixels = distance * Math.tan(spreadAngle);
        if (spreadRadiusInPixels > 4) {
            this.pixiObj.circle(0, 0, Math.max(4, spreadRadiusInPixels));
            this.pixiObj.stroke({ color: 0xffffff, width: 1.5, alpha: 0.55 });
        }
    }

    private drawTouchControls(control:Control) {
        for (const stick of control.sticks()) {
            this.pixiObj.circle(stick.originX, stick.originY, 60)
                .fill({ color: 0xffffff, alpha: 0.08 })
                .stroke({ color: 0xffffff, width: 2, alpha: 0.4 });
            this.pixiObj.circle(stick.x, stick.y, 26)
                .fill({ color: 0xffffff, alpha: 0.35 });
        }

        if (control.aimAngle !== null && control.isFiring) {
            const playerCoords = this.mePlayer.getStageCoords();
            const rotation = this.mePlayer.getCoords().rotation;
            const length = 170;
            this.pixiObj
                .moveTo(
                    playerCoords.pageX + Math.cos(rotation) * 30,
                    playerCoords.pageY + Math.sin(rotation) * 30
                )
                .lineTo(
                    playerCoords.pageX + Math.cos(rotation) * length,
                    playerCoords.pageY + Math.sin(rotation) * length
                )
                .stroke({ color: 0xffffff, width: 2, alpha: 0.45 });
        }
    }

    public destroy() {
        this.pixiObj.destroy({ children: true });
    }
}
