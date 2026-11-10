import { Scene } from "../Scene";
import { BaseEnemy } from "./BaseEnemy";
import { ChaseSpawnParams } from "./ChaseEnemy";
import { pickEnemyForTier, EnemyTier } from "../../configs/Enemies";
import { Zombie } from "./Zombie";
import { Crawler } from "./Crawler";
import { Runner } from "./Runner";
import { Hound } from "./Hound";
import { Spitter } from "./Spitter";
import { Bloater } from "./Bloater";
import { Screamer } from "./Screamer";
import { Spider } from "./Spider";
import { Stalker } from "./Stalker";
import { Brute } from "./Brute";
import { Behemoth } from "./Behemoth";
import { Boss } from "./Boss";

type EnemyCtor = new (scene:Scene, params:Omit<ChaseSpawnParams, "enemyId">) => BaseEnemy;

const ENEMY_BY_ID:Record<string, EnemyCtor> = {
    Zombie,
    Crawler,
    Runner,
    Hound,
    Spitter,
    Bloater,
    Screamer,
    Spider,
    Stalker,
    Brute,
    Behemoth,
    Boss
};

export function createEnemyById(
    scene:Scene,
    enemyId:string,
    params:Omit<ChaseSpawnParams, "enemyId">
):BaseEnemy {
    const Ctor = ENEMY_BY_ID[enemyId] || Zombie;
    return new Ctor(scene, params);
}

export function createEnemyForTier(
    scene:Scene,
    tier:EnemyTier,
    startX:number,
    startY:number,
    hpMul:number,
    damageMul:number,
    speedMul = 1,
    fireRateMul = 1,
    wave = 1
):BaseEnemy {
    const enemyId = pickEnemyForTier(tier, wave);
    return createEnemyById(scene, enemyId, {
        rotation: 0,
        startX,
        startY,
        hpMul,
        damageMul,
        speedMul,
        fireRateMul,
        colorTier: tier
    });
}
