import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Оббегает игрока по дуге, постепенно сжимая кольцо. */
export class Hound extends ChaseEnemy {
    private side = Math.random() < 0.5 ? 1 : -1;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Hound" });
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
        // Касательная + немного внутрь
        const tangent = toPlayer + this.side * (Math.PI / 2);
        const inward = dist > 160 ? 0.35 : 0.9;
        const angle = Math.atan2(
            Math.sin(tangent) * (1 - inward) + Math.sin(toPlayer) * inward,
            Math.cos(tangent) * (1 - inward) + Math.cos(toPlayer) * inward
        );
        this.commitMove(pos.x, pos.y, angle, this.defaultSpeedInSecond);
    }
}
