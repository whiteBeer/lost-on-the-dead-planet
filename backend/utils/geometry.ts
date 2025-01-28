export function rotate (x:number, y:number, angleRad:number) {
    const cos = Math.cos(angleRad),
        sin = Math.sin(angleRad),
        nx = (cos * x) + (sin * y),
        ny = (cos * y) - (sin * x);
    return {
        x: nx,
        y: ny
    };
}

export function calcTimedPoint (startX:number, startY:number, rotation:number, speedInSecond:number, createdAt:string) {
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