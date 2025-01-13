import * as PIXI from "pixi.js";

export class Weapon {

    app = null;
    player = null;
    missilesPeriod = 150;
    speedInSecond = 300;
    range = 200;

    constructor (app, player) {
        this.app = app;
        this.player = player;
    }

    fire () {
        const now = new Date().getTime();
        const missiles = this.app.scene.missilesCollection;
        const playerMissiles = missiles.getMissilesByOwnerId(this.app.socket.id);
        if (!playerMissiles.find(el => el.createdAt + this.missilesPeriod > now)) {
            const playerCoords = this.player.getCoords();
            missiles.createMissile({
                createdAt: now,
                ownerId: this.app.socket.id,
                range: this.range,
                speedInSecond: this.speedInSecond,
                startX: playerCoords.pageX,
                startY: playerCoords.pageY,
                rotation: playerCoords.rotation
            });
        }
    }
}

export default Weapon;