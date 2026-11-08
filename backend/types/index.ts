export interface Coords {
    x:number,
    y:number
}

export interface Rectangle {
    width:number,
    height:number,
    rotation:number
}

export interface PlayerJSON {
    socketId:string,
    color:string,
    radius:number,
    rotation:number,
    pageX:number,
    pageY:number,
    health:number,
    maxHealth:number,
    isDead:boolean,
    isReady?:boolean,
    exp?:number,
    level?:number,
    perks?:string[],
    speed?:number,
    baseSpeed?:number,
    stamina?:number,
    maxStamina?:number,
    sprinting?:boolean,
    aiming?:boolean,
    dashCooldownMs?:number,
    combo?:number,
    bestCombo?:number,
    weapon:{
        id:string,
        level?:number,
        ammo:number,
        clipSize:number,
        fireRate?:number,
        isReloading:boolean
    },
    equippedSlot?:number,
    inventory?:Array<null | {
        slot:number,
        id:string,
        level:number,
        ammo:number,
        clipSize:number,
        fireRate:number,
        isReloading:boolean
    }>,
    perkOffer?:Array<{
        id:string,
        name:string,
        description:string,
        rarity:string,
        icon:string
    }>
}

export interface EnemyJSON {
    id:string,
    type:string;
    color:string,
    health:number,
    maxHealth:number,
    width:number,
    height:number,
    bulletHit?:{ width:number, height:number },
    playerTouch?:{ width:number, height:number },
    speedInSecond:number,
    rotation:number,
    startX:number,
    startY:number,
    createdAt:string,
    updatedAt:string,
    tier?:string,
    tint?:number,
    spriteKey?:string,
    exp?:number
}

export interface EnemyParams {
    rotation:number,
    startX:number,
    startY:number
}

export type MissileTeam = "player" | "enemy";

export interface MissileJSON {
    id:string,
    ownerId:string,
    weaponType?:string,
    team?:MissileTeam,
    /** Множитель визуала/хитбокса относительно обычной пули (босс = 3) */
    bulletScale?:number,
    damage:number,
    startX:number,
    startY:number,
    speedInSecond:number,
    rotation:number,
    range:number,
    pierceLeft?:number,
    createdAt:string
}

export interface MissileParams {
    weaponType:string,
    rotation:number,
    startX:number,
    startY:number,
    ownerId:string,
    team?:MissileTeam,
    damage?:number,
    speedInSecond?:number,
    range?:number,
    pierce?:number
}

export interface EnemyMissileParams {
    rotation:number,
    startX:number,
    startY:number,
    ownerId:string,
    damage:number,
    speedInSecond:number,
    range:number,
    bulletScale?:number
}

export interface PickupJSON {
    id:string,
    kind:string,
    x:number,
    y:number,
    weaponId?:string,
    weaponLevel?:number,
    expiresAt?:number
}
