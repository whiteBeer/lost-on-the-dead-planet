import * as PIXI from "pixi.js";
import { Scene } from "../Scene";
import { App } from "../../App";
import { BackendPickup, BackendScene } from "../../Types";
import { ResourcesLoader } from "../ResourcesLoader";

interface PickupView {
    id:string;
    weaponId:string;
    pixiObj:PIXI.Container;
    x:number;
    y:number;
    weaponLevel:number;
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
        if ((data.weaponLevel || 1) > 1) {
            const level = new PIXI.Text({
                text: `II`,
                style: { fill: 0xffdc73, fontSize: 14, fontWeight: "800", stroke: { color: 0x000000, width: 3 } }
            });
            level.anchor.set(0.5);
            level.y = -28;
            container.addChild(level);
        }
        this.scene.addToScene(container);
        this.pickups.push({
            id: data.id,
            weaponId: data.weaponId || "",
            pixiObj: container,
            x: data.x,
            y: data.y,
            weaponLevel: data.weaponLevel || 1
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

    nearestTo(x:number, y:number, maxDistance = 70) {
        let nearest:PickupView | null = null;
        let best = maxDistance * maxDistance;
        for (const pickup of this.pickups) {
            const distance = (pickup.x - x) ** 2 + (pickup.y - y) ** 2;
            if (distance <= best) {
                nearest = pickup;
                best = distance;
            }
        }
        return nearest;
    }
}
