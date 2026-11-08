import { Scene } from "../Scene";
import { ChaseEnemy, ChaseSpawnParams } from "./ChaseEnemy";

/** Прямой chase с лёгким флангом. */
export class Zombie extends ChaseEnemy {
    constructor(scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) {
        super(scene, { ...params, enemyId: "Zombie" });
    }
}
