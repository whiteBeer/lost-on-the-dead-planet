import { Scene } from "../Scene";
import { Coords } from "../../types";
import { ChaseSpawnParams } from "./ChaseEnemy";
import { Boss } from "./Boss";

/** Кружит как владыка, но бьёт крестом: вперёд, назад, влево и вправо. */
export class Hyena extends Boss {
    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, params, "Hyena");
    }

    protected tryShoot(pos:Coords, tx:number, ty:number) {
        if (!this.canAttack()) {
            return;
        }
        const dist = Math.hypot(tx - pos.x, ty - pos.y);
        if (dist > this.shootRange || dist < 1) {
            return;
        }

        this.attack();
        const forward = this.rotation;
        for (let i = 0; i < 4; i++) {
            this.scene.missilesCollection.createEnemyMissile({
                ownerId: this.id,
                startX: pos.x,
                startY: pos.y,
                rotation: forward + i * (Math.PI / 2),
                damage: this.damageValue,
                speedInSecond: this.shotSpeed,
                range: this.shotTravel,
                bulletScale: 3
            });
        }
    }
}
