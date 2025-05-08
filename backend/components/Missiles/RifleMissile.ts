import {Scene} from "../Scene";
import {BaseMissile} from "./BaseMissile";
import {MissileParams} from "../../types";

export class RifleMissile extends BaseMissile {

    constructor(scene:Scene, params:MissileParams) {
        super(scene, params);
        this.scene = scene;
        this.damage = 25;
        this.speedInSecond = 500;
        this.range = 700;

        this.handleEvents();
    }
}