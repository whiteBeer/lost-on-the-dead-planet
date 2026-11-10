import { Scene } from "../Scene";
import { SCENE_CONFIG } from "../../configs/Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Ходит по кругу вокруг точки спавна, на игрока не идёт. */
export class Spider extends ChaseEnemy {
    private pivotX:number;
    private pivotY:number;
    private angle:number;
    private readonly radius:number;
    private readonly dir:number;

    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Spider" });
        const body = Math.max(this.width, this.height) / 2;
        const padX = SCENE_CONFIG.edgePadX + body;
        const padY = SCENE_CONFIG.edgePadY + body;
        const maxRadius = Math.max(40, Math.min(
            (SCENE_CONFIG.width - padX * 2) / 2,
            (SCENE_CONFIG.height - padY * 2) / 2
        ));
        this.radius = Math.min(140 + Math.random() * 120, maxRadius);
        const minX = padX + this.radius;
        const maxX = SCENE_CONFIG.width - padX - this.radius;
        const minY = padY + this.radius;
        const maxY = SCENE_CONFIG.height - padY - this.radius;
        this.pivotX = Math.min(maxX, Math.max(minX, params.startX));
        this.pivotY = Math.min(maxY, Math.max(minY, params.startY));
        this.angle = Math.random() * Math.PI * 2;
        this.dir = Math.random() < 0.5 ? 1 : -1;

        const x = this.pivotX + Math.cos(this.angle) * this.radius;
        const y = this.pivotY + Math.sin(this.angle) * this.radius;
        this.startX = x;
        this.startY = y;
        this.speedInSecond = 0;
        this.updatedAt = new Date().toISOString();
    }

    protected tickMove() {
        const tickSec = this.getMoveTickMs() / 1000;
        const angular = (this.defaultSpeedInSecond / this.radius) * this.dir;
        const nextAngle = this.angle + angular * tickSec;

        const curX = this.pivotX + Math.cos(this.angle) * this.radius;
        const curY = this.pivotY + Math.sin(this.angle) * this.radius;
        const nextX = this.pivotX + Math.cos(nextAngle) * this.radius;
        const nextY = this.pivotY + Math.sin(nextAngle) * this.radius;
        const dx = nextX - curX;
        const dy = nextY - curY;
        const chord = Math.hypot(dx, dy);

        this.angle = nextAngle;
        this.commitMove(curX, curY, Math.atan2(dy, dx), chord / tickSec);
    }
}
