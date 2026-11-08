import * as PIXI from "pixi.js";
import { Assets } from "./Assets";
import { WorldConfig } from "./Types";

export interface MapObstacle {
    id:number;
    kind:string;
    shape:"c" | "r";
    x:number;
    y:number;
    r:number;
    w:number;
    h:number;
    alive:boolean;
    sprite:PIXI.Container;
    goods?:PIXI.Container;   // у полки: то, что на ней лежит
}

interface Roof {
    x:number;
    y:number;
    w:number;
    h:number;
    sprite:PIXI.Container;
}

// Пол и полки не сталкиваются: по ним ходят
const PASSABLE = new Set(["interior", "shelf"]);
export const TRADER_REACH = 120;

const CHUNK = 1000;
const COLLISION_CELL = 200;

function smoothstep(edge0:number, edge1:number, x:number) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

/**
 * Карта на клиенте: земля по зонам, дороги, препятствия по чанкам и столкновения.
 */
export class WorldMap {
    readonly obstacles = new Map<number, MapObstacle>();
    readonly shelves:MapObstacle[] = [];
    readonly traders:{ x:number, y:number }[] = [];
    private roofs:Roof[] = [];
    private collision = new Map<number, MapObstacle[]>();
    private chunks = new Map<number, PIXI.Container[]>();
    private zone:Uint8Array;
    readonly minimap:HTMLCanvasElement;

    constructor(
        private readonly config:WorldConfig,
        groundLayer:PIXI.Container,
        itemsLayer:PIXI.Container,
        topLayer:PIXI.Container
    ) {
        const binary = atob(config.map.zone);
        this.zone = Uint8Array.from(binary, ch => ch.charCodeAt(0));
        this.buildGround(groundLayer);
        this.buildObstacles(itemsLayer, topLayer);
        this.minimap = this.buildMinimap();
    }

    zoneAt(x:number, y:number) {
        const { gridSize, cell } = this.config.map;
        const gx = Math.max(0, Math.min(gridSize - 1, Math.floor(x / cell)));
        const gy = Math.max(0, Math.min(gridSize - 1, Math.floor(y / cell)));
        return this.zone[gy * gridSize + gx] / 255;
    }

    /** Маска перехода: опасность растягивается из сетки 200×200 с лёгким шумом, чтобы края были неровными. */
    private zoneMask(alphaOf:(value:number) => number, color = "255,255,255", resolution = 400) {
        const { gridSize } = this.config.map;
        const canvas = document.createElement("canvas");
        canvas.width = resolution;
        canvas.height = resolution;
        const ctx = canvas.getContext("2d")!;
        const image = ctx.createImageData(resolution, resolution);
        const [r, g, b] = color.split(",").map(Number);
        const sample = (fx:number, fy:number) => {
            // Билинейная выборка из сетки опасности
            const gx = Math.max(0, Math.min(gridSize - 1.001, fx));
            const gy = Math.max(0, Math.min(gridSize - 1.001, fy));
            const x0 = Math.floor(gx);
            const y0 = Math.floor(gy);
            const tx = gx - x0;
            const ty = gy - y0;
            const at = (x:number, y:number) => this.zone[y * gridSize + x] / 255;
            return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty)
                + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
        };
        let seed = 12345;
        const noise = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff - 0.5;
        };
        for (let py = 0; py < resolution; py++) {
            for (let px = 0; px < resolution; px++) {
                const value = sample(px / resolution * gridSize - 0.5, py / resolution * gridSize - 0.5) + noise() * 0.035;
                const index = (py * resolution + px) * 4;
                image.data[index] = r;
                image.data[index + 1] = g;
                image.data[index + 2] = b;
                image.data[index + 3] = Math.round(alphaOf(value) * 255);
            }
        }
        ctx.putImageData(image, 0, 0);
        const sprite = new PIXI.Sprite(PIXI.Texture.from(canvas));
        sprite.width = this.config.size;
        sprite.height = this.config.size;
        return sprite;
    }

    private buildGround(layer:PIXI.Container) {
        const size = this.config.size;
        const zones = this.config.map.zones;
        const tiled = (name:string) => new PIXI.TilingSprite({ texture: Assets.tex(name), width: size, height: size });

        layer.addChild(tiled("ground"));

        // Дикие земли: сухая земля проступает постепенно
        const dry = tiled("ground_dry");
        const dryMask = this.zoneMask(v => smoothstep(zones.safe - 0.07, zones.safe + 0.09, v));
        dry.mask = dryMask;
        layer.addChild(dry, dryMask);

        const dead = tiled("ground_dead");
        const deadMask = this.zoneMask(v => smoothstep(zones.wild + 0.08, zones.danger + 0.03, v));
        dead.mask = deadMask;
        layer.addChild(dead, deadMask);

        // Дороги
        const asphalt = tiled("asphalt");
        const roads = new PIXI.Graphics();
        for (const road of this.config.map.roads) {
            roads.rect(road.x - road.w / 2, road.y - road.h / 2, road.w, road.h);
        }
        roads.fill(0xffffff);
        asphalt.mask = roads;
        layer.addChild(asphalt, roads);

        // Ядовитый воздух: зелёная дымка поверх земли
        layer.addChild(this.zoneMask(v => smoothstep(zones.toxic - 0.015, zones.toxic + 0.02, v) * 0.2, "150,220,40"));

        // Лагеря выживших: утоптанная земля и костёр
        const camps = new PIXI.Graphics();
        for (const c of this.config.map.camps || []) {
            camps.rect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size).fill({ color: 0x6d5a3c, alpha: 0.55 });
            camps.circle(c.x, c.y + 40, 22).fill(0x3a2a1c);
            camps.circle(c.x, c.y + 40, 13).fill(0xff8a2e);
            camps.circle(c.x, c.y + 40, 6).fill(0xffe08a);
            for (const [dx, dy] of [[-120, -110], [110, -100], [-120, 110], [115, 115]]) {
                camps.poly([c.x + dx - 34, c.y + dy + 26, c.x + dx, c.y + dy - 30, c.x + dx + 34, c.y + dy + 26]).fill(0x5f6b3a).stroke({ width: 3, color: 0x2a3018 });
            }
        }
        layer.addChild(camps);

        const border = new PIXI.Graphics();
        border.rect(0, 0, size, size).stroke({ width: 14, color: 0x000000, alpha: 0.7 });
        layer.addChild(border);
    }

    private chunkFor(x:number, y:number, layer:number, parents:PIXI.Container[]) {
        const key = Math.floor(x / CHUNK) * 1000 + Math.floor(y / CHUNK);
        let list = this.chunks.get(key);
        if (!list) {
            list = parents.map((parent) => {
                const container = new PIXI.Container();
                parent.addChild(container);
                return container;
            });
            this.chunks.set(key, list);
        }
        return list[layer];
    }

    private buildObstacles(itemsLayer:PIXI.Container, topLayer:PIXI.Container) {
        const parents = [itemsLayer, topLayer];
        for (const [id, kind, shape, x, y, r, w, h, rotation, style, alive] of this.config.obstacles) {
            let sprite:PIXI.Container;
            let goods:PIXI.Container | undefined;
            let layer = kind === "tree" ? 1 : 0;
            if (kind === "interior") {
                // Деревянный пол, сверху крыша, которая исчезает, когда заходишь внутрь
                const floor = new PIXI.Graphics();
                floor.rect(x - w / 2, y - h / 2, w, h).fill(0x5b4530);
                for (let py = y - h / 2 + 12; py < y + h / 2; py += 12) {
                    floor.moveTo(x - w / 2, py).lineTo(x + w / 2, py);
                }
                floor.stroke({ width: 1, color: 0x3f2f20, alpha: 0.7 });
                this.chunkFor(x, y, 0, parents).addChild(floor);
                const roof = this.roofSprite(style, x, y, w, h);
                this.chunkFor(x, y, 1, parents).addChild(roof);
                this.roofs.push({ x, y, w, h, sprite: roof });
                sprite = floor;
            } else if (kind === "wall" && style === "fence") {
                // Частокол лагеря: брёвна поперёк
                const fence = new PIXI.Graphics();
                fence.rect(x - w / 2, y - h / 2, w, h).fill(0x7a5634).stroke({ width: 2, color: 0x2a1a0e });
                const long = Math.max(w, h);
                for (let t = 10; t < long; t += 12) {
                    if (w > h) {
                        fence.moveTo(x - w / 2 + t, y - h / 2).lineTo(x - w / 2 + t, y + h / 2);
                    } else {
                        fence.moveTo(x - w / 2, y - h / 2 + t).lineTo(x + w / 2, y - h / 2 + t);
                    }
                }
                fence.stroke({ width: 1.5, color: 0x3a2412 });
                sprite = fence;
            } else if (kind === "wall") {
                const wall = new PIXI.Graphics();
                wall.rect(x - w / 2, y - h / 2, w, h).fill(0x3a322b).stroke({ width: 2, color: 0x16120f });
                sprite = wall;
            } else if (kind === "trader") {
                const trader = new PIXI.Container();
                const body = new PIXI.Sprite(Assets.playerFrames[0]);
                body.anchor.set(0.5);
                body.scale.set(r * 2.6 / Math.max(body.texture.width, body.texture.height));
                body.tint = 0xb8f08a;
                body.position.set(x, y);
                body.rotation = Math.PI / 2;
                const label = new PIXI.Text({
                    text: "Торговец",
                    style: { fontFamily: "Rubik, Arial", fontSize: 14, fontWeight: "800", fill: 0xb8f08a, stroke: { color: 0x000000, width: 4 } },
                    resolution: 2
                });
                label.anchor.set(0.5, 1);
                label.position.set(x, y - r - 6);
                trader.addChild(body, label);
                this.traders.push({ x, y });
                sprite = trader;
            } else if (kind === "shelf") {
                const shelf = new PIXI.Container();
                const frame = new PIXI.Graphics();
                frame.rect(x - w / 2, y - h / 2, w, h).fill(0x7a5332).stroke({ width: 2, color: 0x2a1a0e });
                goods = new PIXI.Graphics();
                const colors = [0xd9c27a, 0x5fa8d8, 0xc0503c, 0x8fbf5a];
                const along = w > h;
                for (let i = 0; i < 4; i++) {
                    const t = (i + 0.5) / 4 - 0.5;
                    const gx = along ? x + t * (w - 8) : x;
                    const gy = along ? y : y + t * (h - 8);
                    (goods as PIXI.Graphics).rect(gx - 3.5, gy - 3.5, 7, 7).fill(colors[i]);
                }
                shelf.addChild(frame, goods);
                sprite = shelf;
            } else if (shape === "r") {
                const texture = Assets.tex(`roof_${style}`);
                const texSize = Math.min(texture.width, texture.height);
                const border = Math.round(texSize * 0.22);
                // Рамка крыши масштабируется вместе с домом: короткая сторона дома = короткая сторона картинки
                const scale = Math.min(w, h) / texSize;
                const roof = new PIXI.NineSliceSprite({
                    texture, leftWidth: border, rightWidth: border, topHeight: border, bottomHeight: border,
                    width: w / scale, height: h / scale
                });
                roof.scale.set(scale);
                roof.position.set(x - w / 2, y - h / 2);
                sprite = roof;
            } else if (style === "tree_dead") {
                // Мёртвое дерево: голый ствол и сухие ветки
                const dead = new PIXI.Graphics();
                for (let i = 0; i < 6; i++) {
                    const a = rotation + i / 6 * Math.PI * 2;
                    const len = r * (1.1 + (i % 3) * 0.25);
                    const mx = x + Math.cos(a) * len * 0.55;
                    const my = y + Math.sin(a) * len * 0.55;
                    dead.moveTo(x, y).lineTo(mx, my).lineTo(x + Math.cos(a + 0.35) * len, y + Math.sin(a + 0.35) * len);
                    dead.moveTo(mx, my).lineTo(x + Math.cos(a - 0.4) * len * 0.85, y + Math.sin(a - 0.4) * len * 0.85);
                }
                dead.stroke({ width: 5, color: 0x2a2018, cap: "round" });
                dead.circle(x, y, r * 0.42).fill(0x4a3a2c).stroke({ width: 3, color: 0x1e1610 });
                sprite = dead;
            } else if (style === "crystal") {
                const crystal = new PIXI.Graphics();
                for (const [dx, dy, s] of [[0, 0, 1], [-0.6, 0.3, 0.7], [0.55, 0.35, 0.65]]) {
                    const cx = x + dx * r;
                    const cy = y + dy * r;
                    const h = r * 1.3 * s;
                    crystal.poly([cx, cy - h, cx + h * 0.38, cy - h * 0.2, cx + h * 0.25, cy + h * 0.45, cx - h * 0.25, cy + h * 0.45, cx - h * 0.38, cy - h * 0.2])
                        .fill(0xb35cff).stroke({ width: 3, color: 0x2a0f45 });
                    crystal.poly([cx, cy - h, cx + h * 0.12, cy - h * 0.2, cx, cy + h * 0.4, cx - h * 0.2, cy - h * 0.2]).fill({ color: 0xe8c8ff, alpha: 0.7 });
                }
                sprite = crystal;
            } else {
                const image = new PIXI.Sprite(Assets.tex(`obstacle_${kind}`));
                image.anchor.set(0.5);
                // Крона дерева шире ствола: за ней можно спрятаться
                const visual = r * (kind === "tree" ? (style === "tree_dry" ? 2.6 : 3.1) : 2.3);
                image.scale.set(visual / Math.max(image.texture.width, image.texture.height));
                image.position.set(x, y);
                image.rotation = rotation;
                // Сухое дерево — бурая крона, руда — рыжий камень
                if (style === "tree_dry") {
                    image.tint = 0xc2a86a;
                } else if (style === "ore") {
                    image.tint = 0xd98a52;
                }
                sprite = image;
            }
            if (goods) {
                goods.visible = alive === 1;
            } else {
                sprite.visible = alive === 1;
            }
            if (kind !== "interior") {
                this.chunkFor(x, y, layer, parents).addChild(sprite);
            }

            const entry:MapObstacle = { id, kind, shape, x, y, r, w, h, alive: alive === 1, sprite, goods };
            this.obstacles.set(id, entry);
            if (kind === "shelf") {
                this.shelves.push(entry);
            }
            if (PASSABLE.has(kind)) {
                continue;
            }
            const extent = shape === "r" ? Math.max(w, h) / 2 : r;
            for (let cx = Math.floor((x - extent) / COLLISION_CELL); cx <= Math.floor((x + extent) / COLLISION_CELL); cx++) {
                for (let cy = Math.floor((y - extent) / COLLISION_CELL); cy <= Math.floor((y + extent) / COLLISION_CELL); cy++) {
                    const key = cx * 100000 + cy;
                    const cell = this.collision.get(key);
                    if (cell) {
                        cell.push(entry);
                    } else {
                        this.collision.set(key, [entry]);
                    }
                }
            }
        }
    }

    setAlive(id:number, alive:boolean) {
        const entry = this.obstacles.get(id);
        if (entry) {
            entry.alive = alive;
            (entry.goods || entry.sprite).visible = alive;
        }
    }

    private roofSprite(style:string, x:number, y:number, w:number, h:number) {
        const texture = Assets.tex(`roof_${style}`);
        const texSize = Math.min(texture.width, texture.height);
        const border = Math.round(texSize * 0.22);
        const scale = Math.min(w, h) / texSize;
        const roof = new PIXI.NineSliceSprite({
            texture, leftWidth: border, rightWidth: border, topHeight: border, bottomHeight: border,
            width: w / scale, height: h / scale
        });
        roof.scale.set(scale);
        roof.position.set(x - w / 2, y - h / 2);
        return roof;
    }

    /** Крыша дома, в котором стоит игрок, плавно становится прозрачной. */
    updateRoofs(px:number, py:number, dt:number) {
        const k = Math.min(1, dt * 8);
        for (const roof of this.roofs) {
            const inside = Math.abs(px - roof.x) <= roof.w / 2 + 2 && Math.abs(py - roof.y) <= roof.h / 2 + 2;
            const target = inside ? 0.06 : 1;
            if (roof.sprite.alpha !== target) {
                roof.sprite.alpha += (target - roof.sprite.alpha) * k;
                if (Math.abs(roof.sprite.alpha - target) < 0.01) {
                    roof.sprite.alpha = target;
                }
            }
        }
    }

    /** Показывает только чанки рядом с камерой. */
    updateVisibility(left:number, top:number, right:number, bottom:number) {
        const minX = Math.floor((left - 300) / CHUNK);
        const maxX = Math.floor((right + 300) / CHUNK);
        const minY = Math.floor((top - 300) / CHUNK);
        const maxY = Math.floor((bottom + 300) / CHUNK);
        for (const [key, list] of this.chunks) {
            const cx = Math.floor(key / 1000);
            const cy = key % 1000;
            const visible = cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
            for (const container of list) {
                container.visible = visible;
            }
        }
    }

    /** Те же столкновения, что и на сервере. */
    resolve(x:number, y:number, radius:number) {
        let px = x;
        let py = y;
        const cx = Math.floor(px / COLLISION_CELL);
        const cy = Math.floor(py / COLLISION_CELL);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (const el of this.collision.get((cx + dx) * 100000 + cy + dy) || []) {
                    if (!el.alive) {
                        continue;
                    }
                    if (el.shape === "r") {
                        const nx = Math.max(el.x - el.w / 2, Math.min(el.x + el.w / 2, px));
                        const ny = Math.max(el.y - el.h / 2, Math.min(el.y + el.h / 2, py));
                        const ox = px - nx;
                        const oy = py - ny;
                        const dist = Math.hypot(ox, oy);
                        if (dist < radius) {
                            if (dist > 0.001) {
                                px = nx + ox / dist * radius;
                                py = ny + oy / dist * radius;
                            } else {
                                const left = px - (el.x - el.w / 2);
                                const right = el.x + el.w / 2 - px;
                                const top = py - (el.y - el.h / 2);
                                const bottom = el.y + el.h / 2 - py;
                                const min = Math.min(left, right, top, bottom);
                                if (min === left) px = el.x - el.w / 2 - radius;
                                else if (min === right) px = el.x + el.w / 2 + radius;
                                else if (min === top) py = el.y - el.h / 2 - radius;
                                else py = el.y + el.h / 2 + radius;
                            }
                        }
                        continue;
                    }
                    const ox = px - el.x;
                    const oy = py - el.y;
                    const min = el.r + radius;
                    const dist = Math.hypot(ox, oy);
                    if (dist < min && dist > 0.001) {
                        px = el.x + ox / dist * min;
                        py = el.y + oy / dist * min;
                    }
                }
            }
        }
        const size = this.config.size;
        return { x: Math.max(radius, Math.min(size - radius, px)), y: Math.max(radius, Math.min(size - radius, py)) };
    }

    private buildMinimap() {
        const { gridSize, zones } = this.config.map;
        const canvas = document.createElement("canvas");
        canvas.width = gridSize;
        canvas.height = gridSize;
        const ctx = canvas.getContext("2d")!;
        const image = ctx.createImageData(gridSize, gridSize);
        const colors:[number, number, number][] = [[52, 92, 40], [104, 98, 52], [112, 60, 42], [70, 26, 30]];
        for (let i = 0; i < this.zone.length; i++) {
            const value = this.zone[i] / 255;
            const level = value < zones.safe ? 0 : value < zones.wild ? 1 : value < zones.danger ? 2 : 3;
            let [r, g, b] = colors[level];
            if (value >= zones.toxic) {
                [r, g, b] = [96, 140, 40];
            }
            image.data.set([r, g, b, 255], i * 4);
        }
        ctx.putImageData(image, 0, 0);
        const k = gridSize / this.config.size;
        ctx.fillStyle = "rgba(20, 20, 20, 0.75)";
        for (const road of this.config.map.roads) {
            ctx.fillRect((road.x - road.w / 2) * k, (road.y - road.h / 2) * k, Math.max(1, road.w * k), Math.max(1, road.h * k));
        }
        ctx.fillStyle = "rgba(205, 205, 195, 0.75)";
        for (const s of this.config.map.settlements) {
            ctx.fillRect((s.x - s.w / 2) * k, (s.y - s.h / 2) * k, s.w * k, s.h * k);
        }
        ctx.fillStyle = "#5fd1ff";
        for (const c of this.config.map.camps || []) {
            ctx.fillRect((c.x - 260) * k, (c.y - 260) * k, Math.max(3, 520 * k), Math.max(3, 520 * k));
        }
        return canvas;
    }
}
