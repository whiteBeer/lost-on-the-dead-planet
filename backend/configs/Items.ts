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
    { id: "mutagen", result: "mutagen", count: 1, cost: { slime: 6, bone: 4 } }
];

// Что лежит в ящиках: [предмет, шанс, минимум, максимум]
export type LootRow = [string, number, number, number];

export const CRATE_LOOT:Record<"wild" | "village" | "town" | "city", LootRow[]> = {
    wild: [["wood", 0.3, 1, 2], ["cloth", 0.35, 1, 2], ["bandage", 0.2, 1, 1], ["scrap", 0.15, 1, 1]],
    village: [["cloth", 0.6, 1, 2], ["bandage", 0.35, 1, 1], ["wood", 0.25, 1, 2], ["scrap", 0.2, 1, 2], ["powder", 0.1, 1, 1], ["w:Wrench", 0.05, 1, 1]],
    town: [["w:Wrench", 0.07, 1, 1], ["scrap", 0.7, 1, 3], ["cloth", 0.6, 1, 3], ["powder", 0.5, 1, 3], ["bandage", 0.4, 1, 2], ["medkit", 0.15, 1, 1], ["grenade", 0.1, 1, 1]],
    city: [["scrap", 0.9, 3, 6], ["powder", 0.7, 2, 4], ["cloth", 0.5, 2, 4], ["medkit", 0.3, 1, 1], ["grenade", 0.25, 1, 2], ["armor_kevlar", 0.05, 1, 1], ["gasmask", 0.06, 1, 1]]
};

// Шанс найти оружие в ящике и уровень его редкости
export const CRATE_WEAPON:Record<keyof typeof CRATE_LOOT, [number, number]> = {
    wild: [0.04, 1],
    village: [0.08, 1],
    town: [0.15, 2],
    city: [0.22, 3]
};

// Аирдроп: всегда оружие (не выше зелёного) и что-то из этого
export const AIRDROP_LOOT:LootRow[] = [
    ["medkit", 0.6, 1, 2], ["bandage", 0.7, 2, 3], ["grenade", 0.35, 1, 2], ["armor_bone", 0.15, 1, 1],
    ["powder", 0.5, 2, 4], ["scrap", 0.5, 2, 4], ["rope", 0.4, 1, 2], ["cloth", 0.5, 2, 3]
];

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
