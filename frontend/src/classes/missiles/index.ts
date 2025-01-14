import * as PIXI from "pixi.js";
import {Missile} from "./Missile";
import {App} from "../../App";

export class MissilesCollection {

    app:App;
    missiles:Missile[] = [];

    constructor (app:App) {
        this.app = app;
    }

    getAllMissiles () {
        return this.missiles;
    }

    createMissile (params:any, serverCurrentDateTime:string) {
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

    getMissilesByOwnerId (ownerId:string) {
        return this.missiles.filter(el => el.getOwnerId() === ownerId);
    }

    removeMissileByCreatedAt (createdAt:string) {
        this.missiles = this.missiles.filter(el => el.createdAt !== createdAt);
    }
}