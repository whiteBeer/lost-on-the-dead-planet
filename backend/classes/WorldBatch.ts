import { MissileJSON } from "../types";

/*
 * Сборщик движения врагов и пуль комнаты.
 * Ход игрока сюда не кладётся: он уходит сразу, в момент смены клавиш.
 * Снаружи только mark. flush шлёт непустые буферы отдельными событиями:
 * world, missilesAdded, missilesRemoved.
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
    private missilesAdded:MissileJSON[] = [];
    private missilesRemoved:string[] = [];

    markEnemy(snap:EnemyMovementSnap):void {
        this.enemies.set(snap.id, snap);
    }

    markMissileAdded(missile:MissileJSON):void {
        const existingIndex = this.missilesAdded.findIndex((item) => item.id === missile.id);
        if (existingIndex !== -1) {
            this.missilesAdded[existingIndex] = missile;
            return;
        }
        this.missilesAdded.push(missile);
    }

    markMissileRemoved(id:string):void {
        this.missilesRemoved.push(id);
    }

    flush(emit:(eventName:string, data:object) => void):void {
        if (this.enemies.size > 0) {
            emit("world", {
                enemies: [...this.enemies.values()]
            });
        }
        if (this.missilesAdded.length > 0) {
            emit("missilesAdded", { missiles: this.missilesAdded });
        }
        if (this.missilesRemoved.length > 0) {
            emit("missilesRemoved", { ids: this.missilesRemoved });
        }
        this.enemies.clear();
        this.missilesAdded = [];
        this.missilesRemoved = [];
    }
}
