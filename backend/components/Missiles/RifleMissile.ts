import {Scene} from "../Scene";
import {BaseMissile} from "./BaseMissile";
import {MissileParams} from "../../types";

export class RifleMissile extends BaseMissile {

    constructor(scene:Scene, params:MissileParams) {
        super(scene, params);
        this.damage = 25;
        this.speedInSecond = 3000;
        this.range = 1000;

        this.handleEvents();
    }
}