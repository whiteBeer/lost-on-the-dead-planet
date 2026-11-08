import { randomUUID } from "crypto";
import { PLAYER_CONFIG } from "../../configs/Players";

export type PickupKind = "weapon";

export interface PickupJSON {
    id:string;
    kind:PickupKind;
    x:number;
    y:number;
    weaponId?:string;
    weaponLevel?:number;
    expiresAt:number;
}

export class Pickup {
    public readonly id:string;
    public readonly kind:PickupKind;
    public x:number;
    public y:number;
    public weaponId?:string;
    public weaponLevel:number;
    public readonly expiresAt:number;

    constructor(kind:PickupKind, x:number, y:number, weaponId?:string, weaponLevel = 1, lifetimeMs = PLAYER_CONFIG.pickupLifetimeMs) {
        this.id = randomUUID();
        this.kind = kind;
        this.x = x;
        this.y = y;
        this.weaponId = weaponId;
        this.weaponLevel = weaponLevel;
        this.expiresAt = Date.now() + lifetimeMs;
    }

    toJSON():PickupJSON {
        return {
            id: this.id,
            kind: this.kind,
            x: this.x,
            y: this.y,
            weaponId: this.weaponId,
            weaponLevel: this.weaponLevel,
            expiresAt: this.expiresAt
        };
    }
}
