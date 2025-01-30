import * as PIXI from "pixi.js";
import {App} from "../../App";
import {Player} from "./Player";

export class Weapon {

    app:App;
    player:Player;
    missilesPeriod = 150;
    speedInSecond = 500;
    range = 700;
    lastFire = new Date().toISOString();

    constructor (app:App, player:Player) {
        this.app = app;
        this.player = player;
    }

    fire () {
        if (this.app.scene && this.app?.socket.id) {
            if (new Date().getTime() - new Date(this.lastFire).getTime() > this.missilesPeriod) {
                const playerCoords = this.player.getCoords();
                this.app.socket.emit("missileCreate", {
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