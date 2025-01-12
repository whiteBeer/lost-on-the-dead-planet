import * as PIXI from "pixi.js";
import Missile from "./Missile";

export class Scene {

    app = null;
    pixiObj = null;

    width = 1000;
    height = 1000;

    missiles = [];

    constructor (app, params = {}) {
        this.app = app;
        this.socketId = params.socketId || "me";
        const container = new PIXI.Container();
        const line = new PIXI.Graphics();
        line.lineStyle(2, "#FFF");
        line.moveTo(10, 10);
        line.lineTo(this.width, 10);
        line.lineTo(this.width, this.height);
        line.lineTo(10, this.height);
        line.lineTo(10, 10);
        container.addChild(line);
        container.position.set(0, 0);
        
        this.pixiObj = container;
        app.stage.addChild(this.pixiObj);

        this.app.socket.on('missilesAll', (params) => {
            params.missiles.forEach(el => {
                if (el.ownerId !== app.socket.id) {
                    this.createMissile(el, params.serverCurrentDateTime);
                }
            });
        });
    }

    createMissile (params, serverCurrentDateTime) {
        const now = new Date().getTime();
        this.missiles.push(new Missile(this.app, this, {
            serverCurrentDateTime: serverCurrentDateTime,
            createdAt: params.createdAt,
            speedInSecond: params.speedInSecond,
            startX: params.startX,
            startY: params.startY,
            rotation: params.rotation
        }));
    }

    removeMissileByCreatedAt (createdAt) {
        this.missiles = this.missiles.filter(el => el.createdAt !== createdAt);
    }
}

export default Scene;