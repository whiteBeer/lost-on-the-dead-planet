import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Рывок → пауза → рывок. */
export class Runner extends ChaseEnemy {
    private dashLeft = 0;
    private restLeft = 0;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Runner" });
        this.dashLeft = 3 + Math.floor(Math.random() * 3);
    }

    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }

        if (this.restLeft > 0) {
            this.restLeft -= 1;
            this.commitMove(pos.x, pos.y, this.rotation, 0);
            if (this.restLeft === 0) {
                this.dashLeft = 3 + Math.floor(Math.random() * 4);
            }
            return;
        }

        this.dashLeft -= 1;
        this.chaseToward(pos, player.pageX, player.pageY, 0);
        if (this.dashLeft <= 0) {
            this.restLeft = 2 + Math.floor(Math.random() * 3);
        }
    }
}
