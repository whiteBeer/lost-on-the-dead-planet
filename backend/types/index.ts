export interface Player {
    socketId: string,
    color: string,
    rotation?: number,
    pageX?: number,
    pageY?: number
}

export interface Enemy {
    color: string,
    size: number,
    speedInSecond: number,
    rotation: number,
    pageX: number,
    pageY: number,
    createdAt: string,
    updatedAt: string
}

export interface Missile {
    id: string,
    ownerId: string,
    startX: number,
    startY: number,
    speedInSecond: number,
    rotation: number,
    createdAt: string
}