import { Scene } from "../Scene";
import { Coords } from "../../types";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Спираль к игроку + стрельба по цели. */
export class Boss extends ChaseEnemy {
    private side = Math.random() < 0.5 ? 1 : -1;
    private readonly shootRange = 780;
    private readonly shotSpeed = 260;
    private readonly shotTravel = 980;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Boss" });
    }

    protected getViewDist() {
        return 520;
    }

    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }

        this.tryShoot(pos, player.pageX, player.pageY);

        const dx = player.pageX - pos.x;
        const dy = player.pageY - pos.y;
        const dist = Math.hypot(dx, dy) || 1;
        const toPlayer = Math.atan2(dy, dx);
        const tangent = toPlayer + this.side * (Math.PI / 2);
        const close = dist > 280 ? 0.45 : 0.85;
        const angle = Math.atan2(
            Math.sin(tangent) * (1 - close) + Math.sin(toPlayer) * close,
            Math.cos(tangent) * (1 - close) + Math.cos(toPlayer) * close
        );
        this.commitMove(pos.x, pos.y, angle, this.defaultSpeedInSecond);
    }

    private tryShoot(pos:Coords, tx:number, ty:number) {
        if (!this.canAttack()) {
            return;
        }
        const dx = tx - pos.x;
        const dy = ty - pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.shootRange || dist < 1) {
            return;
        }

        const rotation = Math.atan2(dy, dx);
        this.attack();
        this.scene.missilesCollection.createEnemyMissile({
            ownerId: this.id,
            startX: pos.x,
            startY: pos.y,
            rotation,
            damage: this.damageValue,
            speedInSecond: this.shotSpeed,
            range: this.shotTravel,
            bulletScale: 3
        });
    }
}
