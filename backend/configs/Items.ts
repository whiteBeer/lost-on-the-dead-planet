/**
 * Предметы инвентаря, рецепты и добыча.
 * Оружие в инвентаре хранится как предмет с id "w:<id оружия>".
 */
export type ItemKind = "res" | "use" | "armor" | "mask" | "weapon";

export interface ItemConfig {
    id:string;
    name:string;
    kind:ItemKind;
    stack:number;
    description:string;
    heal?:number;      // для аптечек
    food?:number;      // сколько сытости даёт
    water?:number;     // сколько воды даёт
    armor?:number;     // доля снижения урона
}

export const INVENTORY_SLOTS = 12;

export const ITEMS:Record<string, ItemConfig> = {
    wood: { id: "wood", name: "Дерево", kind: "res", stack: 99, description: "Добывается из деревьев, топором вдвое быстрее." },
    stone: { id: "stone", name: "Камень", kind: "res", stack: 99, description: "Добывается из валунов, киркой вдвое быстрее." },
    scrap: { id: "scrap", name: "Металлолом", kind: "res", stack: 99, description: "Машины разбираются гаечным ключом. Ещё бывает в ящиках и у солдат-зомби." },
    rope: { id: "rope", name: "Верёвка", kind: "res", stack: 20, description: "Скручивается из ткани. Нужна для инструментов." },
    bone: { id: "bone", name: "Кости", kind: "res", stack: 99, description: "Падают с монстров." },
    hide: { id: "hide", name: "Шкура", kind: "res", stack: 99, description: "Падает с гончих, громил и других крупных монстров." },
    slime: { id: "slime", name: "Слизь мутанта", kind: "res", stack: 99, description: "Падает с плевальщиков, раздутых и пауков." },
    cloth: { id: "cloth", name: "Ткань", kind: "res", stack: 99, description: "Обрывки одежды зомби и находки в домах." },
    powder: { id: "powder", name: "Порох", kind: "res", stack: 99, description: "Солдаты-зомби и ящики в городах." },
    ammo_9mm: { id: "ammo_9mm", name: "Патроны 9×19 мм", kind: "res", stack: 120, description: "Для пистолета и пистолета-пулемёта." },
    ammo_556: { id: "ammo_556", name: "Патроны 5,56×45 мм", kind: "res", stack: 120, description: "Для автомата и минигана." },
    ammo_762: { id: "ammo_762", name: "Патроны 7,62×54 мм", kind: "res", stack: 60, description: "Для снайперской винтовки." },
    ammo_12g: { id: "ammo_12g", name: "Дробь 12 калибра", kind: "res", stack: 48, description: "Для дробовика." },
    arrow: { id: "arrow", name: "Стрелы", kind: "res", stack: 40, description: "Для лука и арбалета." },
    fuel: { id: "fuel", name: "Топливо", kind: "res", stack: 270, description: "Для огнемёта." },
    rocket: { id: "rocket", name: "Ракета", kind: "res", stack: 8, description: "Для ракетомёта." },
    cell: { id: "cell", name: "Энергоячейка", kind: "res", stack: 12, description: "Для рельсотрона." },
    canned: { id: "canned", name: "Консервы", kind: "use", stack: 6, food: 45, description: "Сытость +45." },
    meat: { id: "meat", name: "Мясо мутанта", kind: "use", stack: 8, food: 20, water: -5, description: "Сытость +20, но хочется пить: вода −5." },
    water: { id: "water", name: "Бутылка воды", kind: "use", stack: 6, water: 50, description: "Вода +50." },
    bandage: { id: "bandage", name: "Бинт", kind: "use", stack: 10, heal: 30, description: "Восстанавливает 30 здоровья." },
    medkit: { id: "medkit", name: "Аптечка", kind: "use", stack: 5, heal: 75, description: "Восстанавливает 75 здоровья." },
    grenade: { id: "grenade", name: "Граната", kind: "use", stack: 5, description: "Бросок туда, куда смотришь. Взрыв ранит всех вокруг, кроме союзников." },
    mutagen: { id: "mutagen", name: "Мутаген", kind: "use", stack: 3, description: "Сразу даёт выбор из трёх перков." },
    armor_wood: { id: "armor_wood", name: "Деревянная броня", kind: "armor", stack: 1, armor: 0.08, description: "Снижение урона 8%." },
    armor_bone: { id: "armor_bone", name: "Костяная броня", kind: "armor", stack: 1, armor: 0.15, description: "Снижение урона 15%." },
    armor_kevlar: { id: "armor_kevlar", name: "Бронежилет", kind: "armor", stack: 1, armor: 0.25, description: "Снижение урона 25%." },
    gasmask: { id: "gasmask", name: "Противогаз", kind: "mask", stack: 1, description: "Защищает от ядовитого воздуха в глубине мёртвых земель." }
};

export interface Recipe {
    id:string;
    result:string;     // id предмета или "w:<оружие>"
    count:number;
    cost:Record<string, number>;
}

export const RECIPES:Recipe[] = [
    { id: "rope", result: "rope", count: 1, cost: { cloth: 3 } },
    { id: "spear", result: "w:Spear", count: 1, cost: { wood: 5, stone: 3, rope: 1 } },
    { id: "axe", result: "w:Axe", count: 1, cost: { wood: 5, stone: 4, rope: 1 } },
    { id: "pickaxe", result: "w:Pickaxe", count: 1, cost: { wood: 5, stone: 6, rope: 1 } },
    { id: "wrench", result: "w:Wrench", count: 1, cost: { stone: 6, wood: 2, rope: 2 } },
    { id: "bow", result: "w:Bow", count: 1, cost: { wood: 8, hide: 2, rope: 1 } },
    { id: "bandage", result: "bandage", count: 2, cost: { cloth: 2 } },
    { id: "medkit", result: "medkit", count: 1, cost: { cloth: 2, slime: 2 } },
    { id: "armor_wood", result: "armor_wood", count: 1, cost: { wood: 10 } },
    { id: "armor_bone", result: "armor_bone", count: 1, cost: { bone: 8, hide: 3 } },
    { id: "gasmask", result: "gasmask", count: 1, cost: { cloth: 3, slime: 3, scrap: 2 } },
    { id: "pistol", result: "w:Pistol", count: 1, cost: { scrap: 5, powder: 3, wood: 1 } },
    { id: "shotgun", result: "w:Shotgun", count: 1, cost: { scrap: 10, powder: 5, wood: 3 } },
    { id: "grenade", result: "grenade", count: 1, cost: { scrap: 2, powder: 3 } },
    { id: "armor_kevlar", result: "armor_kevlar", count: 1, cost: { scrap: 8, cloth: 5, hide: 3 } },
    { id: "mutagen", result: "mutagen", count: 1, cost: { slime: 6, bone: 4 } },
    { id: "arrow", result: "arrow", count: 6, cost: { wood: 2, stone: 1 } },
    { id: "ammo_9mm", result: "ammo_9mm", count: 12, cost: { scrap: 1, powder: 1 } },
    { id: "ammo_12g", result: "ammo_12g", count: 6, cost: { scrap: 1, powder: 2 } },
    { id: "ammo_556", result: "ammo_556", count: 15, cost: { scrap: 2, powder: 2 } },
    { id: "ammo_762", result: "ammo_762", count: 5, cost: { scrap: 2, powder: 3 } }
];

// Что лежит в ящиках: [предмет, шанс, минимум, максимум]
export type LootRow = [string, number, number, number];

export const CRATE_LOOT:Record<"wild" | "village" | "town" | "city", LootRow[]> = {
    wild: [["wood", 0.3, 1, 2], ["cloth", 0.35, 1, 2], ["bandage", 0.2, 1, 1], ["scrap", 0.15, 1, 1], ["canned", 0.15, 1, 1], ["water", 0.2, 1, 1]],
    village: [["cloth", 0.6, 1, 2], ["bandage", 0.35, 1, 1], ["wood", 0.25, 1, 2], ["scrap", 0.2, 1, 2], ["powder", 0.1, 1, 1], ["w:Wrench", 0.05, 1, 1],
        ["canned", 0.3, 1, 1], ["water", 0.35, 1, 1], ["ammo_9mm", 0.12, 4, 10], ["arrow", 0.15, 3, 6]],
    town: [["w:Wrench", 0.07, 1, 1], ["canned", 0.3, 1, 1], ["water", 0.3, 1, 1], ["ammo_9mm", 0.3, 6, 14], ["ammo_12g", 0.15, 3, 6], ["ammo_556", 0.1, 8, 15], ["scrap", 0.7, 1, 3], ["cloth", 0.6, 1, 3], ["powder", 0.5, 1, 3], ["bandage", 0.4, 1, 2], ["medkit", 0.15, 1, 1], ["grenade", 0.1, 1, 1]],
    city: [["canned", 0.3, 1, 2], ["water", 0.3, 1, 2], ["ammo_556", 0.35, 10, 25], ["ammo_9mm", 0.3, 8, 18], ["ammo_12g", 0.2, 4, 8], ["ammo_762", 0.1, 3, 6],
        ["fuel", 0.05, 30, 60], ["rocket", 0.03, 1, 2], ["cell", 0.03, 1, 3], ["scrap", 0.9, 3, 6], ["powder", 0.7, 2, 4], ["cloth", 0.5, 2, 4], ["medkit", 0.3, 1, 1], ["grenade", 0.25, 1, 2], ["armor_kevlar", 0.05, 1, 1], ["gasmask", 0.06, 1, 1]]
};

// Шанс найти оружие в ящике и уровень его редкости
export const CRATE_WEAPON:Record<keyof typeof CRATE_LOOT, [number, number]> = {
    wild: [0.02, 1],
    village: [0.04, 1],
    town: [0.06, 1],
    city: [0.08, 2]
};

// Полки в домах: в основном еда, вода и патроны
export const SHELF_LOOT:Record<"village" | "town" | "city", LootRow[]> = {
    village: [["canned", 0.45, 1, 1], ["water", 0.5, 1, 1], ["cloth", 0.4, 1, 2], ["bandage", 0.25, 1, 1], ["ammo_9mm", 0.2, 4, 10], ["arrow", 0.15, 3, 6]],
    town: [["canned", 0.45, 1, 2], ["water", 0.45, 1, 2], ["ammo_9mm", 0.35, 6, 14], ["ammo_12g", 0.2, 3, 6], ["ammo_556", 0.12, 6, 12], ["bandage", 0.3, 1, 2], ["powder", 0.2, 1, 2]],
    city: [["canned", 0.4, 1, 2], ["water", 0.4, 1, 2], ["ammo_556", 0.35, 8, 20], ["ammo_9mm", 0.3, 8, 16], ["ammo_12g", 0.2, 4, 8], ["ammo_762", 0.08, 2, 5], ["medkit", 0.15, 1, 1]]
};

export function rollLoot(rows:LootRow[], luck = 1):[string, number][] {
    const result:[string, number][] = [];
    for (const [id, chance, min, max] of rows) {
        if (Math.random() < Math.min(1, chance * luck)) {
            result.push([id, min + Math.floor(Math.random() * (max - min + 1))]);
        }
    }
    return result;
}

export function isWeaponItem(id:string) {
    return id.startsWith("w:");
}

export function stackOf(id:string) {
    return isWeaponItem(id) ? 1 : ITEMS[id]?.stack || 1;
}

export interface Trade {
    id:string;
    give:Record<string, number>;   // что отдаёт игрок
    get:[string, number];          // что получает
}

// Обмен у торговцев: чем опаснее место лагеря, тем ценнее товар
export const TRADES:Trade[][] = [
    [
        { id: "t0_water", give: { wood: 4 }, get: ["water", 1] },
        { id: "t0_canned", give: { cloth: 3 }, get: ["canned", 1] },
        { id: "t0_rope", give: { hide: 1, cloth: 1 }, get: ["rope", 1] },
        { id: "t0_9mm", give: { bone: 5 }, get: ["ammo_9mm", 10] },
        { id: "t0_arrow", give: { stone: 3 }, get: ["arrow", 6] },
        { id: "t0_bandage", give: { meat: 2 }, get: ["bandage", 2] },
        { id: "t0_axe", give: { scrap: 4, wood: 3 }, get: ["w:Axe", 1] },
        { id: "t0_wrench", give: { stone: 8, cloth: 4 }, get: ["w:Wrench", 1] }
    ],
    [
        { id: "t1_556", give: { scrap: 4, powder: 2 }, get: ["ammo_556", 20] },
        { id: "t1_12g", give: { scrap: 3, hide: 2 }, get: ["ammo_12g", 8] },
        { id: "t1_medkit", give: { slime: 4, meat: 2 }, get: ["medkit", 1] },
        { id: "t1_water", give: { meat: 2 }, get: ["water", 2] },
        { id: "t1_gasmask", give: { scrap: 6, slime: 4 }, get: ["gasmask", 1] },
        { id: "t1_smg", give: { scrap: 14, powder: 6, bone: 6 }, get: ["w:SMG", 1] },
        { id: "t1_armor", give: { scrap: 10, hide: 6 }, get: ["armor_kevlar", 1] }
    ],
    [
        { id: "t2_762", give: { scrap: 6, powder: 4 }, get: ["ammo_762", 8] },
        { id: "t2_fuel", give: { slime: 8 }, get: ["fuel", 60] },
        { id: "t2_rocket", give: { scrap: 12, powder: 8 }, get: ["rocket", 1] },
        { id: "t2_cell", give: { scrap: 10, slime: 10 }, get: ["cell", 2] },
        { id: "t2_mutagen", give: { slime: 8, bone: 8 }, get: ["mutagen", 1] },
        { id: "t2_rifle", give: { scrap: 20, powder: 10, hide: 6 }, get: ["w:Rifle", 1] }
    ]
];
