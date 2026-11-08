import { Snapshot } from "./Types";

const MUTE_KEY = "lpt-zombies-muted";
const HEAR_DISTANCE = 1100;

type Kind = "pistol" | "rifle" | "heavy" | "shotgun" | "sniper" | "bow" | "flame" | "rocket" | "rail" | "acid"
    | "swing" | "hit" | "gore" | "boom" | "pickup" | "loot" | "craft" | "level" | "perk" | "chest" | "gather"
    | "scream" | "roar" | "throw" | "empty" | "heal" | "groan";

const WEAPON_SOUND:Record<string, Kind> = {
    Pistol: "pistol", SMG: "pistol", Rifle: "rifle", Minigun: "heavy", Shotgun: "shotgun", shot: "pistol",
    Sniper: "sniper", Bow: "bow", Crossbow: "bow", Flamethrower: "flame", Rocket: "rocket", Railgun: "rail", acid: "acid"
};

/**
 * Звуки без файлов: всё синтезируется Web Audio. Громкость падает с расстоянием до игрока.
 */
export class Sound {
    private ctx:AudioContext | null = null;
    private master:GainNode | null = null;
    private noise:AudioBuffer | null = null;
    private recent = 0;
    private recentAt = 0;
    private lastBy = new Map<string, number>();
    private seenBullets = new Set<number>();
    private groanIn = 4;
    muted = typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";

    constructor() {
        if (typeof window === "undefined") {
            return;
        }
        // Браузер разрешает звук только после жеста игрока
        const unlock = () => {
            this.init();
            this.ctx?.resume().catch(() => {});
        };
        window.addEventListener("pointerdown", unlock);
        window.addEventListener("keydown", unlock);
        window.addEventListener("touchend", unlock);
    }

    private init() {
        if (this.ctx) {
            return;
        }
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext:typeof AudioContext }).webkitAudioContext;
        if (!Ctx) {
            return;
        }
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
        const length = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }

    toggle() {
        this.muted = !this.muted;
        localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0");
        if (this.master) {
            this.master.gain.value = this.muted ? 0 : 0.5;
        }
    }

    /** Выстрелы новых пуль и события из снимка. */
    fromSnapshot(snapshot:Snapshot, lx:number, ly:number) {
        for (const [id, kind, x, y, , , , , owner] of snapshot.b) {
            if (this.seenBullets.has(id)) {
                continue;
            }
            this.seenBullets.add(id);
            // Дробь и несколько пуль за выстрел — один звук
            const key = `${owner}:${kind}`;
            const now = performance.now();
            if (now - (this.lastBy.get(key) || 0) < 45) {
                continue;
            }
            this.lastBy.set(key, now);
            this.play(WEAPON_SOUND[kind] || "pistol", x, y, lx, ly);
        }
        if (this.seenBullets.size > 2000) {
            this.seenBullets.clear();
        }
        for (const [kind, x, y] of snapshot.fx) {
            const map:Record<string, Kind> = {
                swing: "swing", dmg: "hit", gore: "gore", boom: "boom", pickup: "pickup", loot: "loot", craft: "craft",
                level: "level", perk: "perk", chest: "chest", gather: "gather", crate: "gather", scream: "scream",
                roar: "roar", throw: "throw", heal: "heal"
            };
            if (map[kind]) {
                this.play(map[kind], x, y, lx, ly);
            }
        }
    }

    /** Редкое рычание, когда рядом монстры. */
    ambient(enemiesNear:number, dt:number) {
        this.groanIn -= dt;
        if (this.groanIn <= 0) {
            this.groanIn = 3 + Math.random() * 6;
            if (enemiesNear > 0) {
                this.play("groan", 0, 0, 0, 0, 0.35);
            }
        }
    }

    play(kind:Kind, x:number, y:number, lx:number, ly:number, gain = 1) {
        const ctx = this.ctx;
        if (!ctx || !this.master || this.muted || ctx.state !== "running") {
            return;
        }
        const dist = Math.hypot(x - lx, y - ly);
        if (dist > HEAR_DISTANCE) {
            return;
        }
        // Не больше 14 звуков за 100 мс, иначе бой превращается в кашу
        const now = performance.now();
        if (now - this.recentAt > 100) {
            this.recentAt = now;
            this.recent = 0;
        }
        if (++this.recent > 14) {
            return;
        }
        const volume = gain * Math.pow(1 - dist / HEAR_DISTANCE, 1.6);
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const out = ctx.createGain();
        out.gain.value = volume;
        if (pan) {
            pan.pan.value = Math.max(-1, Math.min(1, (x - lx) / 600));
            out.connect(pan).connect(this.master);
        } else {
            out.connect(this.master);
        }
        const t = ctx.currentTime;
        switch (kind) {
            case "pistol": this.burst(out, t, 0.11, 1800, 0.55); this.thump(out, t, 140, 0.08, 0.5); break;
            case "rifle": this.burst(out, t, 0.09, 2400, 0.5); this.thump(out, t, 120, 0.07, 0.45); break;
            case "heavy": this.burst(out, t, 0.07, 2000, 0.35); break;
            case "shotgun": this.burst(out, t, 0.28, 1100, 0.8); this.thump(out, t, 90, 0.18, 0.8); break;
            case "sniper": this.burst(out, t, 0.35, 1500, 0.8); this.thump(out, t, 70, 0.25, 0.8); break;
            case "bow": this.tone(out, t, "triangle", 420, 160, 0.12, 0.35); break;
            case "flame": this.burst(out, t, 0.16, 600, 0.18); break;
            case "rocket": this.burst(out, t, 0.5, 500, 0.5); this.tone(out, t, "sawtooth", 160, 60, 0.4, 0.15); break;
            case "rail": this.tone(out, t, "sawtooth", 1800, 200, 0.3, 0.3); break;
            case "acid": this.tone(out, t, "sine", 300, 120, 0.15, 0.25); break;
            case "swing": this.burst(out, t, 0.12, 900, 0.25, 3000); break;
            case "hit": this.thump(out, t, 180, 0.05, 0.25); break;
            case "gore": this.burst(out, t, 0.2, 400, 0.4); this.thump(out, t, 80, 0.15, 0.5); break;
            case "boom": this.burst(out, t, 0.9, 300, 1); this.thump(out, t, 50, 0.6, 1); break;
            case "gather": this.thump(out, t, 260, 0.06, 0.5); this.burst(out, t, 0.04, 2500, 0.2); break;
            case "pickup": this.tone(out, t, "square", 520, 780, 0.08, 0.15); break;
            case "loot": this.tone(out, t, "triangle", 660, 990, 0.1, 0.25); break;
            case "craft": this.tone(out, t, "square", 300, 300, 0.05, 0.15); this.tone(out, t + 0.08, "square", 450, 450, 0.06, 0.15); break;
            case "heal": this.tone(out, t, "sine", 500, 800, 0.25, 0.25); break;
            case "level":
            case "perk":
            case "chest":
                [523, 659, 784, 1046].forEach((f, i) => this.tone(out, t + i * 0.08, "triangle", f, f, 0.14, 0.3));
                break;
            case "scream": this.tone(out, t, "sawtooth", 900, 1500, 0.5, 0.2); break;
            case "roar": this.tone(out, t, "sawtooth", 90, 55, 0.8, 0.5); this.burst(out, t, 0.6, 300, 0.4); break;
            case "throw": this.burst(out, t, 0.15, 700, 0.2, 1800); break;
            case "empty": this.tone(out, t, "square", 1400, 1400, 0.025, 0.2); break;
            case "groan": this.tone(out, t, "sawtooth", 110 + Math.random() * 40, 70, 0.9, 0.12); break;
        }
    }

    /** Шумовой хлопок через фильтр нижних частот (или полосовой, если задан sweepTo). */
    private burst(out:AudioNode, t:number, duration:number, cutoff:number, gain:number, sweepTo?:number) {
        const ctx = this.ctx!;
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const filter = ctx.createBiquadFilter();
        filter.type = sweepTo ? "bandpass" : "lowpass";
        filter.frequency.setValueAtTime(cutoff, t);
        if (sweepTo) {
            filter.frequency.exponentialRampToValueAtTime(sweepTo, t + duration);
        }
        const env = ctx.createGain();
        env.gain.setValueAtTime(gain, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(filter).connect(env).connect(out);
        src.start(t, Math.random() * 0.5, duration + 0.05);
    }

    private thump(out:AudioNode, t:number, freq:number, duration:number, gain:number) {
        this.tone(out, t, "sine", freq, freq * 0.4, duration, gain);
    }

    private tone(out:AudioNode, t:number, type:OscillatorType, from:number, to:number, duration:number, gain:number) {
        const ctx = this.ctx!;
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(from, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
        const env = ctx.createGain();
        env.gain.setValueAtTime(gain, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(env).connect(out);
        osc.start(t);
        osc.stop(t + duration + 0.05);
    }
}
