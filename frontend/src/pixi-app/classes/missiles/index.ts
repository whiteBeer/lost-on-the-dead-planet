import { Scene } from "../Scene";
import { Missile } from "./Missile";
import { App } from "../../App";
import { BackendScene, BackendMissile } from "../../Types";

interface IMissileSocket {
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

        this.app.socket?.on("missilesRemoved", (payload:IMissileSocket) => {
            this.removeMissile(payload.missile.id);
        });

        this.app.socket?.on("missilesAdded", (payload:IMissileSocket) => {
            this.createMissile(payload.missile, payload.serverCurrentDateTime);
        });
    }

    private removeMissile(id:string) {
        const existMissile = this.missiles.find(el => el.getId() === id);
        if (existMissile) {
            existMissile.clear();
            this.scene.removeFromScene(existMissile.getPixiObj());
            this.missiles = this.missiles.filter(el => el.getId() !== id);
        }
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