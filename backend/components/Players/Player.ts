import { Weapon } from "./Weapon";
import { PLAYER_CONFIG } from "../../configs/Players";

export class Player {
    public socketId:string;
    public color:string;
    public pageX:number;
    public pageY:number;
    public rotation:number;
    public radius:number;

    public health = PLAYER_CONFIG.defaultHealth;
    public maxHealth = PLAYER_CONFIG.defaultHealth;
    public isDead = false;

    public weapon:Weapon;

    constructor(socketId:string, color:string, startX:number, startY:number) {
        this.socketId = socketId;
        this.color = color;
        this.pageX = startX;
        this.pageY = startY;
        this.rotation = 0;
        this.radius = PLAYER_CONFIG.radius;

        this.weapon = new Weapon("Rifle");
    }

    public takeDamage(amount:number):boolean {
        if (this.isDead) return false;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            return true;
        }
        return false;
    }

    public respawn() {
        this.health = this.maxHealth;
        this.isDead = false;
    }

    public destroy() {
        this.weapon.cancelReload();
    }

    public toJSON() {
        const { weapon, ...json } = this;
        return {
            ...json,
            weapon: weapon.toJSON()
        };
    }
}