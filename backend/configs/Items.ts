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
    ore: { id: "ore", name: "Железная руда", kind: "res", stack: 99, description: "Рыжие камни в диких и опасных землях, добывается только киркой." },
    crystal: { id: "crystal", name: "Кристалл мутации", kind: "res", stack: 40, description: "Растёт только в мёртвых землях, добывается киркой. Дорого ценится у торговцев." },
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
    coin: { id: "coin", name: "Монеты", kind: "res", stack: 9999, description: "Валюта лагерей: задания, охрана, продажа торговцам." },
    pouch: { id: "pouch", name: "Подсумок", kind: "use", stack: 1, description: "+4 ячейки рюкзака (не больше 24). Пропадает после смерти." },
    canned: { id: "canned", name: "Консервы", kind: "use", stack: 6, food: 45, description: "Сытость +45." },
    meat: { id: "meat", name: "Мясо мутанта", kind: "use", stack: 8, food: 20, water: -5, description: "Сытость +20, но хочется пить: вода −5." },
    water: { id: "water", name: "Бутылка воды", kind: "use", stack: 6, water: 50, description: "Вода +50." },
    bandage: { id: "bandage", name: "Бинт", kind: "use", stack: 10, heal: 30, description: "Восстанавливает 30 здоровья." },
    medkit: { id: "medkit", name: "Аптечка", kind: "use", stack: 5, heal: 75, description: "Восстанавливает 75 здоровья." },
    grenade: { id: "grenade", name: "Граната", kind: "use", stack: 5, description: "Бросок туда, куда смотришь. Взрыв ранит всех вокруг, кроме союзников." },
    mutagen: { id: "mutagen", name: "Шприц мутагена", kind: "use", stack: 3, description: "Сразу даёт выбор из трёх перков. Продаётся у торговцев." },
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
    { id: "armor_kevlar", result: "armor_kevlar", count: 1, cost: { ore: 6, cloth: 5, hide: 3 } },
    { id: "pouch", result: "pouch", count: 1, cost: { hide: 4, cloth: 4, rope: 2 } },
    { id: "arrow", result: "arrow", count: 6, cost: { wood: 2, stone: 1 } },
    { id: "ammo_9mm", result: "ammo_9mm", count: 12, cost: { scrap: 1, powder: 1 } },
    { id: "ammo_12g", result: "ammo_12g", count: 6, cost: { scrap: 1, powder: 2 } },
    { id: "ammo_556", result: "ammo_556", count: 15, cost: { ore: 2, powder: 2 } },
    { id: "ammo_9mm_ore", result: "ammo_9mm", count: 16, cost: { ore: 1, powder: 1 } },
    { id: "cell", result: "cell", count: 2, cost: { crystal: 3, scrap: 2 } },
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

// Обмен у торговцев: чем опаснее место лагеря, тем ценнее товар. Монеты — валюта лагерей.
// hire — нанять наёмника (особая сделка, get не выдаётся предметом)
export const TRADES:Trade[][] = [
    [
        { id: "t0_sell_bone", give: { bone: 6 }, get: ["coin", 4] },
        { id: "t0_sell_meat", give: { meat: 3 }, get: ["coin", 4] },
        { id: "t0_sell_hide", give: { hide: 3 }, get: ["coin", 5] },
        { id: "t0_water", give: { coin: 4 }, get: ["water", 1] },
        { id: "t0_canned", give: { coin: 5 }, get: ["canned", 1] },
        { id: "t0_rope", give: { coin: 3 }, get: ["rope", 1] },
        { id: "t0_9mm", give: { coin: 6 }, get: ["ammo_9mm", 12] },
        { id: "t0_arrow", give: { coin: 3 }, get: ["arrow", 8] },
        { id: "t0_wrench", give: { coin: 12 }, get: ["w:Wrench", 1] },
        { id: "t0_mutagen", give: { coin: 60, slime: 6 }, get: ["mutagen", 1] },
        { id: "t0_hire", give: { coin: 40 }, get: ["hire", 1] }
    ],
    [
        { id: "t1_sell_scrap", give: { scrap: 6 }, get: ["coin", 6] },
        { id: "t1_sell_slime", give: { slime: 4 }, get: ["coin", 6] },
        { id: "t1_sell_ore", give: { ore: 4 }, get: ["coin", 6] },
        { id: "t1_556", give: { coin: 12 }, get: ["ammo_556", 20] },
        { id: "t1_12g", give: { coin: 10 }, get: ["ammo_12g", 8] },
        { id: "t1_medkit", give: { coin: 15 }, get: ["medkit", 1] },
        { id: "t1_water", give: { coin: 5 }, get: ["water", 2] },
        { id: "t1_gasmask", give: { coin: 30 }, get: ["gasmask", 1] },
        { id: "t1_smg", give: { coin: 70 }, get: ["w:SMG", 1] },
        { id: "t1_mutagen", give: { coin: 55, slime: 5 }, get: ["mutagen", 1] },
        { id: "t1_hire", give: { coin: 60 }, get: ["hire", 1] }
    ],
    [
        { id: "t2_sell_powder", give: { powder: 4 }, get: ["coin", 8] },
        { id: "t2_sell_crystal", give: { crystal: 2 }, get: ["coin", 16] },
        { id: "t2_762", give: { coin: 16 }, get: ["ammo_762", 8] },
        { id: "t2_fuel", give: { coin: 20 }, get: ["fuel", 60] },
        { id: "t2_rocket", give: { coin: 35 }, get: ["rocket", 1] },
        { id: "t2_cell", give: { coin: 40 }, get: ["cell", 2] },
        { id: "t2_armor", give: { coin: 60 }, get: ["armor_kevlar", 1] },
        { id: "t2_rifle", give: { coin: 110 }, get: ["w:Rifle", 1] },
        { id: "t2_mutagen", give: { coin: 50, slime: 4 }, get: ["mutagen", 1] },
        { id: "t2_hire", give: { coin: 80 }, get: ["hire", 1] }
    ]
];

export interface QuestConfig {
    id:string;
    text:string;
    kill?:string;                  // тип монстра; "any" — любой
    bring?:[string, number];       // сдать предметы
    need:number;
    reward:[number, number];       // монеты, опыт
}

// Задания торговцев по уровню лагеря
export const QUESTS:QuestConfig[][] = [
    [
        { id: "q_zombie", text: "Убей 15 зомби", kill: "zombie", need: 15, reward: [15, 120] },
        { id: "q_runner", text: "Убей 8 бегунов", kill: "runner", need: 8, reward: [12, 100] },
        { id: "q_crawler", text: "Убей 10 ползунов", kill: "crawler", need: 10, reward: [10, 80] },
        { id: "q_bone", text: "Принеси 8 костей", bring: ["bone", 8], need: 8, reward: [10, 60] },
        { id: "q_wood", text: "Принеси 10 дерева", bring: ["wood", 10], need: 10, reward: [12, 60] }
    ],
    [
        { id: "q_hound", text: "Убей 8 гончих", kill: "hound", need: 8, reward: [25, 220] },
        { id: "q_spitter", text: "Убей 6 плевальщиков", kill: "spitter", need: 6, reward: [25, 220] },
        { id: "q_soldier", text: "Убей 4 солдат-зомби", kill: "soldier", need: 4, reward: [30, 260] },
        { id: "q_hide", text: "Принеси 6 шкур", bring: ["hide", 6], need: 6, reward: [20, 120] },
        { id: "q_any", text: "Убей 40 любых монстров", kill: "any", need: 40, reward: [35, 300] }
    ],
    [
        { id: "q_brute", text: "Убей 3 громил", kill: "brute", need: 3, reward: [45, 450] },
        { id: "q_stalker", text: "Убей 5 призраков", kill: "stalker", need: 5, reward: [45, 450] },
        { id: "q_behemoth", text: "Убей бегемота", kill: "behemoth", need: 1, reward: [60, 600] },
        { id: "q_boss", text: "Убей Владыку", kill: "boss", need: 1, reward: [150, 1500] },
        { id: "q_scrap", text: "Принеси 15 металлолома", bring: ["scrap", 15], need: 15, reward: [35, 250] }
    ]
];
