export interface BackendWeaponConfig {
    fireRate: number;
    reloadTime: number;
    clipSize: number;
    spreadBase: number;
    spreadIncrement: number;
    spreadMax: number;
    spreadRecovery: number;
}

export interface BackendWeaponsConfig {
    [weaponId: string]: BackendWeaponConfig;
}

export interface BackendWeaponState {
    id: string;
    ammo: number;
    clipSize: number;
    isReloading: boolean;
}

export interface BackendPlayer {
    socketId: string;
    color: string;
    length: number;
    width: number;
    rotation: number;
    pageX: number;
    pageY: number;
    weapon: BackendWeaponState;
}

export interface BackendEnemy {
    id: string,
    color: string,
    health: number,
    maxHealth: number,
    length: number,
    width: number,
    speedInSecond: number,
    rotation: number,
    startX: number,
    startY: number,
    createdAt: string,
    updatedAt: string
}

export interface BackendMissile {
    id: string,
    ownerId: string,
    damage: number,
    startX: number,
    startY: number,
    speedInSecond: number,
    rotation: number,
    range: number,
    createdAt: string
}

export interface BackendScene {
    serverCurrentDateTime: string,
    width: number,
    height: number,
    players: BackendPlayer[],
    enemies: BackendEnemy[],
    missiles: BackendMissile[]
}

// FRONTEND

export interface IMouseCoords {
    pageX: number;
    pageY: number;
}