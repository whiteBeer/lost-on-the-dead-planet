import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Медленно прёт прямо, иногда останавливается «перевести дух». */
export class Bloater extends ChaseEnemy {
    private pauseLeft = 0;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Bloater" });
    }

    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }

        if (this.pauseLeft > 0) {
            this.pauseLeft -= 1;
            this.commitMove(pos.x, pos.y, this.rotation, 0);
            return;
        }

        if (Math.random() < 0.08) {
            this.pauseLeft = 2 + Math.floor(Math.random() * 3);
            this.commitMove(pos.x, pos.y, this.rotation, 0);
            return;
        }

        this.chaseToward(pos, player.pageX, player.pageY, 0);
    }
}
