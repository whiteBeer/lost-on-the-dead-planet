/*
 * Сборщик движения врагов.
 * Ход игрока и пули сюда не кладутся: они уходят сразу.
 * Снаружи только mark. flush шлёт непустой буфер событием world.
 * Повторный snap того же id в окне затирает предыдущий.
 */

export interface EnemyMovementSnap {
    id:string;
    startX:number;
    startY:number;
    rotation:number;
    speedInSecond:number;
    updatedAt:string;
}

export class WorldBatch {

    private readonly enemies = new Map<string, EnemyMovementSnap>();

    markEnemy(snap:EnemyMovementSnap):void {
        this.enemies.set(snap.id, snap);
    }

    flush(emit:(eventName:string, data:object) => void):void {
        if (this.enemies.size > 0) {
            emit("world", {
                enemies: [...this.enemies.values()]
            });
        }
        this.enemies.clear();
    }
}
