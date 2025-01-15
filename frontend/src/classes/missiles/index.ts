import * as PIXI from "pixi.js";
import {Missile} from "./Missile";
import {App} from "../../App";
import {BackendScene, BackendMissile} from "../../Types";

export class MissilesCollection {

    app:App;
    missiles:Missile[] = [];

    constructor (app:App, backendScene:BackendScene) {
        this.app = app;

        backendScene.missiles.forEach((el:BackendMissile) => {
            if (el.ownerId !== app.socket.id) {
                this.createMissile(el, backendScene.serverCurrentDateTime);
            }
        });

        this.app.socket.on("missilesAll", (params:any) => {
            params.missiles.forEach((el:any) => {
                if (el.ownerId !== app.socket.id) {
                    this.createMissile(el, params.serverCurrentDateTime);
                }
            });
        });
    }

    getAllMissiles () {
        return this.missiles;
    }

    createMissile (params:BackendMissile, serverCurrentDateTime:string) {
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