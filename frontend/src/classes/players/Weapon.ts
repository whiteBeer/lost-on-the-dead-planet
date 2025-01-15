import * as PIXI from "pixi.js";
import {App} from "../../App";
import {Player} from "./Player";

export class Weapon {

    app:App;
    player:Player;
    missilesPeriod = 150;
    speedInSecond = 300;
    range = 500;
    lastFire = new Date().toISOString();

    constructor (app:App, player:Player) {
        this.app = app;
        this.player = player;
    }

    fire () {
        if (this.app.scene && this.app?.socket.id) {
            const missiles = this.app.scene.missilesCollection;
            if (new Date().getTime() - new Date(this.lastFire).getTime() > this.missilesPeriod) {
                const playerCoords = this.player.getCoords();
                missiles.createBackendMissile({
                    ownerId: this.app.socket.id,
                    range: this.range,
                    speedInSecond: this.speedInSecond,
                    startX: playerCoords.pageX,
                    startY: playerCoords.pageY,
                    rotation: playerCoords.rotation
                });
                this.lastFire = new Date().toISOString();
            }
        }
    }
}

export default Weapon;