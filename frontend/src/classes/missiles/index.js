import * as PIXI from "pixi.js";
import {io} from "socket.io-client";
import Player from "./Missile";
import Missile from "./Missile";

export class MissilesCollection {

    app = null;
    missiles = [];

    constructor (app) {
        this.app = app;
    }

    getAllMissiles () {
        return this.missiles;
    }

    createMissile (params, serverCurrentDateTime) {
        const now = new Date().getTime();
        this.missiles.push(new Missile(this.app, {
            serverCurrentDateTime: serverCurrentDateTime,
            ownerId: params.ownerId,
            createdAt: params.createdAt,
            speedInSecond: params.speedInSecond,
            startX: params.startX,
            startY: params.startY,
            rotation: params.rotation
        }));
    }

    getMissilesByOwnerId (ownerId) {
        return this.missiles.filter(el => el.getOwnerId() === ownerId);
    }

    removeMissileByCreatedAt (createdAt) {
        this.missiles = this.missiles.filter(el => el.createdAt !== createdAt);
    }
}