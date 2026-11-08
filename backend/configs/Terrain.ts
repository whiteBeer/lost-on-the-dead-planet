/**
 * Генерация мира: поле опасности, поселения, дороги, природа.
 * Всё детерминировано seed: сервер строит карту один раз и отдаёт клиенту готовые данные.
 */
export type ObstacleKind = "tree" | "rock" | "wreck" | "crate" | "building";
export type ResourceKind = "wood" | "stone" | "scrap";

export interface Obstacle {
    id:number;
    kind:ObstacleKind;
    shape:"c" | "r";   // круг или прямоугольник без поворота
    x:number;          // центр
    y:number;
    r:number;          // радиус круга или половина диагонали прямоугольника
    w:number;          // ширина и высота прямоугольника
    h:number;
    rot:number;        // только для картинки
    style:string;      // вид здания или дерева
    res?:ResourceKind;
    amount:number;     // сколько ещё можно добыть
    maxAmount:number;
    hp:number;         // прочность ящика
    alive:boolean;
    respawnAt:number;
    zone:number;       // опасность в точке, 0..1
    settlement:number; // индекс поселения или -1
}

export type SettlementKind = "village" | "town" | "city";

export interface Settlement {
    kind:SettlementKind;
    name:string;
    x:number;
    y:number;
    w:number;
    h:number;
}

export interface Road {
    x:number;
    y:number;
    w:number;
    h:number;
}

export interface WorldMap {
    size:number;
    gridSize:number;     // клеток по стороне
    cell:number;         // размер клетки в пикселях мира
    zone:Uint8Array;     // опасность 0..255 по клеткам, это процентиль: 0.22 — граница безопасной зоны
    settlements:Settlement[];
    roads:Road[];
    obstacles:Obstacle[];
}

export const ZONES = {
    safe: 0.22,      // ниже — безопасная зона
    wild: 0.55,      // ниже — дикие земли
    danger: 0.82,    // ниже — опасная зона, выше — мёртвые земли
    toxic: 0.955     // выше — ядовитый воздух
};

export const ZONE_NAMES = ["Безопасная зона", "Дикие земли", "Опасная зона", "Мёртвые земли"];

export function zoneLevel(value:number):number {
    return value < ZONES.safe ? 0 : value < ZONES.wild ? 1 : value < ZONES.danger ? 2 : 3;
}

function mulberry32(seed:number) {
    return () => {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/** Плавный шум на решётке: значения в узлах и сглаженная интерполяция между ними. */
function makeNoise(random:() => number, period:number, size:number) {
    const nodes = Math.ceil(size / period) + 2;
    const values = new Float32Array(nodes * nodes).map(() => random());
    const fade = (t:number) => t * t * (3 - 2 * t);
    return (x:number, y:number) => {
        const gx = x / period;
        const gy = y / period;
        const ix = Math.floor(gx);
        const iy = Math.floor(gy);
        const fx = fade(gx - ix);
        const fy = fade(gy - iy);
        const v = (cx:number, cy:number) => values[Math.min(nodes - 1, cy) * nodes + Math.min(nodes - 1, cx)];
        const top = v(ix, iy) * (1 - fx) + v(ix + 1, iy) * fx;
        const bottom = v(ix, iy + 1) * (1 - fx) + v(ix + 1, iy + 1) * fx;
        return top * (1 - fy) + bottom * fy;
    };
}

const VILLAGE_NAMES = ["Сосновка", "Заречье", "Липки", "Горелово", "Ключи", "Берёзовка", "Тишино", "Каменка", "Ольховка", "Глухово", "Красный Яр"];
const TOWN_NAMES = ["Северск", "Ржавинск", "Тихореченск", "Мглинск"];
const CITY_NAMES = ["Мегаполис Новоград"];

function rectsOverlap(a:{ x:number, y:number, w:number, h:number }, b:{ x:number, y:number, w:number, h:number }, gap:number) {
    return Math.abs(a.x - b.x) * 2 < a.w + b.w + gap * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h + gap * 2;
}

export function generateWorld(seed:number, size:number):WorldMap {
    const random = mulberry32(seed);
    const settlements:Settlement[] = [];

    // ---------- Поселения ----------
    const place = (kind:SettlementKind, w:number, h:number, name:string, near?:{ x:number, y:number, min:number, max:number }) => {
        for (let attempt = 0; attempt < 400; attempt++) {
            const margin = 700;
            let x = margin + w / 2 + random() * (size - margin * 2 - w);
            let y = margin + h / 2 + random() * (size - margin * 2 - h);
            if (near) {
                const angle = random() * Math.PI * 2;
                const dist = near.min + random() * (near.max - near.min);
                x = near.x + Math.cos(angle) * dist;
                y = near.y + Math.sin(angle) * dist;
                if (x - w / 2 < margin || y - h / 2 < margin || x + w / 2 > size - margin || y + h / 2 > size - margin) {
                    continue;
                }
            }
            const candidate = { kind, name, x: Math.round(x), y: Math.round(y), w, h };
            const gap = kind === "village" ? 900 : 1500;
            if (settlements.every(el => !rectsOverlap(el, candidate, gap))) {
                settlements.push(candidate);
                return candidate;
            }
        }
        return null;
    };

    const city = place("city", 2600, 2200, CITY_NAMES[0], { x: size / 2, y: size / 2, min: 0, max: size * 0.12 });
    TOWN_NAMES.forEach(name => place("town", 1150, 950, name, city ? { x: city.x, y: city.y, min: 3200, max: 5200 } : undefined));
    VILLAGE_NAMES.forEach(name => place("village", 560, 460, name));

    // ---------- Поле опасности ----------
    const gridSize = 200;
    const cell = size / gridSize;
    const noiseBig = makeNoise(random, 4200, size);
    const noiseMid = makeNoise(random, 1700, size);
    const noiseSmall = makeNoise(random, 650, size);
    const centerX = city ? city.x : size / 2;
    const centerY = city ? city.y : size / 2;
    const maxDist = Math.hypot(size, size) * 0.6;

    const settlementBoost = (x:number, y:number) => {
        let boost = 0;
        for (const s of settlements) {
            const dx = Math.max(0, Math.abs(x - s.x) - s.w / 2);
            const dy = Math.max(0, Math.abs(y - s.y) - s.h / 2);
            const outside = Math.hypot(dx, dy);
            const strength = s.kind === "city" ? 0.5 : s.kind === "town" ? 0.24 : 0.05;
            const reach = s.kind === "city" ? 1400 : s.kind === "town" ? 700 : 300;
            if (outside < reach) {
                // Внутри города опаснее всего к центру
                const inner = s.kind === "city"
                    ? 1 - Math.min(1, Math.hypot((x - s.x) / (s.w / 2), (y - s.y) / (s.h / 2))) * 0.35
                    : 1;
                boost = Math.max(boost, strength * (1 - outside / reach) * inner);
            }
        }
        return boost;
    };

    const raw = new Float32Array(gridSize * gridSize);
    for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
            const x = (gx + 0.5) * cell;
            const y = (gy + 0.5) * cell;
            const noise = noiseBig(x, y) * 0.55 + noiseMid(x, y) * 0.3 + noiseSmall(x, y) * 0.15;
            const toCenter = 1 - Math.min(1, Math.hypot(x - centerX, y - centerY) / maxDist);
            raw[gy * gridSize + gx] = noise * 0.5 + toCenter * 0.45 + settlementBoost(x, y);
        }
    }
    // Переводим в процентили: доли зон на карте всегда одинаковы, при любом seed
    const sorted = Float32Array.from(raw).sort();
    const zone = new Uint8Array(gridSize * gridSize);
    for (let i = 0; i < raw.length; i++) {
        let lo = 0;
        let hi = sorted.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (sorted[mid] < raw[i]) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        zone[i] = Math.round(lo / (sorted.length - 1) * 255);
    }
    const zoneAt = (x:number, y:number) => {
        const gx = Math.max(0, Math.min(gridSize - 1, Math.floor(x / cell)));
        const gy = Math.max(0, Math.min(gridSize - 1, Math.floor(y / cell)));
        return zone[gy * gridSize + gx] / 255;
    };

    // ---------- Улицы и дома ----------
    const roads:Road[] = [];
    const obstacles:Obstacle[] = [];
    let nextId = 1;
    const settlementIndexAt = (x:number, y:number) => settlements.findIndex(s => Math.abs(x - s.x) <= s.w / 2 && Math.abs(y - s.y) <= s.h / 2);

    const addRect = (kind:ObstacleKind, x:number, y:number, w:number, h:number, style:string, extra:Partial<Obstacle> = {}) => {
        obstacles.push({
            id: nextId++, kind, shape: "r", x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h),
            r: Math.hypot(w, h) / 2, rot: 0, style, amount: 0, maxAmount: 0, hp: 0, alive: true, respawnAt: 0,
            zone: zoneAt(x, y), settlement: settlementIndexAt(x, y), ...extra
        });
    };
    const addCircle = (kind:ObstacleKind, x:number, y:number, r:number, style:string, extra:Partial<Obstacle> = {}) => {
        obstacles.push({
            id: nextId++, kind, shape: "c", x: Math.round(x), y: Math.round(y), w: 0, h: 0,
            r: Math.round(r), rot: random() * Math.PI * 2, style, amount: 0, maxAmount: 0, hp: 0, alive: true, respawnAt: 0,
            zone: zoneAt(x, y), settlement: settlementIndexAt(x, y), ...extra
        });
    };
    const crate = (x:number, y:number) => addCircle("crate", x, y, 22, "crate", { hp: 60, maxAmount: 60 });
    const wreck = (x:number, y:number) => addCircle("wreck", x, y, 42, "wreck", { res: "scrap", amount: 5, maxAmount: 5 });

    for (const s of settlements) {
        const left = s.x - s.w / 2;
        const top = s.y - s.h / 2;
        if (s.kind === "village") {
            // Деревня: одна улица и дома по обе стороны
            const horizontal = random() < 0.5;
            const roadW = 56;
            if (horizontal) {
                roads.push({ x: s.x, y: s.y, w: s.w + 500, h: roadW });
            } else {
                roads.push({ x: s.x, y: s.y, w: roadW, h: s.h + 500 });
            }
            const count = 5 + Math.floor(random() * 4);
            for (let i = 0; i < count; i++) {
                const along = (i + 0.5) / count - 0.5;
                const side = i % 2 === 0 ? -1 : 1;
                const w = 80 + random() * 40;
                const h = 70 + random() * 40;
                const offset = roadW / 2 + 40 + (horizontal ? h : w) / 2 + random() * 30;
                const x = horizontal ? s.x + along * s.w : s.x + side * offset;
                const y = horizontal ? s.y + side * offset : s.y + along * s.h;
                addRect("building", x, y, w, h, "house");
            }
            for (let i = 0; i < 3; i++) {
                crate(s.x + (random() - 0.5) * s.w * 0.8, s.y + (random() - 0.5) * s.h * 0.8);
            }
            continue;
        }

        // Город и мегаполис: сетка улиц
        const blockSize = s.kind === "city" ? 330 : 300;
        const roadW = s.kind === "city" ? 80 : 64;
        const cols = Math.floor(s.w / blockSize);
        const rows = Math.floor(s.h / blockSize);
        for (let c = 0; c <= cols; c++) {
            roads.push({ x: left + c * blockSize, y: s.y, w: roadW, h: rows * blockSize + roadW });
        }
        for (let r = 0; r <= rows; r++) {
            roads.push({ x: s.x - s.w / 2 + cols * blockSize / 2, y: top + r * blockSize, w: cols * blockSize + roadW, h: roadW });
        }
        // Выезды из города
        roads.push({ x: left - 600, y: s.y, w: 1200, h: roadW });
        roads.push({ x: left + cols * blockSize + 600, y: s.y, w: 1200, h: roadW });

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const bx = left + c * blockSize + roadW / 2;
                const by = top + r * blockSize + roadW / 2;
                const inner = blockSize - roadW;
                const roll = random();
                if (roll < 0.1) {
                    // Пустырь: немного деревьев и ящики
                    addCircle("tree", bx + inner / 2, by + inner / 2, 34, "tree", { res: "wood", amount: 4, maxAmount: 4 });
                    crate(bx + inner * 0.2, by + inner * 0.8);
                    continue;
                }
                const pad = 26;
                if (s.kind === "city" && roll < 0.55) {
                    // Высотка на весь квартал
                    addRect("building", bx + inner / 2, by + inner / 2, inner - pad * 2, inner - pad * 2, "tower");
                } else {
                    // Квартал из двух-четырёх домов с проходами между ними
                    const split = random() < 0.5;
                    const half = (inner - pad * 3) / 2;
                    const style = s.kind === "city" ? "office" : "shop";
                    if (split) {
                        addRect("building", bx + pad + half / 2, by + inner / 2, half, inner - pad * 2, style);
                        addRect("building", bx + pad * 2 + half * 1.5, by + inner / 2, half, inner - pad * 2, style);
                    } else {
                        for (let i = 0; i < 4; i++) {
                            const ox = i % 2;
                            const oy = Math.floor(i / 2);
                            addRect("building", bx + pad + half / 2 + ox * (half + pad), by + pad + half / 2 + oy * (half + pad), half, half, style);
                        }
                    }
                }
                if (random() < (s.kind === "city" ? 0.45 : 0.35)) {
                    crate(bx + 6, by + inner - 6);
                }
                if (random() < 0.25) {
                    wreck(bx - roadW / 2 + 4, by + random() * inner);
                }
            }
        }
    }

    // ---------- Природа ----------
    const insideSettlement = (x:number, y:number, gap:number) =>
        settlements.some(s => Math.abs(x - s.x) * 2 < s.w + gap * 2 && Math.abs(y - s.y) * 2 < s.h + gap * 2);
    const onRoad = (x:number, y:number, gap:number) =>
        roads.some(r => Math.abs(x - r.x) * 2 < r.w + gap * 2 && Math.abs(y - r.y) * 2 < r.h + gap * 2);

    // Сетка для быстрой проверки, что объекты не налезают друг на друга
    const grid = new Map<number, Obstacle[]>();
    const gridCell = 200;
    const gkey = (x:number, y:number) => Math.floor(x / gridCell) * 100000 + Math.floor(y / gridCell);
    obstacles.forEach(el => {
        const key = gkey(el.x, el.y);
        grid.set(key, [...(grid.get(key) || []), el]);
    });
    const free = (x:number, y:number, r:number, gap:number) => {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (const el of grid.get(gkey(x + dx * gridCell, y + dy * gridCell)) || []) {
                    if (Math.hypot(el.x - x, el.y - y) < el.r + r + gap) {
                        return false;
                    }
                }
            }
        }
        return true;
    };
    const scatter = (kind:ObstacleKind, count:number, rMin:number, rMax:number, chance:(zoneValue:number) => number, extra:(r:number) => Partial<Obstacle>) => {
        let placed = 0;
        for (let attempt = 0; attempt < count * 12 && placed < count; attempt++) {
            const r = rMin + random() * (rMax - rMin);
            const x = 120 + random() * (size - 240);
            const y = 120 + random() * (size - 240);
            if (insideSettlement(x, y, 80) || onRoad(x, y, r + 20) || random() > chance(zoneAt(x, y)) || !free(x, y, r, 70)) {
                continue;
            }
            addCircle(kind, x, y, r, kind, extra(r));
            const el = obstacles[obstacles.length - 1];
            const key = gkey(el.x, el.y);
            grid.set(key, [...(grid.get(key) || []), el]);
            placed++;
        }
    };

    const area = (size / 9000) ** 2;
    // В мёртвых землях деревьев меньше, камней больше
    // Ресурсов в одном дереве и камне мало: базовые материалы добываются долго
    scatter("tree", Math.round(900 * area), 26, 44, z => 1 - z * 0.75, r => ({ res: "wood", amount: Math.round(r / 9), maxAmount: Math.round(r / 9) }));
    scatter("rock", Math.round(420 * area), 24, 52, z => 0.5 + z * 0.5, r => ({ res: "stone", amount: Math.round(r / 12), maxAmount: Math.round(r / 12) }));
    scatter("wreck", Math.round(110 * area), 40, 48, () => 1, () => ({ res: "scrap", amount: 5, maxAmount: 5 }));
    scatter("crate", Math.round(170 * area), 20, 24, z => 0.3 + z * 0.7, () => ({ hp: 60, maxAmount: 60 }));

    obstacles.forEach((el, index) => {
        el.id = index + 1;
    });
    return { size, gridSize, cell, zone, settlements, roads, obstacles };
}
