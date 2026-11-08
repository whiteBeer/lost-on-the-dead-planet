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

/**
 * Дальность вдоль отрезка a-b (0..1) до входа в прямоугольник без поворота (центр cx, cy).
 * Если отрезок начинается внутри — попадание сразу.
 */
export function segmentRectHit(a:Coords, b:Coords, cx:number, cy:number, w:number, h:number):number | null {
    const minX = cx - w / 2;
    const maxX = cx + w / 2;
    const minY = cy - h / 2;
    const maxY = cy + h / 2;
    let t0 = 0;
    let t1 = 1;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const checks:[number, number][] = [[-dx, a.x - minX], [dx, maxX - a.x], [-dy, a.y - minY], [dy, maxY - a.y]];
    for (const [p, q] of checks) {
        if (p === 0) {
            if (q < 0) {
                return null;
            }
        } else {
            const r = q / p;
            if (p < 0) {
                if (r > t1) return null;
                if (r > t0) t0 = r;
            } else {
                if (r < t0) return null;
                if (r < t1) t1 = r;
            }
        }
    }
    return t0;
}

/**
 * Выталкивает круг из прямоугольника. Возвращает новый центр или null, если пересечения нет.
 */
export function pushCircleOutOfRect(x:number, y:number, radius:number, cx:number, cy:number, w:number, h:number):Coords | null {
    const nearestX = clamp(x, cx - w / 2, cx + w / 2);
    const nearestY = clamp(y, cy - h / 2, cy + h / 2);
    const dx = x - nearestX;
    const dy = y - nearestY;
    const dist = Math.hypot(dx, dy);
    if (dist >= radius) {
        return null;
    }
    if (dist > 0.001) {
        return { x: nearestX + dx / dist * radius, y: nearestY + dy / dist * radius };
    }
    // Центр внутри прямоугольника: выталкиваем к ближайшей стороне
    const left = x - (cx - w / 2);
    const right = (cx + w / 2) - x;
    const top = y - (cy - h / 2);
    const bottom = (cy + h / 2) - y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: cx - w / 2 - radius, y };
    if (min === right) return { x: cx + w / 2 + radius, y };
    if (min === top) return { x, y: cy - h / 2 - radius };
    return { x, y: cy + h / 2 + radius };
}

/**
 * Сетка для крупных объектов: объект заносится во все клетки, которые накрывает.
 */
export class AreaGrid<T extends { x:number, y:number, r:number }> {
    private cells = new Map<number, T[]>();
    private stamp = new Map<T, number>();
    private queryId = 0;

    constructor(private readonly cellSize:number) {}

    private key(cx:number, cy:number) {
        return cx * 100000 + cy;
    }

    clear() {
        this.cells.clear();
        this.stamp.clear();
    }

    insert(item:T) {
        const minX = Math.floor((item.x - item.r) / this.cellSize);
        const maxX = Math.floor((item.x + item.r) / this.cellSize);
        const minY = Math.floor((item.y - item.r) / this.cellSize);
        const maxY = Math.floor((item.y + item.r) / this.cellSize);
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const key = this.key(cx, cy);
                const cell = this.cells.get(key);
                if (cell) {
                    cell.push(item);
                } else {
                    this.cells.set(key, [item]);
                }
            }
        }
    }

    query(x:number, y:number, radius:number, visit:(item:T) => void) {
        const id = ++this.queryId;
        const minX = Math.floor((x - radius) / this.cellSize);
        const maxX = Math.floor((x + radius) / this.cellSize);
        const minY = Math.floor((y - radius) / this.cellSize);
        const maxY = Math.floor((y + radius) / this.cellSize);
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const cell = this.cells.get(this.key(cx, cy));
                if (!cell) {
                    continue;
                }
                for (const item of cell) {
                    if (this.stamp.get(item) !== id) {
                        this.stamp.set(item, id);
                        visit(item);
                    }
                }
            }
        }
    }
}
