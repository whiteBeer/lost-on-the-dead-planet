import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Редко меняет курс — таранит по прямой. */
export class Brute extends ChaseEnemy {
    private retargetLeft = 0;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Brute" });
        this.retargetLeft = 0;
    }

    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }

        this.retargetLeft -= 1;
        if (this.retargetLeft <= 0) {
            this.chaseToward(pos, player.pageX, player.pageY, 0);
            this.retargetLeft = 6 + Math.floor(Math.random() * 5);
            return;
        }

        // Продолжаем в прежнем направлении
        this.commitMove(pos.x, pos.y, this.rotation, this.defaultSpeedInSecond);
    }
}
