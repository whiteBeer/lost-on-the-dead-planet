import * as PIXI from "pixi.js";
import { App } from "../App";
import Player from "./players/Player";

export class Hud {
    private readonly app:App;
    private readonly mePlayer:Player;

    private pixiObj:PIXI.Container;
    private readonly ammoText:PIXI.Text;

    constructor(app:App, mePlayer:Player) {
        this.app = app;
        this.mePlayer = mePlayer;
        this.ammoText = new PIXI.Text({
            text: "Ammo: --/--",
            style: {
                fill: 0xffffff,
                fontSize: 24,
                align: "right"
            }
        });
        this.ammoText.anchor.set(1, 0); // Anchor to top-right
        this.pixiObj = new PIXI.Container();
        this.pixiObj.x = this.app.getScreenWidth() - 20;
        this.pixiObj.y = 20;
        this.pixiObj.addChild(this.ammoText);
    }

    public getPixiObj() {
        return this.pixiObj;
    }

    public update():void {
        if (this.mePlayer) {
            const ammo = this.mePlayer.weapon.ammo;
            const clipSize = this.mePlayer.weapon.clipSize;
            const isReloading = this.mePlayer.weapon.isReloading;

            let ammoText = `Ammo: ${ammo}/${clipSize}`;
            if (isReloading || ammo < 0) {
                ammoText = "Ammo: (Reloading...)";
            }
            this.ammoText.text = ammoText;
        } else {
            this.ammoText.text = "Ammo: --/--";
        }
    }

    public destroy() {
        this.pixiObj.destroy({ children: true });
    }
}