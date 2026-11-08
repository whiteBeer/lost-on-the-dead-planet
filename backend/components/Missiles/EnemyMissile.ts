import { Scene } from "../Scene";
import { BaseMissile } from "./BaseMissile";
import { EnemyMissileParams } from "../../types";

export class EnemyMissile extends BaseMissile {

    constructor(scene:Scene, params:EnemyMissileParams) {
        super(scene, {
            weaponType: "EnemyShot",
            team: "enemy",
            ownerId: params.ownerId,
            startX: params.startX,
            startY: params.startY,
            rotation: params.rotation
        });
        this.damage = params.damage;
        this.speedInSecond = params.speedInSecond;
        this.range = params.range;
        this.bulletScale = params.bulletScale ?? 1;
        this.pierceLeft = 0;
        this.handleEvents();
    }
}
