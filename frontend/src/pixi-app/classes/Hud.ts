import * as PIXI from "pixi.js";
import { App } from "../App";
import Player from "./players/Player";

export class Hud {
    private readonly app:App;
    private readonly mePlayer:Player;
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
        this.ammoText.x = this.app.pixiApp.screen.width - 20;
        this.ammoText.y = 20;
        this.app.pixiApp.stage.addChild(this.ammoText);
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
}