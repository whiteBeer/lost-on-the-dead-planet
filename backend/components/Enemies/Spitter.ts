import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Держит дистанцию: близко — отходит, далеко — подходит, в зоне — орбитит. */
export class Spitter extends ChaseEnemy {
    private side = Math.random() < 0.5 ? 1 : -1;
    private readonly preferDist = 220;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Spitter" });
    }

    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }

        const dx = player.pageX - pos.x;
        const dy = player.pageY - pos.y;
        const dist = Math.hypot(dx, dy) || 1;
        const toPlayer = Math.atan2(dy, dx);

        let angle = toPlayer;
        if (dist < this.preferDist - 40) {
            angle = toPlayer + Math.PI; // назад
        } else if (dist > this.preferDist + 50) {
            angle = toPlayer; // ближе
        } else {
            angle = toPlayer + this.side * (Math.PI / 2); // стрейф
        }
        this.commitMove(pos.x, pos.y, angle, this.defaultSpeedInSecond);
    }
}
