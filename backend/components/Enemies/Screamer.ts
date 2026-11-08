import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Хаотично дёргается, в среднем к игроку. */
export class Screamer extends ChaseEnemy {
    private jitter = 0;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Screamer" });
    }

    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }

        this.jitter += (Math.random() - 0.5) * 1.4;
        this.jitter *= 0.7;
        this.chaseToward(pos, player.pageX, player.pageY, this.jitter);
    }
}
