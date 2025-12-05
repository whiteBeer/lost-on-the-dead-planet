import { Coords, Rectangle } from "../types";

/**
 * Вращение отночительно центра мировых координат
 */
export function rotate(x:number, y:number, angleRad:number) {
    const cos = Math.cos(angleRad),
        sin = Math.sin(angleRad),
        nx = (cos * x) + (sin * y),
        ny = (cos * y) - (sin * x);
    return {
        x: nx,
        y: ny
    };
}

/**
 * Вычисление положения точки в текущий момент времени
 */
export function calcTimedPoint(
    startX:number, startY:number, rotation:number, speedInSecond:number, createdAt:string
):Coords {
    const dirCosMissile = Math.cos(rotation);
    const dirSinMissile = Math.sin(rotation);
    const dTimeSecondsMissile = (
        new Date().getTime() - new Date(createdAt).getTime()
    ) / 1000;
    const newX = startX + -dirCosMissile * (speedInSecond * dTimeSecondsMissile);
    const newY = startY + -dirSinMissile * (speedInSecond * dTimeSecondsMissile);

    return {
        x: newX,
        y: newY
    };
}

/**
 * Проверка пересечения двух линий a-b vs c-d
 */
export function linesIntersect(
    a:Coords,
    b:Coords,
    c:Coords,
    d:Coords
):boolean {
    // Векторные вычисления для определения пересечения
    const denominator = ((b.y - a.y) * (d.x - c.x) - (b.x - a.x) * (d.y - c.y));
    if (Math.abs(denominator) < 0.0001) return false; // параллельны

    const ua = ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / denominator;
    const ub = ((d.x - c.x) * (c.y - a.y) - (d.y - c.y) * (c.x - a.x)) / denominator;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Проверка столкновения отрезка с прямоугольником
 */
export function checkLineRectangleCollision(
    lineStart:Coords,
    lineEnd:Coords,
    rectanglePos:Coords,
    rectangle:Rectangle
):boolean {
    // Получаем вершины врага в мировых координатах
    const enemyVertices = getRectangleVertices(rectanglePos.x, rectanglePos.y, rectangle);

    // Проверяем пересечение линии пули с каждой стороной врага
    for (let i = 0; i < enemyVertices.length; i++) {
        const sideStart = enemyVertices[i];
        const sideEnd = enemyVertices[(i + 1) % enemyVertices.length];

        if (linesIntersect(lineStart, lineEnd, sideStart, sideEnd)) {
            return true;
        }
    }

    return false;
}

/**
 * Получить все 4 вершины прямоугольника в мировых координатах
 */
export function getRectangleVertices(
    centerX:number,
    centerY:number,
    rectangle:Rectangle
) {
    const halfWidth = rectangle.width / 2;
    const halfLength = rectangle.length / 2;

    // Вершины до вращения (относительно центра)
    const localVertices = [
        { x: -halfWidth, y: -halfLength },
        { x: halfWidth, y: -halfLength },
        { x: halfWidth, y: halfLength },
        { x: -halfWidth, y: halfLength }
    ];

    return localVertices.map(vertex => {
        const rotated = rotate(vertex.x, vertex.y, rectangle.rotation);
        return {
            x: centerX + rotated.x,
            y: centerY + rotated.y
        };
    });
}