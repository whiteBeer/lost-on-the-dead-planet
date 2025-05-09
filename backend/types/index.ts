export interface BaseCoords {
    x: number,
    y: number
}

export interface PlayerJSON {
    socketId: string,
    color: string,
    length: number,
    width: number,
    rotation: number,
    pageX: number,
    pageY: number
}

export interface EnemyJSON {
    id: string,
    color: string,
    health: number,
    currentHealth: number,
    length: number,
    width: number,
    speedInSecond: number,
    rotation: number,
    startX: number,
    startY: number,
    createdAt: string,
    updatedAt: string
}

export interface EnemyParams {
    rotation: number,
    startX: number,
    startY: number
}

export interface MissileJSON {
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

export interface MissileParams {
    weaponType: string,
    rotation: number,
    startX: number,
    startY: number
    ownerId: string
}