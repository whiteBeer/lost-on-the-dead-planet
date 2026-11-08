import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Замирает, потом резко срывается к игроку. */
export class Stalker extends ChaseEnemy {
    private freezeLeft = 0;
    private lungeLeft = 0;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Stalker" });
        this.freezeLeft = 2 + Math.floor(Math.random() * 4);
    }

    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }

        if (this.freezeLeft > 0) {
            this.freezeLeft -= 1;
            this.commitMove(pos.x, pos.y, this.rotation, 0);
            if (this.freezeLeft === 0) {
                this.lungeLeft = 4 + Math.floor(Math.random() * 4);
            }
            return;
        }

        this.lungeLeft -= 1;
        this.chaseToward(pos, player.pageX, player.pageY, 0);
        // Во время рывка чуть быстрее
        this.speedInSecond = this.defaultSpeedInSecond * 1.55;
        this.scene.emit("enemiesUpdated", { enemy: this.toJSON() });

        if (this.lungeLeft <= 0) {
            this.freezeLeft = 3 + Math.floor(Math.random() * 5);
        }
    }
}
