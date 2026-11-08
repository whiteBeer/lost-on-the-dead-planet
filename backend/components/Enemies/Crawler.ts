import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Ползёт зигзагом к игроку. */
export class Crawler extends ChaseEnemy {
    private phase = Math.random() * Math.PI * 2;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Crawler" });
    }

    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }
        this.phase += 0.55;
        const weave = Math.sin(this.phase) * 0.85;
        this.chaseToward(pos, player.pageX, player.pageY, weave);
    }
}
