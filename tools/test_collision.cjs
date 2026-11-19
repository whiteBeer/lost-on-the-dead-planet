const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('../frontend/node_modules/typescript');
const source = path.resolve(__dirname, '../frontend/src/game/WorldMap.ts');
const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = new Module(source);
mod.require = () => ({}); // Collision methods need neither renderer nor asset loading.
mod._compile(compiled, source);
const { WorldMap } = mod.exports;

function map(obstacles) {
    const world = Object.create(WorldMap.prototype);
    world.config = { size: 1000 };
    world.collision = new Map();
    obstacles.forEach(el => {
        const extent = el.shape === 'r' ? Math.max(el.w, el.h) / 2 : el.r;
        for (let cx = Math.floor((el.x - extent) / 200); cx <= Math.floor((el.x + extent) / 200); cx++) {
            for (let cy = Math.floor((el.y - extent) / 200); cy <= Math.floor((el.y + extent) / 200); cy++) {
                const key = cx * 100000 + cy;
                world.collision.set(key, [...(world.collision.get(key) || []), el]);
            }
        }
    });
    return world;
}
const wall = { alive: true, shape: 'r', kind: 'wall', x: 100, y: 100, w: 8, h: 160 };
const tree = { alive: true, shape: 'c', kind: 'tree', x: 200, y: 200, r: 20 };
const checkFree = (world, point) => assert(!world.isBlocked(point.x, point.y, 13), JSON.stringify(point));
const wallMap = map([wall]);
const dash = wallMap.move(60, 100, 160, 100, 13);
assert(dash.x <= 83.001, 'a low-FPS dash must not tunnel through an 8px wall');
checkFree(wallMap, dash);
const slide = wallMap.move(60, 100, 160, 150, 13);
assert(slide.x <= 83.001 && slide.y > 140, 'diagonal movement must slide along a wall');
const treeMap = map([tree]);
const centre = treeMap.resolve(200, 200, 13);
assert(Math.hypot(centre.x - 200, centre.y - 200) >= 32.999, 'exact circle centre must be pushed out');
checkFree(treeMap, treeMap.move(200, 200, 200, 200, 13));
const overlaps = map([tree, { ...tree, x: 225 }]);
checkFree(overlaps, overlaps.resolve(212, 200, 13));
const border = map([{ ...tree, x: 13 }]);
const escaped = border.resolve(13, 200, 13);
assert(escaped.x >= 13 && escaped.y >= 13);
checkFree(border, escaped);
const removed = map([{ ...wall, alive: false }]);
assert.equal(removed.move(60, 100, 160, 100, 13).x, 160);
for (let y = 30; y <= 170; y += 10) {
    const point = wallMap.move(60, y, 160, y, 13);
    assert(point.x <= 83.001, `wall tunnel at y=${y}`);
    checkFree(wallMap, point);
}
console.log(JSON.stringify({ ok: true, thinWall: true, slide: true, circleCentre: true, idleRecovery: true, overlapRecovery: true, mapBoundary: true, destroyedObstacle: true }));
