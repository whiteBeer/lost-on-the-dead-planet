import { randomUUID } from "crypto";
import { PLAYER_CONFIG } from "../../configs/Players";

export type PickupKind = "weapon" | "bomb" | "medkit";

export interface PickupJSON {
    id:string;
    kind:PickupKind;
    x:number;
    y:number;
    weaponId?:string;
    expiresAt:number;
}

export class Pickup {
    public readonly id:string;
    public readonly kind:PickupKind;
    public x:number;
    public y:number;
    public weaponId?:string;
    public readonly expiresAt:number;

    constructor(kind:PickupKind, x:number, y:number, weaponId?:string, lifetimeMs = PLAYER_CONFIG.pickupLifetimeMs) {
        this.id = randomUUID();
        this.kind = kind;
        this.x = x;
        this.y = y;
        this.weaponId = weaponId;
        this.expiresAt = Date.now() + lifetimeMs;
    }

    toJSON():PickupJSON {
        return {
            id: this.id,
            kind: this.kind,
            x: this.x,
            y: this.y,
            weaponId: this.weaponId,
            expiresAt: this.expiresAt
        };
    }
}
