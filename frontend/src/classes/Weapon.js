import * as PIXI from "pixi.js";
import Missile from "./Missile";

export class Weapon {

    app = null;
    player = null;
    missilesPeriod = 150;
    speedInSecond = 300;
    missiles = [];

    constructor (app, player) {
        this.app = app;
        this.player = player;
    }

    fire () {
        // TODO: need to use scene.createMissile(...)
        const now = new Date().getTime();
        if (!this.missiles.find(el => el.createdAt + this.missilesPeriod > now)) {

            const playerCoords = this.player.getCoords();
            this.missiles.push(new Missile(this.app, this, {
                createdAt: now,
                speedInSecond: this.speedInSecond,
                startX: playerCoords.pageX,
                startY: playerCoords.pageY,
                rotation: playerCoords.rotation
            }));
            this.app.socket.emit('missileCreate', {
                speedInSecond: this.speedInSecond,
                startX: playerCoords.pageX,
                startY: playerCoords.pageY,
                rotation: playerCoords.rotation
            });
        }
    }

    removeMissileByCreatedAt (createdAt) {
        this.missiles = this.missiles.filter(el => el.createdAt !== createdAt);
    }
}

export default Weapon;