import { Scene } from "./Scene";
import {
    WAVES_CONFIG,
    flattenComposition,
    getWaveComposition,
    isBossWave,
    waveDurationMs,
    waveHpMul,
    waveDamageMul,
    waveSpeedMul,
    hordeCountForWave,
    pickHordeEnemyId,
    pickColorForWave,
    hordeSize
} from "../configs/Waves";
import { EnemyTier } from "../configs/Enemies";

interface PendingSpawn {
    timeout:NodeJS.Timeout;
    dueAt:number;
    tier:EnemyTier;
    hpMul:number;
    dmgMul:number;
    speedMul:number;
    fireRateMul:number;
    /** Сколько слотов спавна закрывает этот таймер (орда = её размер) */
    count:number;
    hordeEnemyId?:string;
    hordeColor?:EnemyTier;
}

interface FrozenSpawn {
    remainingMs:number;
    tier:EnemyTier;
    hpMul:number;
    dmgMul:number;
    speedMul:number;
    fireRateMul:number;
    count:number;
    hordeEnemyId?:string;
    hordeColor?:EnemyTier;
}

export class WaveDirector {
    private readonly scene:Scene;
    private wave = 0;
    private announcedWave = 0;
    private active = false;
    private betweenTimer:NodeJS.Timeout | null = null;
    private betweenDueAt:number | null = null;
    private betweenRemainingMs:number | null = null;
    private started = false;
    private pendingSpawns = 0;
    private spawnTimeouts:PendingSpawn[] = [];
    private frozenSpawns:FrozenSpawn[] = [];
    private generation = 0;
    private paused = false;

    constructor(scene:Scene) {
        this.scene = scene;
    }

    getWave() {
        return this.wave;
    }

    /** Волна для HUD: во время анонса уже N, хотя спавн ещё не начался. */
    getDisplayWave() {
        return Math.max(this.wave, this.announcedWave);
    }

    isAnnouncing() {
        return this.announcedWave > this.wave;
    }

    isBetweenWaves() {
        return !this.active && this.started;
    }

    isPaused() {
        return this.paused;
    }

    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.scheduleNext(WAVES_CONFIG.firstWaveDelayMs);
    }

    reset() {
        this.clearTimer();
        this.clearSpawnTimeouts();
        this.wave = 0;
        this.announcedWave = 0;
        this.active = false;
        this.started = false;
        this.pendingSpawns = 0;
        this.betweenRemainingMs = null;
        this.frozenSpawns = [];
        this.paused = false;
        this.generation += 1;
    }

    pause() {
        if (this.paused || !this.started) {
            return;
        }
        this.paused = true;
        const now = Date.now();

        if (this.betweenTimer && this.betweenDueAt !== null) {
            this.betweenRemainingMs = Math.max(0, this.betweenDueAt - now);
            clearTimeout(this.betweenTimer);
            this.betweenTimer = null;
            this.betweenDueAt = null;
        }

        this.frozenSpawns = this.spawnTimeouts.map((spawn) => ({
            remainingMs: Math.max(0, spawn.dueAt - now),
            tier: spawn.tier,
            hpMul: spawn.hpMul,
            dmgMul: spawn.dmgMul,
            speedMul: spawn.speedMul,
            fireRateMul: spawn.fireRateMul,
            count: spawn.count,
            hordeEnemyId: spawn.hordeEnemyId,
            hordeColor: spawn.hordeColor
        }));
        this.spawnTimeouts.forEach((spawn) => clearTimeout(spawn.timeout));
        this.spawnTimeouts = [];
    }

    resume() {
        if (!this.paused) {
            return;
        }
        this.paused = false;

        if (this.betweenRemainingMs !== null) {
            const remaining = this.betweenRemainingMs;
            this.betweenRemainingMs = null;
            this.armBetweenTimer(remaining);
        }

        if (this.frozenSpawns.length > 0) {
            const generation = this.generation;
            const frozen = this.frozenSpawns;
            this.frozenSpawns = [];
            this.pendingSpawns = frozen.length;
            frozen.forEach((spawn) => {
                this.armSpawn(spawn, generation);
            });
        }
    }

    /** Вызывать когда врагов стало 0 */
    onEnemiesCleared() {
        if (!this.active || this.pendingSpawns > 0) {
            return;
        }
        if (this.scene.enemiesCollection.getAliveCount() > 0) {
            return;
        }
        this.active = false;
        this.scene.emit("waveCleared", { wave: this.wave });
        if (this.scene.playersCollection.getLivePlayers().length === 0) {
            return;
        }
        this.scheduleNext(WAVES_CONFIG.pauseBetweenWavesMs);
    }

    destroy() {
        this.clearTimer();
        this.clearSpawnTimeouts();
        this.frozenSpawns = [];
        this.betweenRemainingMs = null;
    }

    private scheduleNext(delayMs:number) {
        this.clearTimer();
        const upcoming = this.wave + 1;
        this.announcedWave = upcoming;
        const composition = getWaveComposition(upcoming);
        this.scene.emit("waveStarted", {
            wave: upcoming,
            composition,
            hpMul: waveHpMul(upcoming),
            speedMul: waveSpeedMul(upcoming),
            count: flattenComposition(composition).length,
            announcing: true,
            isBoss: isBossWave(upcoming)
        });
        this.armBetweenTimer(delayMs);
    }

    private armBetweenTimer(delayMs:number) {
        this.clearTimer();
        this.betweenDueAt = Date.now() + delayMs;
        this.betweenTimer = setTimeout(() => {
            this.betweenTimer = null;
            this.betweenDueAt = null;
            this.beginWave();
        }, delayMs);
    }

    private beginWave() {
        if (this.scene.playersCollection.getLivePlayers().length === 0) {
            this.active = false;
            return;
        }
        this.wave += 1;
        this.announcedWave = this.wave;
        this.active = true;
        const generation = this.generation;
        const composition = getWaveComposition(this.wave);
        const tiers = flattenComposition(composition);
        const hpMul = waveHpMul(this.wave);
        const dmgMul = waveDamageMul(this.wave);
        const speedMul = waveSpeedMul(this.wave);
        this.pendingSpawns = tiers.length;
        // Равномерно растягиваем спавн: 20с + 10с × (wave - 1)
        const durationMs = waveDurationMs(this.wave);
        const spawnGapMs = tiers.length <= 1
            ? 0
            : Math.max(400, Math.floor(durationMs / tiers.length));

        tiers.forEach((tier, index) => {
            // Босс жирнее и злее с каждым циклом (5 → 10 → 15…)
            const bossIndex = Math.max(0, Math.floor(this.wave / WAVES_CONFIG.bossEveryNWaves) - 1);
            const tierHpMul = tier === "boss"
                ? hpMul * (1.4 + bossIndex * 0.35)
                : hpMul;
            const fireRateMul = tier === "boss"
                ? 1 + bossIndex * 0.25
                : 1;
            this.armSpawn({
                remainingMs: index * spawnGapMs,
                tier,
                hpMul: tierHpMul,
                dmgMul,
                speedMul: tier === "boss" ? Math.min(speedMul, 1.15) : speedMul,
                fireRateMul,
                count: 1
            }, generation);
        });

        // Орды: пачка одного типа за экраном, идут на игрока
        const hordes = hordeCountForWave(this.wave);
        for (let i = 0; i < hordes; i++) {
            const size = hordeSize(this.wave);
            this.pendingSpawns += size;
            this.armSpawn({
                remainingMs: Math.floor(Math.random() * durationMs * 0.7),
                tier: "green",
                hpMul,
                dmgMul,
                speedMul,
                fireRateMul: 1,
                count: size,
                hordeEnemyId: pickHordeEnemyId(this.wave),
                hordeColor: pickColorForWave(this.wave)
            }, generation);
        }
    }

    private armSpawn(spawn:FrozenSpawn, generation:number) {
        const dueAt = Date.now() + spawn.remainingMs;
        const timeout = setTimeout(() => {
            this.spawnTimeouts = this.spawnTimeouts.filter((el) => el.timeout !== timeout);
            if (generation !== this.generation) {
                return;
            }
            if (spawn.hordeEnemyId) {
                this.spawnHorde(
                    spawn.hordeEnemyId,
                    spawn.count,
                    spawn.hpMul,
                    spawn.dmgMul,
                    spawn.speedMul,
                    spawn.hordeColor || "green"
                );
            } else {
                this.spawnAtEdge(spawn.tier, spawn.hpMul, spawn.dmgMul, spawn.speedMul, spawn.fireRateMul);
            }
            this.pendingSpawns = Math.max(0, this.pendingSpawns - Math.max(1, spawn.count || 1));
            if (this.pendingSpawns === 0 && this.scene.enemiesCollection.getAliveCount() === 0) {
                this.onEnemiesCleared();
            }
        }, spawn.remainingMs);
        this.spawnTimeouts.push({
            timeout,
            dueAt,
            tier: spawn.tier,
            hpMul: spawn.hpMul,
            dmgMul: spawn.dmgMul,
            speedMul: spawn.speedMul,
            fireRateMul: spawn.fireRateMul,
            count: spawn.count || 1,
            hordeEnemyId: spawn.hordeEnemyId,
            hordeColor: spawn.hordeColor
        });
    }

    private clearSpawnTimeouts() {
        this.spawnTimeouts.forEach((spawn) => clearTimeout(spawn.timeout));
        this.spawnTimeouts = [];
        this.pendingSpawns = 0;
        this.frozenSpawns = [];
    }

    private spawnAtEdge(
        tier:EnemyTier,
        hpMul:number,
        dmgMul:number,
        speedMul:number,
        fireRateMul = 1
    ) {
        const w = this.scene.getWidth();
        const h = this.scene.getHeight();
        // Спавн чуть за краем видимой арены, но не слишком далеко от центра
        const margin = 30;
        const side = Math.floor(Math.random() * 4);
        // На ранних волнах сужаем кольцо спавна, чтобы добегали быстрее
        const ring = Math.min(0.48, 0.28 + this.wave * 0.04);
        const cx = w / 2;
        const cy = h / 2;
        const rx = w * ring;
        const ry = h * ring;
        let x = 0;
        let y = 0;
        switch (side) {
        case 0: // top
            x = cx + (Math.random() - 0.5) * 2 * rx;
            y = cy - ry - margin;
            break;
        case 1: // right
            x = cx + rx + margin;
            y = cy + (Math.random() - 0.5) * 2 * ry;
            break;
        case 2: // bottom
            x = cx + (Math.random() - 0.5) * 2 * rx;
            y = cy + ry + margin;
            break;
        default: // left
            x = cx - rx - margin;
            y = cy + (Math.random() - 0.5) * 2 * ry;
            break;
        }
        this.scene.enemiesCollection.spawnTier(tier, x, y, hpMul, dmgMul, speedMul, fireRateMul, this.wave);
    }

    /** Пачка одного типа кучно за краем арены — дальше сами идут на игрока. */
    private spawnHorde(
        enemyId:string,
        size:number,
        hpMul:number,
        dmgMul:number,
        speedMul:number,
        color:EnemyTier
    ) {
        const w = this.scene.getWidth();
        const h = this.scene.getHeight();
        const margin = 80;
        const side = Math.floor(Math.random() * 4);
        const cx = w / 2;
        const cy = h / 2;
        let ox = cx;
        let oy = cy;
        switch (side) {
        case 0:
            oy = -margin;
            ox = cx + (Math.random() - 0.5) * w * 0.5;
            break;
        case 1:
            ox = w + margin;
            oy = cy + (Math.random() - 0.5) * h * 0.5;
            break;
        case 2:
            oy = h + margin;
            ox = cx + (Math.random() - 0.5) * w * 0.5;
            break;
        default:
            ox = -margin;
            oy = cy + (Math.random() - 0.5) * h * 0.5;
            break;
        }
        for (let i = 0; i < size; i++) {
            const x = ox + (Math.random() - 0.5) * 110;
            const y = oy + (Math.random() - 0.5) * 110;
            this.scene.enemiesCollection.spawnById(enemyId, x, y, hpMul, dmgMul, speedMul, color);
        }
    }

    private clearTimer() {
        if (this.betweenTimer) {
            clearTimeout(this.betweenTimer);
            this.betweenTimer = null;
        }
        this.betweenDueAt = null;
    }
}
