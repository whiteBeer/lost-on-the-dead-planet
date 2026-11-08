import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Подходит, затем стрейфит вдоль линии огня. */
export class Soldier extends ChaseEnemy {
    private side = Math.random() < 0.5 ? 1 : -1;
    private readonly holdDist = 180;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Soldier" });
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

        if (dist > this.holdDist + 30) {
            this.chaseToward(pos, player.pageX, player.pageY, 0);
            return;
        }

        if (Math.random() < 0.04) {
            this.side *= -1;
        }
        this.commitMove(pos.x, pos.y, toPlayer + this.side * (Math.PI / 2), this.defaultSpeedInSecond);
    }
}
