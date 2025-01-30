export interface BaseCoords {
    x: number,
    y: number
}

export interface Player {
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

export interface Missile {
    id: string,
    ownerId: string,
    startX: number,
    startY: number,
    speedInSecond: number,
    rotation: number,
    range: number,
    createdAt: string
}