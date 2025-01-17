export interface Player {
    socketId: string,
    color: string,
    length: number,
    width: number,
    rotation: number,
    pageX: number,
    pageY: number
}

export interface Enemy {
    id: string,
    color: string,
    length: number,
    width: number,
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
    range: number,
    createdAt: string
}