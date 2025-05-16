import {App} from "../../App";
import {Player} from "./Player";

export class Weapon {

    app:App;
    player:Player;
    missilesPeriod = 150;
    lastFire = new Date().toISOString();

    constructor (app:App, player:Player) {
        this.app = app;
        this.player = player;
    }

    fire () {
        if (this.app.scene && this.app?.socket?.id) {
            if (new Date().getTime() - new Date(this.lastFire).getTime() > this.missilesPeriod) {
                const playerCoords = this.player.getCoords();
                this.app.socket.emit("missileCreate", {
                    weaponType: "Rifle",
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