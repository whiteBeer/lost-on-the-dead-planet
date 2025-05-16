import {Missile} from "./Missile";
import {App} from "../../App";
import {BackendScene, BackendMissile} from "../../Types";

interface BackendMissileAddedSocket {
    newMissile: BackendMissile,
    serverCurrentDateTime: string
}

export class MissilesCollection {

    app:App;
    missiles:Missile[] = [];

    constructor (app:App, backendScene:BackendScene) {
        this.app = app;

        backendScene.missiles.forEach((el:BackendMissile) => {
            if (el.ownerId !== app.socket?.id) {
                this.createMissile(el, backendScene.serverCurrentDateTime);
            }
        });

        this.app.socket?.on("missilesRemoved", (missileId:string) => {
            this.missiles.forEach((el:Missile) => {
                if (el.id === missileId) {
                    el.remove();
                }
            });
            this.missiles = this.missiles.filter(el => el.id !== missileId);
        });

        this.app.socket?.on("missilesAdded", (params:BackendMissileAddedSocket) => {
            this.createMissile(params.newMissile, params.serverCurrentDateTime);
        });
    }

    getMissiles () {
        return this.missiles;
    }

    createMissile (params:BackendMissile, serverCurrentDateTime:string) {
        this.missiles.push(new Missile(this.app, params, serverCurrentDateTime));
    }

    getMissilesByOwnerId (ownerId:string) {
        return this.missiles.filter(el => el.getOwnerId() === ownerId);
    }

    removeMissileByCreatedAt (createdAt:string) {
        this.missiles = this.missiles.filter(el => el.createdAt !== createdAt);
    }
}