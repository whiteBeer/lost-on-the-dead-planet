export interface Coords {
    x:number;
    y:number;
}

/**
 * Дальность вдоль отрезка a-b (0..1) до входа в круг или null, если отрезок круг не задевает.
 * Если начало отрезка уже внутри круга — попадание сразу. Благодаря этому работает стрельба в упор.
 */
export function segmentCircleHit(a:Coords, b:Coords, c:Coords, radius:number):number | null {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const fx = a.x - c.x;
    const fy = a.y - c.y;
    const rr = radius * radius;
    if (fx * fx + fy * fy <= rr) {
        return 0;
    }
    const qa = dx * dx + dy * dy;
    if (qa === 0) {
        return null;
    }
    const qb = 2 * (fx * dx + fy * dy);
    const qc = fx * fx + fy * fy - rr;
    const d = qb * qb - 4 * qa * qc;
    if (d < 0) {
        return null;
    }
    const t = (-qb - Math.sqrt(d)) / (2 * qa);
    return t >= 0 && t <= 1 ? t : null;
}

export function distSq(ax:number, ay:number, bx:number, by:number):number {
    return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
}

export function clamp(value:number, min:number, max:number):number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Простая сетка для быстрого поиска соседей.
 */
export class SpatialGrid<T extends Coords> {
    private cells = new Map<number, T[]>();

    constructor(private readonly cellSize:number) {}

    private key(cx:number, cy:number) {
        return cx * 100000 + cy;
    }

    clear() {
        this.cells.clear();
    }

    insert(item:T) {
        const key = this.key(Math.floor(item.x / this.cellSize), Math.floor(item.y / this.cellSize));
        const cell = this.cells.get(key);
        if (cell) {
            cell.push(item);
        } else {
            this.cells.set(key, [item]);
        }
    }

    query(x:number, y:number, radius:number, visit:(item:T) => void) {
        const minX = Math.floor((x - radius) / this.cellSize);
        const maxX = Math.floor((x + radius) / this.cellSize);
        const minY = Math.floor((y - radius) / this.cellSize);
        const maxY = Math.floor((y + radius) / this.cellSize);
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const cell = this.cells.get(this.key(cx, cy));
                if (cell) {
                    cell.forEach(visit);
                }
            }
        }
    }
}
