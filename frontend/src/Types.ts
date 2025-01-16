export interface BackendPlayer {
    socketId: string,
    color: string,
    rotation: number,
    pageX: number,
    pageY: number
}

export interface BackendEnemy {
    id: string,
    color: string,
    size: number,
    speedInSecond: number,
    rotation: number,
    pageX: number,
    pageY: number,
    createdAt: string,
    updatedAt: string
}

export interface BackendMissile {
    id: string,
    ownerId: string,
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