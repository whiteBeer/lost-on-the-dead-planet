export interface BackendWeaponConfig {
    id?:string;
    name?:string;
    fireRate:number;
    reloadTime:number;
    clipSize:number;
    spreadBase:number;
    spreadIncrement:number;
    spreadMax:number;
    spreadRecovery:number;
    pellets?:number;
    pelletCone?:number;
    pierce?:number;
}

export interface BackendWeaponsConfig {
    [weaponId:string]:BackendWeaponConfig;
}

export interface BackendWeaponState {
    id:string;
    ammo:number;
    clipSize:number;
    isReloading:boolean;
    damage?:number;
    /** Множитель разброса с перков. Сервер шлёт в weapon.spread. */
    spread?:number;
    /** Пауза между выстрелами, мс, уже с перками. */
    fireRate?:number;
}

export interface BackendPerkOffer {
    id:string;
    name:string;
    description:string;
    rarity:string;
    icon:string;
}

export interface BackendPlayer {
    socketId:string;
    color:string;
    name?:string;
    radius:number,
    health:number;
    maxHealth:number;
    rotation:number;
    pageX:number;
    pageY:number;
    isDead?:boolean;
    isReady?:boolean;
    exp?:number;
    level?:number;
    perks?:string[];
    speed?:number;
    weapon:BackendWeaponState;
    perkOffer?:BackendPerkOffer[];
}

export interface BackendEnemy {
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

export interface BackendMissile {
    id:string,
    ownerId:string,
    weaponType?:string,
    team?:"player" | "enemy",
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

export interface BackendPickup {
    id:string;
    kind:string;
    x:number;
    y:number;
    weaponId?:string;
}

export interface BackendSpectator {
    socketId:string;
    name:string;
}

export interface BackendScene {
    serverCurrentDateTime:string,
    width:number,
    height:number,
    edgePadX?:number,
    edgePadY?:number,
    phase?:"lobby" | "playing",
    hostSocketId?:string | null,
    canStart?:boolean,
    paused?:boolean,
    wave?:number,
    waveAnnouncing?:boolean,
    players:BackendPlayer[],
    spectators?:BackendSpectator[],
    enemies:BackendEnemy[],
    missiles:BackendMissile[],
    pickups?:BackendPickup[]
}

export interface IMouseCoords {
    pageX:number;
    pageY:number;
}
