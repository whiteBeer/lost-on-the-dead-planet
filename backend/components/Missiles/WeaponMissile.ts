import { Scene } from "../Scene";
import { BaseMissile } from "./BaseMissile";
import { MissileParams } from "../../types";
import { WEAPONS } from "../../configs/Weapons";

export class WeaponMissile extends BaseMissile {

    constructor(scene:Scene, params:MissileParams) {
        super(scene, params);
        const config = WEAPONS[params.weaponType];
        if (!config) {
            throw new Error(`Unknown weapon for missile: ${params.weaponType}`);
        }

        this.damage = params.damage ?? config.damage;
        this.speedInSecond = params.speedInSecond ?? config.speedInSecond;
        this.range = params.range ?? config.range;
        this.pierceLeft = params.pierce ?? config.pierce ?? 0;

        this.handleEvents();
    }
}
