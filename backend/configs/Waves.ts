import { EnemyTier, monstersForWave } from "./Enemies";

export interface WaveComposition {
    green:number;
    yellow:number;
    red:number;
    boss?:number;
}

export const WAVES_CONFIG = {
    pauseBetweenWavesMs: 4500,
    firstWaveDelayMs: 2800,
    /** Длительность 1-й волны; каждая следующая +waveDurationStepMs (потолок maxWaveDurationMs) */
    firstWaveDurationMs: 20_000,
    waveDurationStepMs: 5_000,
    maxWaveDurationMs: 60_000,
    /** Составы ниже посчитаны на это окно; count *= duration / reference */
    referenceDurationMs: 60_000,
    /** +30% обычных монстров за каждую волну после первой (поверх масштаба от длительности) */
    countMulPerWave: 0.5,
    /** Каждая N-я волна — босс */
    bossEveryNWaves: 5,
    /** Базовый шанс дропа оружия с врага */
    baseDropChance: 0.18,
    /** Прирост шанса дропа за волну */
    dropChancePerWave: 0.015,
    maxDropChance: 0.35,
    /** HP/damage/speed множители: 1 + k * (wave - 1) */
    hpMulPerWave: 0.15,
    damageMulPerWave: 0.12,
    speedMulPerWave: 0.08,
    /** Потолок скорости, чтобы не улетали */
    maxSpeedMul: 2.2
};

export function expForLevel(level:number):number {
    const n = Math.max(1, level);
    return 100 + n * n * 10;
}

export function waveHpMul(wave:number):number {
    return 1 + WAVES_CONFIG.hpMulPerWave * Math.max(0, wave - 1);
}

export function waveDamageMul(wave:number):number {
    return 1 + WAVES_CONFIG.damageMulPerWave * Math.max(0, wave - 1);
}

export function waveSpeedMul(wave:number):number {
    return Math.min(
        WAVES_CONFIG.maxSpeedMul,
        1 + WAVES_CONFIG.speedMulPerWave * Math.max(0, wave - 1)
    );
}

export function dropChanceForWave(wave:number):number {
    return Math.min(
        WAVES_CONFIG.maxDropChance,
        WAVES_CONFIG.baseDropChance + WAVES_CONFIG.dropChancePerWave * Math.max(0, wave - 1)
    );
}

/** Волна 1 = 20с, каждая следующая +5с, максимум 60с */
export function waveDurationMs(wave:number):number {
    const raw = WAVES_CONFIG.firstWaveDurationMs
        + Math.max(0, wave - 1) * WAVES_CONFIG.waveDurationStepMs;
    return Math.min(WAVES_CONFIG.maxWaveDurationMs, raw);
}

export function isBossWave(wave:number):boolean {
    return wave > 0 && wave % WAVES_CONFIG.bossEveryNWaves === 0;
}

/** До 5-й волны одна орда, с 5-й +1 орда за каждую волну. */
export function hordeCountForWave(wave:number):number {
    if (wave < 5) {
        return 1;
    }
    return wave - 3;
}

/** Доли цветов: волна 1 — только зелёные, дальше больше жёлтых и красных. */
export function colorShares(wave:number) {
    const t = Math.max(0, wave - 1);
    let red = Math.min(0.38, Math.max(0, (t - 2) * 0.03));
    let yellow = Math.min(0.46, t * 0.045);
    if (red + yellow > 0.88) {
        const k = 0.88 / (red + yellow);
        red *= k;
        yellow *= k;
    }
    return { green: 1 - red - yellow, yellow, red };
}

export function pickColorForWave(wave:number):Exclude<EnemyTier, "boss"> {
    const shares = colorShares(wave);
    const roll = Math.random();
    if (roll < shares.red) {
        return "red";
    }
    if (roll < shares.red + shares.yellow) {
        return "yellow";
    }
    return "green";
}

/** Один тип на всю орду. Паук не берётся — он не идёт на игрока. */
export function pickHordeEnemyId(wave:number):string {
    const pool = monstersForWave(wave).filter((id) => id !== "Spider");
    return pool[Math.floor(Math.random() * pool.length)];
}

export function hordeSize(wave:number):number {
    return Math.max(1, wave) * 2;
}

function scaleComposition(comp:WaveComposition, wave:number):WaveComposition {
    const durationScale = waveDurationMs(wave) / WAVES_CONFIG.referenceDurationMs;
    const ageScale = 1 + WAVES_CONFIG.countMulPerWave * Math.max(0, wave - 1);
    const scale = durationScale * ageScale;
    let green = Math.round(comp.green * scale);
    const yellow = Math.round(comp.yellow * scale);
    const red = Math.round(comp.red * scale);
    if (green + yellow + red === 0 && !(comp.boss && comp.boss > 0)) {
        green = 1;
    }
    return { green, yellow, red, boss: comp.boss || 0 };
}

/** Эталон на 60с. Волна 1 — только зелёные, дальше растут жёлтые и красные. */
export function getWaveComposition(wave:number):WaveComposition {
    const shares = colorShares(wave);
    const total = 48;
    let red = Math.round(total * shares.red);
    let yellow = Math.round(total * shares.yellow);
    let green = Math.max(0, total - red - yellow);
    if (wave <= 1) {
        green = total;
        yellow = 0;
        red = 0;
    }
    const scaled = scaleComposition({ green, yellow, red }, wave);
    if (isBossWave(wave)) {
        return { ...scaled, boss: 1 };
    }
    return scaled;
}

export function flattenComposition(comp:WaveComposition):EnemyTier[] {
    const list:EnemyTier[] = [];
    for (let i = 0; i < (comp.boss || 0); i++) list.push("boss");
    for (let i = 0; i < comp.green; i++) list.push("green");
    for (let i = 0; i < comp.yellow; i++) list.push("yellow");
    for (let i = 0; i < comp.red; i++) list.push("red");
    // Shuffle adds, но босс всегда первым (сразу на арене)
    const bossCount = comp.boss || 0;
    const rest = list.slice(bossCount);
    for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [...list.slice(0, bossCount), ...rest];
}
