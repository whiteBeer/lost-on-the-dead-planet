import { Missile } from "./Missile";
import { App } from "../../App";
import { BackendScene, BackendMissile } from "../../Types";

interface IBackendMissileSocket {
    missile:BackendMissile,
    serverCurrentDateTime:string
}

export class MissilesCollection {

    app:App;
    missiles:Missile[] = [];

    constructor(app:App, backendScene:BackendScene) {
        this.app = app;

        backendScene.missiles.forEach((el:BackendMissile) => {
            this.createMissile(el, backendScene.serverCurrentDateTime);
        });

        this.app.socket?.on("missilesRemoved", (mObj:IBackendMissileSocket) => {
            const existMissile = this.missiles.find(el => el.getId() === mObj.missile.id);
            if (existMissile) {
                existMissile.remove();
                this.missiles = this.missiles.filter(el => el.getId() !== mObj.missile.id);
            }
        });

        this.app.socket?.on("missilesAdded", (params:IBackendMissileSocket) => {
            this.createMissile(params.missile, params.serverCurrentDateTime);
        });
    }

    getMissiles() {
        return this.missiles;
    }

    createMissile(params:BackendMissile, serverCurrentDateTime:string) {
        this.missiles.push(new Missile(this.app, params, serverCurrentDateTime));
    }
}