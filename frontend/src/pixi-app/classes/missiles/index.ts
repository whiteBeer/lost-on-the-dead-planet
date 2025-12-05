import { Scene } from "../Scene";
import { Missile } from "./Missile";
import { App } from "../../App";
import { BackendScene, BackendMissile } from "../../Types";

interface IBackendMissileSocket {
    missile:BackendMissile,
    serverCurrentDateTime:string
}

export class MissilesCollection {

    app:App;
    scene:Scene;
    missiles:Missile[] = [];

    constructor(app:App, scene:Scene, backendScene:BackendScene) {
        this.app = app;
        this.scene = scene;

        backendScene.missiles.forEach((el:BackendMissile) => {
            this.createMissile(el, backendScene.serverCurrentDateTime);
        });

        this.app.socket?.on("missilesRemoved", (mObj:IBackendMissileSocket) => {
            const existMissile = this.missiles.find(el => el.getId() === mObj.missile.id);
            if (existMissile) {
                existMissile.clear();
                this.scene.removeFromScene(existMissile.getPixiObj());
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
        const missile = new Missile(this.app, params, serverCurrentDateTime);
        this.missiles.push(missile);
        this.scene.addToScene(missile.getPixiObj());
    }
}