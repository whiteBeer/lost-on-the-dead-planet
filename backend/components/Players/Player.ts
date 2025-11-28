import { Weapon } from "./Weapon";
import { PLAYER_CONFIG } from "../../configs/Players";

export class Player {
    public socketId: string;
    public color: string;
    public pageX: number;
    public pageY: number;
    public rotation: number;
    public width: number;
    public length: number;

    public weapon: Weapon;

    constructor(socketId: string, color: string, startX: number, startY: number) {
        this.socketId = socketId;
        this.color = color;
        this.pageX = startX;
        this.pageY = startY;
        this.rotation = 0;
        this.width = PLAYER_CONFIG.width;
        this.length = PLAYER_CONFIG.length;

        this.weapon = new Weapon("Rifle");
    }

    public destroy() {
        this.weapon.cancelReload();
    }

    public toJSON () {
        const { weapon, ...json } = this;
        return {
            ...json,
            weapon: weapon.toJSON()
        };
    }
}