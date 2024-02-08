import * as PIXI from "pixi.js";
import Missile from "./Missile";

export class Weapon {

    app = null;
    player = null;
    missilesPeriod = 150;
    missilesSpeed = 50;
    missiles = [];

    constructor (app, player) {
        this.app = app;
        this.player = player;
    }

    fire () {
        const now = new Date().getTime();
        if (!this.missiles.find(el => el.createdAt + this.missilesPeriod > now)) {
            this.missiles.push(new Missile(this.app, {
                createdAt: now,
                speed: this.missilesSpeed,
                startX: this.player.pixiObj.x,
                startY: this.player.pixiObj.y,
                direction: this.player.pixiObj.rotation
            }));
        }
    }
}

export default Weapon;