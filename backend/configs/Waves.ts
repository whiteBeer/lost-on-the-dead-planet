import { EnemyTier } from "./Enemies";

export interface WaveComposition {
    green:number;
    yellow:number;
    red:number;
    boss?:number;
}

export const WAVES_CONFIG = {
    pauseBetweenWavesMs: 4500,
    firstWaveDelayMs: 2800,
    /** Длительность 1-й волны; каждая следующая +waveDurationStepMs */
    firstWaveDurationMs: 18_000,
    waveDurationStepMs: 4_000,
    /** Составы ниже посчитаны на это окно; count *= duration / reference */
    referenceDurationMs: 60_000,
    /** +10% монстров за каждую волну после первой */
    countMulPerWave: 0.06,
    /** Каждая N-я волна — босс */
    bossEveryNWaves: 5,
    /** После этой волны матч завершён победой. */
    finalWave: 10,
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
    maxSpeedMul: 2.2,
    /** Опыт до следующего уровня: base + (level-1)*step */
    expBase: 40,
    expStep: 28
};

/** Ускорение только для автоматического полного прогона; production = 1. */
export function waveTimerMs(ms:number):number {
    const raw = Number(process.env.ARENA_TIME_SCALE || "1");
    const scale = Number.isFinite(raw) && raw > 0 ? raw : 1;
    return Math.max(1, Math.round(ms * scale));
}

export function expForLevel(level:number):number {
    return WAVES_CONFIG.expBase + Math.max(0, level - 1) * WAVES_CONFIG.expStep;
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

/** Волна 1 = 20с, каждая следующая +10с */
export function waveDurationMs(wave:number):number {
    return WAVES_CONFIG.firstWaveDurationMs
        + Math.max(0, wave - 1) * WAVES_CONFIG.waveDurationStepMs;
}

export function isBossWave(wave:number):boolean {
    return wave > 0 && wave % WAVES_CONFIG.bossEveryNWaves === 0;
}

/** Составы на referenceDurationMs (60с); реально масштабируются длиной волны */
const PRESET:Record<number, WaveComposition> = {
    1: { green: 48, yellow: 0, red: 0 },
    2: { green: 44, yellow: 12, red: 0 },
    3: { green: 40, yellow: 20, red: 6 },
    4: { green: 36, yellow: 28, red: 10 }
};

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

export function getWaveComposition(wave:number):WaveComposition {
    if (isBossWave(wave)) {
        // Чёрный босс + немного мелочи вокруг
        const adds = scaleComposition({ green: 18, yellow: 6, red: 0 }, wave);
        return { ...adds, boss: 1 };
    }
    if (PRESET[wave]) {
        // Волна 1 (20с): 48 → 16 (−×3 к старому)
        return scaleComposition(PRESET[wave], wave);
    }
    // Базовый count на 60с, потом × duration/60с
    const count = Math.round(48 + 10 * wave);
    const redShare = Math.min(0.28, 0.05 + wave * 0.022);
    const yellowShare = Math.min(0.48, 0.15 + wave * 0.035);

    const red = Math.round(count * redShare);
    const yellow = Math.round(count * yellowShare);
    const green = Math.max(0, count - red - yellow);

    return scaleComposition({ green, yellow, red }, wave);
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
