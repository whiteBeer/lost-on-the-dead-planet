import { WORLD } from "./World";

export interface Obstacle {
    kind:string;   // tree | rock | wreck | crate
    x:number;
    y:number;
    r:number;      // Радиус столкновений
    rot:number;
}

// Детерминированный генератор: одинаковый seed даёт одну и ту же карту
function mulberry32(seed:number) {
    return () => {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const KINDS:{ kind:string, r:[number, number], count:number }[] = [
    { kind: "tree", r: [26, 44], count: 150 },
    { kind: "rock", r: [24, 52], count: 80 },
    { kind: "wreck", r: [40, 48], count: 26 },
    { kind: "crate", r: [20, 26], count: 44 }
];

export function generateObstacles(seed:number):Obstacle[] {
    const random = mulberry32(seed);
    const items:Obstacle[] = [];
    const margin = 70;
    for (const { kind, r, count } of KINDS) {
        let placed = 0;
        for (let attempt = 0; attempt < count * 20 && placed < count; attempt++) {
            const radius = r[0] + random() * (r[1] - r[0]);
            const x = margin + random() * (WORLD.size - margin * 2);
            const y = margin + random() * (WORLD.size - margin * 2);
            const gap = 70; // Чтобы между препятствиями всегда можно было пройти
            const tooClose = items.some(el => Math.hypot(el.x - x, el.y - y) < el.r + radius + gap);
            if (!tooClose) {
                items.push({ kind, x: Math.round(x), y: Math.round(y), r: Math.round(radius), rot: random() * Math.PI * 2 });
                placed++;
            }
        }
    }
    return items;
}
