import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Тяжёлая поступь с покачиванием. */
export class Behemoth extends ChaseEnemy {
    private sway = 0;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Behemoth" });
    }

    protected getMoveTickMs() {
        return 280;
    }

    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }
        this.sway += 0.35;
        this.chaseToward(pos, player.pageX, player.pageY, Math.sin(this.sway) * 0.25);
    }
}
