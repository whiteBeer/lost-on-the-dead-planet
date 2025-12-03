import {Scene} from "../Scene";
import {BaseMissile} from "./BaseMissile";
import {MissileParams} from "../../types";
import {WEAPONS} from "../../configs/Weapons";

export class RifleMissile extends BaseMissile {

    constructor(scene:Scene, params:MissileParams) {
        super(scene, params);
        const config = WEAPONS["Rifle"];
        this.damage = 25;
        this.speedInSecond = config.speedInSecond;
        this.range = config.range;

        this.handleEvents();
    }
}