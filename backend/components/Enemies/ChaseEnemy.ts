import { Scene } from "../Scene";
import { BaseEnemy } from "./BaseEnemy";
import { Coords, EnemyParams } from "../../types";
import { calcTimedPoint } from "../../utils/geometry";
import { ENEMIES, EnemyConfig } from "../../configs/Enemies";

export interface ChaseSpawnParams extends EnemyParams {
    enemyId:string;
    hpMul?:number;
    damageMul?:number;
    speedMul?:number;
}

/**
 * Общий chase-AI. Конкретные монстры — подклассы со своим enemyId;
 * поведение (тик, агро, атака) переопределяется в файле монстра.
 */
export abstract class ChaseEnemy extends BaseEnemy {

    moveInterval:NodeJS.Timeout | null = null;

    protected serverProps:{
        flankBias:number;
        viewDist:number;
    };

    constructor(scene:Scene, params:ChaseSpawnParams) {
        super(scene, params);
        this.scene = scene;

        const cfg:EnemyConfig = ENEMIES[params.enemyId] || ENEMIES.Zombie;
        this.applyConfig(cfg, params);

        this.serverProps = {
            flankBias: (Math.random() - 0.5) * 1.2,
            viewDist: this.getViewDist()
        };

        this.move();
    }

    protected applyConfig(cfg:EnemyConfig, params:ChaseSpawnParams) {
        const hpMul = params.hpMul ?? 1;
        const damageMul = params.damageMul ?? 1;
        const speedMul = params.speedMul ?? 1;
        const sizeScale = this.getSizeScale(cfg);

        this.type = cfg.id.toLowerCase();
        this.tier = cfg.tier;
        this.tint = cfg.tint;
        this.spriteKey = cfg.spriteKey;
        this.exp = cfg.exp;
        this.color = `#${cfg.tint.toString(16).padStart(6, "0")}`;

        this.width = Math.round(cfg.width * sizeScale);
        this.height = Math.round(cfg.height * sizeScale);
        this.bulletHit = {
            width: Math.round(cfg.bulletHit.width * sizeScale),
            height: Math.round(cfg.bulletHit.height * sizeScale)
        };
        this.playerTouch = {
            width: Math.round(cfg.playerTouch.width * sizeScale),
            height: Math.round(cfg.playerTouch.height * sizeScale)
        };

        const baseSpeed = (cfg.speed + Math.round(Math.random() * cfg.speedJitter)) * speedMul;
        this.defaultSpeedInSecond = baseSpeed;
        this.speedInSecond = this.defaultSpeedInSecond;

        this.health = Math.max(1, Math.round(cfg.health * hpMul * sizeScale));
        this.maxHealth = this.health;
        this.damageValue = Math.round(cfg.damage * damageMul);
        this.attackInterval = cfg.attackInterval;
    }

    protected getSizeScale(cfg:EnemyConfig) {
        if (cfg.tier === "boss") {
            return 1.25;
        }
        return 0.7 + Math.random() * 0.6;
    }

    protected getViewDist() {
        return 350;
    }

    protected getMoveTickMs() {
        return 200;
    }

    protected restartMovement() {
        this.move();
    }

    move() {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
        const tickMs = this.getMoveTickMs();
        this.moveInterval = setInterval(() => this.tickMove(), tickMs);
    }

    /** Хук AI на тик — переопределяй в конкретном монстре. */
    protected tickMove() {
        const pos = this.getPos();
        const player = this.findNearestPlayer(pos);
        if (!player) {
            this.idleSpin(pos);
            return;
        }
        this.chaseToward(pos, player.pageX, player.pageY, this.serverProps.flankBias);
    }

    protected getPos():Coords {
        return calcTimedPoint(
            this.startX, this.startY, this.rotation, this.speedInSecond, this.updatedAt
        );
    }

    protected commitMove(x:number, y:number, angle:number, speed:number) {
        this.startX = x;
        this.startY = y;
        this.rotation = angle;
        this.speedInSecond = speed;
        this.updatedAt = new Date().toISOString();
        this.scene.emit("enemiesUpdated", { enemy: this.toJSON() });
    }

    protected idleSpin(pos:Coords) {
        this.commitMove(pos.x, pos.y, this.rotation + 0.03, 0);
    }

    /** Прямой chase с опциональным смещением угла (фланг). */
    protected chaseToward(pos:Coords, tx:number, ty:number, angleBias = 0) {
        const angle = Math.atan2(ty - pos.y, tx - pos.x) + angleBias;
        this.commitMove(pos.x, pos.y, angle, this.defaultSpeedInSecond);
    }

    findNearestPlayer(enemyCoords:Coords) {
        const players = this.scene.playersCollection.getLivePlayers();

        if (players.length === 0) {
            return null;
        }

        let nearestPlayer = players[0];
        let minDistanceSq = Math.pow(players[0].pageX - enemyCoords.x, 2) +
            Math.pow(players[0].pageY - enemyCoords.y, 2);

        for (let i = 1; i < players.length; i++) {
            const p = players[i];
            const distSq = Math.pow(p.pageX - enemyCoords.x, 2) +
                Math.pow(p.pageY - enemyCoords.y, 2);

            if (distSq < minDistanceSq) {
                nearestPlayer = p;
                minDistanceSq = distSq;
            }
        }

        return nearestPlayer;
    }
}
