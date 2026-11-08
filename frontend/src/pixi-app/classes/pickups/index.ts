import * as PIXI from "pixi.js";
import { Scene } from "../Scene";
import { App } from "../../App";
import { BackendPickup, BackendScene } from "../../Types";
import { ResourcesLoader } from "../ResourcesLoader";

interface PickupView {
    id:string;
    weaponId:string;
    pixiObj:PIXI.Container;
}

export class PickupsCollection {
    app:App;
    scene:Scene;
    pickups:PickupView[] = [];

    constructor(app:App, scene:Scene, backendScene:BackendScene) {
        this.app = app;
        this.scene = scene;
        this.fromBackendScene(backendScene);

        this.app.socket?.on("pickupAdded", (data:{ pickup:BackendPickup }) => {
            this.addPickup(data.pickup);
        });

        this.app.socket?.on("pickupRemoved", (data:{ pickup:BackendPickup }) => {
            this.removePickup(data.pickup.id);
        });
    }

    fromBackendScene(backendScene:BackendScene) {
        this.pickups.forEach(p => {
            this.scene.removeFromScene(p.pixiObj);
            p.pixiObj.destroy({ children: true });
        });
        this.pickups = [];
        (backendScene.pickups || []).forEach(p => this.addPickup(p));
    }

    addPickup(data:BackendPickup) {
        if (this.pickups.find(p => p.id === data.id)) {
            return;
        }
        const container = new PIXI.Container();
        const key = data.weaponId ? `weapon_${data.weaponId}` : "";
        const tex = key ? ResourcesLoader.getTexture(key) : null;
        if (tex) {
            const sprite = new PIXI.Sprite(tex);
            sprite.anchor.set(0.5);
            ResourcesLoader.fitSprite(sprite, 48);
            container.addChild(sprite);
        } else {
            const g = new PIXI.Graphics();
            g.rect(-16, -8, 32, 16).fill(0xffd24a);
            container.addChild(g);
        }
        container.position.set(data.x, data.y);
        this.scene.addToScene(container);
        this.pickups.push({
            id: data.id,
            weaponId: data.weaponId || "",
            pixiObj: container
        });
    }

    removePickup(id:string) {
        const index = this.pickups.findIndex(p => p.id === id);
        if (index === -1) return;
        const pickup = this.pickups[index];
        this.scene.removeFromScene(pickup.pixiObj);
        pickup.pixiObj.destroy({ children: true });
        this.pickups.splice(index, 1);
    }
}
