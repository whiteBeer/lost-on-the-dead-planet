/**
 * Перки. Все модификаторы складываются со значениями из BASE_STATS.
 *
 * Карточки на клиенте намеренно не показывают, хороший перк или нет:
 * у части перков заманчивое название и неприятное условие. Игрок должен читать описание.
 */
export interface PlayerStats {
    maxHp:number;
    regen:number;          // Здоровья в секунду
    speed:number;          // Множитель скорости
    damage:number;         // Множитель всего урона
    monsterDamage:number;  // Множитель урона по монстрам
    playerDamage:number;   // Множитель урона по игрокам
    fireRate:number;       // Множитель скорострельности
    reload:number;         // Множитель скорости перезарядки
    clip:number;           // Множитель магазина
    spread:number;         // Множитель разброса
    bulletSpeed:number;
    range:number;
    armor:number;          // Доля снижения любого урона
    monsterArmor:number;   // Доля снижения урона от монстров
    playerArmor:number;    // Доля снижения урона от игроков
    dodge:number;          // Шанс уклониться
    lifesteal:number;      // Доля урона, возвращаемая здоровьем
    crit:number;           // Шанс крита
    critDamage:number;     // Множитель крита
    thorns:number;         // Доля урона, возвращаемая атакующему
    pierce:number;         // Дополнительно пробитых целей
    ricochet:number;       // Рикошетов к ближайшей цели
    extraBullets:number;   // Дополнительных пуль
    exp:number;            // Множитель опыта
    drop:number;           // Множитель шанса дропа
    onKillHeal:number;     // Здоровья за убийство
    ammoRefund:number;     // Шанс не потратить патрон
    miss:number;           // Шанс, что пуля не нанесёт урона
    selfDamage:number;     // Здоровья за выстрел
    lowHpDamage:number;    // Прибавка к урону при здоровье ниже 35%
    highHpDamage:number;   // Прибавка к урону при здоровье выше 90%
    movingDamage:number;   // Прибавка к урону в движении
    stillDamage:number;    // Прибавка к урону стоя на месте
    stillRegen:number;     // Здоровья в секунду стоя на месте
    explodeOnKill:number;  // Радиус взрыва при убийстве
    explodeOnDeath:number; // Радиус взрыва при смерти
    reloadOnKill:number;   // Шанс мгновенно пополнить магазин при убийстве
    aggro:number;          // Множитель дальности, с которой тебя замечают монстры
    exposed:number;        // Больше 0 — виден всем на миникарте
    damageVariance:number; // Случайное отклонение урона в обе стороны
    speedOnKill:number;    // Прибавка к скорости на 3 секунды после убийства
    deathExpKeep:number;   // Доля опыта, сохраняемая после смерти
    killBounty:number;     // Множитель опыта, который получит твой убийца
    bossDamage:number;     // Множитель урона по боссу
    teamShare:number;      // Множитель опыта от союзников
    lastBullet:number;     // Множитель урона последнего патрона в магазине
}

export const BASE_STATS:PlayerStats = {
    maxHp: 100, regen: 0, speed: 1, damage: 1, monsterDamage: 1, playerDamage: 1,
    fireRate: 1, reload: 1, clip: 1, spread: 1, bulletSpeed: 1, range: 1,
    armor: 0, monsterArmor: 0, playerArmor: 0, dodge: 0, lifesteal: 0,
    crit: 0, critDamage: 2, thorns: 0, pierce: 0, ricochet: 0, extraBullets: 0,
    exp: 1, drop: 1, onKillHeal: 0, ammoRefund: 0, miss: 0, selfDamage: 0,
    lowHpDamage: 0, highHpDamage: 0, movingDamage: 0, stillDamage: 0, stillRegen: 0,
    explodeOnKill: 0, explodeOnDeath: 0, reloadOnKill: 0, aggro: 1, exposed: 0,
    damageVariance: 0, speedOnKill: 0, deathExpKeep: 0, killBounty: 1,
    bossDamage: 1, teamShare: 1, lastBullet: 1
};

// Ограничения, чтобы сочетания перков не ломали игру
export const STAT_LIMITS:Partial<Record<keyof PlayerStats, [number, number]>> = {
    maxHp: [20, 600],
    regen: [-20, 3],
    stillRegen: [0, 3],
    speed: [0.5, 1.9],
    damage: [0.25, 5],
    monsterDamage: [0.25, 5],
    playerDamage: [0.25, 4],
    fireRate: [0.35, 3],
    reload: [0.35, 4],
    clip: [0.25, 4],
    spread: [0.1, 4],
    bulletSpeed: [0.5, 2.5],
    range: [0.4, 2.5],
    armor: [-1, 0.7],
    monsterArmor: [-1, 0.75],
    playerArmor: [-1, 0.7],
    dodge: [0, 0.3],
    lifesteal: [0, 0.4],
    crit: [0, 0.75],
    thorns: [0, 1],
    pierce: [0, 6],
    ricochet: [0, 4],
    extraBullets: [0, 4],
    exp: [0.3, 4],
    drop: [0.2, 5],
    miss: [0, 0.6],
    ammoRefund: [0, 0.7],
    aggro: [0.35, 3],
    deathExpKeep: [0, 0.5]
};

export type PerkRarity = "common" | "rare" | "epic";

export interface Perk {
    id:string;
    name:string;
    description:string;
    rarity:PerkRarity;
    category:"attack" | "defense" | "mobility" | "weapon" | "fortune" | "strange";
    mods:Partial<PlayerStats>;
    icon?:string;
    positive?:boolean;
}

type Category = Perk["category"];

interface StatText {
    stat:keyof PlayerStats;
    label:string;
    // Как показывать значение: проценты или единицы
    unit:"%" | "";
    category:Category;
    gain:number[]; // Сила «чистого» бонуса по уровням
    tradeGain:number; // Бонус в перке с недостатком (всегда сильнее)
    tradeLoss:number; // Размер недостатка, если эта характеристика ухудшается
    gainWord?:string; // Прилагательное для перков с недостатком
    lossWord?:string; // Существительное для перков с недостатком
    baseName?:string; // Название чистого перка
}

const STATS:StatText[] = [
    { stat: "damage", label: "Урон", unit: "%", category: "attack", gain: [0.1, 0.18, 0.28], tradeGain: 0.4, tradeLoss: -0.2, gainWord: "Свирепый", lossWord: "слабак", baseName: "Тяжёлая рука" },
    { stat: "fireRate", label: "Скорострельность", unit: "%", category: "weapon", gain: [0.05, 0.09, 0.14], tradeGain: 0.2, tradeLoss: -0.2, gainWord: "Скорострельный", lossWord: "тугодум", baseName: "Быстрый палец" },
    { stat: "speed", label: "Скорость бега", unit: "%", category: "mobility", gain: [0.06, 0.11, 0.17], tradeGain: 0.25, tradeLoss: -0.14, gainWord: "Быстроногий", lossWord: "увалень", baseName: "Лёгкий шаг" },
    { stat: "maxHp", label: "Макс. здоровье", unit: "", category: "defense", gain: [15, 30, 50], tradeGain: 70, tradeLoss: -25, gainWord: "Живучий", lossWord: "доходяга", baseName: "Крепкое тело" },
    { stat: "armor", label: "Снижение любого урона", unit: "%", category: "defense", gain: [0.05, 0.09, 0.14], tradeGain: 0.22, tradeLoss: -0.14, gainWord: "Бронированный", lossWord: "неженка", baseName: "Бронежилет" },
    { stat: "monsterArmor", label: "Снижение урона от монстров", unit: "%", category: "defense", gain: [0.08, 0.14, 0.22], tradeGain: 0.32, gainWord: "Толстокожий", lossWord: "корм", tradeLoss: -0.2, baseName: "Толстая кожа" },
    { stat: "reload", label: "Скорость перезарядки", unit: "%", category: "weapon", gain: [0.12, 0.22, 0.35], tradeGain: 0.5, tradeLoss: -0.25, gainWord: "Проворный", lossWord: "копуша", baseName: "Ловкие руки" },
    { stat: "clip", label: "Размер магазина", unit: "%", category: "weapon", gain: [0.15, 0.3, 0.5], tradeGain: 0.7, tradeLoss: -0.3, gainWord: "Запасливый", lossWord: "скряга", baseName: "Удлинённый магазин" },
    { stat: "spread", label: "Разброс", unit: "%", category: "weapon", gain: [-0.12, -0.22, -0.35], tradeGain: -0.5, tradeLoss: 0.4, gainWord: "Меткий", lossWord: "косоглазый", baseName: "Твёрдая рука" },
    { stat: "bulletSpeed", label: "Скорость пули", unit: "%", category: "weapon", gain: [0.05, 0.1, 0.2], tradeGain: 0.25, tradeLoss: -0.25, gainWord: "Реактивный", lossWord: "лентяй", baseName: "Плотный огонь" },
    { stat: "range", label: "Дальность стрельбы", unit: "%", category: "weapon", gain: [0.1, 0.2, 0.35], tradeGain: 0.5, tradeLoss: -0.3, gainWord: "Дальнобойный", lossWord: "очкарик", baseName: "Длинный ствол" },
    { stat: "exp", label: "Получаемый опыт", unit: "%", category: "fortune", gain: [0.08, 0.15, 0.25], tradeGain: 0.4, tradeLoss: -0.2, gainWord: "Прилежный", lossWord: "двоечник", baseName: "Быстрый ум" },
    { stat: "crit", label: "Шанс критического попадания", unit: "%", category: "attack", gain: [0.04, 0.08, 0.13], tradeGain: 0.2, tradeLoss: 0, gainWord: "Смертоносный", baseName: "Слабое место" },
    { stat: "dodge", label: "Шанс уклониться от урона", unit: "%", category: "mobility", gain: [0.03, 0.06, 0.1], tradeGain: 0.16, tradeLoss: 0, gainWord: "Вёрткий", baseName: "Чутьё" },
    { stat: "monsterDamage", label: "Урон по монстрам", unit: "%", category: "attack", gain: [0.12, 0.22, 0.35], tradeGain: 0.5, tradeLoss: -0.3, gainWord: "Зверобойный", lossWord: "зоозащитник", baseName: "Истребитель" },
    { stat: "ammoRefund", label: "Шанс не потратить патрон", unit: "%", category: "weapon", gain: [0.06, 0.12, 0.2], tradeGain: 0.3, tradeLoss: 0, gainWord: "Экономный", baseName: "Бережливость" },
    { stat: "reloadOnKill", label: "Шанс мгновенно пополнить магазин при убийстве", unit: "%", category: "weapon", gain: [0.1, 0.2, 0.35], tradeGain: 0.5, tradeLoss: 0, gainWord: "Расчётливый", baseName: "Перезарядка на бегу" }
];

const ROMAN = ["I", "II", "III"];
const RARITY_BY_TIER:PerkRarity[] = ["common", "rare", "epic"];

function formatEffect(entry:StatText, value:number):string {
    const sign = value > 0 ? "+" : "−";
    const abs = Math.abs(value);
    const shown = entry.unit === "%" ? `${Math.round(abs * 100)}%` : `${abs}`;
    return `${entry.label} ${sign}${shown}`;
}

/** Плюс к скорости пули больше не нужен: тот же бонус идёт в скорострельность. Штраф остаётся. */
function asFireRate(entry:StatText, value:number):StatText {
    if (entry.stat === "bulletSpeed" && value > 0) {
        return STATS.find(s => s.stat === "fireRate") || entry;
    }
    return entry;
}

function putMod(mods:Partial<PlayerStats>, entry:StatText, value:number) {
    const stat = asFireRate(entry, value).stat;
    mods[stat] = (mods[stat] || 0) + value;
}

function generatePerks():Perk[] {
    const perks:Perk[] = [];

    // Чистые бонусы: три уровня на каждую характеристику
    for (const entry of STATS) {
        entry.gain.forEach((value, tier) => {
            const effect = asFireRate(entry, value);
            const mods:Partial<PlayerStats> = {};
            putMod(mods, entry, value);
            perks.push({
                id: `pure_${entry.stat}_${tier + 1}`,
                name: `${entry.baseName} ${ROMAN[tier]}`,
                description: `${formatEffect(effect, value)}.`,
                rarity: RARITY_BY_TIER[tier],
                category: entry.category,
                mods,
                positive: true
            });
        });
    }

    // Сделки: сильный бонус и ощутимый недостаток в другой характеристике
    for (const gain of STATS) {
        for (const loss of STATS) {
            if (gain.stat === loss.stat || !loss.lossWord || !gain.gainWord) {
                continue;
            }
            // Бонус и штраф к одной и той же сути не дают интересного выбора
            if (gain.stat === "damage" && loss.stat === "monsterDamage") {
                continue;
            }
            // Плюс к скорости пули стал скорострельностью — не складывать его со штрафом к ней же
            if (gain.stat === "bulletSpeed" && loss.stat === "fireRate") {
                continue;
            }
            const mods:Partial<PlayerStats> = {};
            putMod(mods, gain, gain.tradeGain);
            putMod(mods, loss, loss.tradeLoss);
            perks.push({
                id: `deal_${gain.stat}_${loss.stat}`,
                name: `${gain.gainWord} ${loss.lossWord}`,
                description: `${formatEffect(asFireRate(gain, gain.tradeGain), gain.tradeGain)}. ${formatEffect(asFireRate(loss, loss.tradeLoss), loss.tradeLoss)}.`,
                rarity: "rare",
                category: gain.category,
                mods
            });
        }
    }

    return perks;
}

/**
 * Чисто положительные составные перки. Их всегда хотя бы один среди трёх вариантов,
 * а также именно они могут выпадать из сундуков.
 */
export const POSITIVE_PERKS:Perk[] = [
    {
        id: "assault_instinct", name: "Штурмовой инстинкт", rarity: "rare", category: "attack",
        description: "Урон +15%, скорострельность +6%. Без штрафов.",
        mods: { damage: 0.15, fireRate: 0.06 }, icon: "perk_assault_instinct", positive: true
    },
    {
        id: "iron_heart", name: "Железное сердце", rarity: "rare", category: "defense",
        description: "Макс. здоровье +35, снижение любого урона +8%. Без штрафов.",
        mods: { maxHp: 35, armor: 0.08 }, icon: "perk_iron_heart", positive: true
    },
    {
        id: "light_boots", name: "Лёгкие берцы", rarity: "rare", category: "mobility",
        description: "Скорость бега +12%, шанс уклониться +5%. Без штрафов.",
        mods: { speed: 0.12, dodge: 0.05 }, icon: "perk_light_boots", positive: true
    },
    {
        id: "eagle_eye", name: "Орлиный глаз", rarity: "rare", category: "weapon",
        description: "Разброс −25%, дальность стрельбы +20%. Без штрафов.",
        mods: { spread: -0.25, range: 0.2 }, icon: "perk_eagle_eye", positive: true
    },
    {
        id: "bottomless_mag", name: "Бездонный магазин", rarity: "epic", category: "weapon",
        description: "Магазин +40%, шанс не потратить патрон +12%. Без штрафов.",
        mods: { clip: 0.4, ammoRefund: 0.12 }, icon: "perk_bottomless_mag", positive: true
    },
    {
        id: "trophy_hunter", name: "Охотник за трофеями", rarity: "rare", category: "fortune",
        description: "Получаемый опыт +18%. Без штрафов.",
        mods: { exp: 0.18 }, icon: "perk_trophy_hunter", positive: true
    },
    {
        id: "chain_thunder", name: "Цепной гром", rarity: "epic", category: "weapon",
        description: "Пули пробивают +1 цель.",
        mods: { pierce: 1 }, icon: "perk_chain_thunder", positive: true
    }
];

/**
 * Особые перки для wave-PvE.
 * Убраны PvP/open-world: урон по игрокам, баунти убийцы, миникарта, аггро, боссы, сохранение опыта после смерти.
 */
const SPECIAL_PERKS:Perk[] = [
    { id: "glass_cannon", name: "Стеклянная пушка", rarity: "epic", category: "attack", description: "Урон +70%. Макс. здоровье −45.", mods: { damage: 0.7, maxHp: -45 } },
    { id: "casino", name: "Казино", rarity: "rare", category: "strange", description: "Шанс крита +25%, крит наносит тройной урон. Но 25% пуль не наносят вообще никакого урона.", mods: { crit: 0.25, critDamage: 1, miss: 0.25 } },
    { id: "blood_price", name: "Плата кровью", rarity: "rare", category: "strange", description: "Урон +60%. Каждый выстрел отнимает 1 здоровья.", mods: { damage: 0.6, selfDamage: 1 } },
    { id: "piercing", name: "Бронебойные пули", rarity: "rare", category: "weapon", description: "Пули пробивают +1 цель.", mods: { pierce: 1 } },
    { id: "deep_piercing", name: "Сердечник из вольфрама", rarity: "epic", category: "weapon", description: "Пули пробивают +3 цели. Скорострельность −25%.", mods: { pierce: 3, fireRate: -0.25 } },
    { id: "shaky_hands", name: "Дрожащие руки", rarity: "common", category: "strange", description: "Скорострельность +23%. Разброс +90%.", mods: { fireRate: 0.225, spread: 0.9 } },
    { id: "heavy_armor", name: "Латы", rarity: "epic", category: "defense", description: "Снижение любого урона +35%. Скорость бега −22%.", mods: { armor: 0.35, speed: -0.22 } },
    { id: "feather", name: "Перо", rarity: "rare", category: "mobility", description: "Шанс уклониться +25%. Снижение любого урона −25%: когда попадут, будет больнее.", mods: { dodge: 0.25, armor: -0.25 } },
    { id: "giant", name: "Великан", rarity: "epic", category: "defense", description: "Макс. здоровье +120. Скорость бега −18%, разброс +25%.", mods: { maxHp: 120, speed: -0.18, spread: 0.25 } },
    { id: "sprinter", name: "Спринтер", rarity: "rare", category: "mobility", description: "Скорость бега +35%. Дальность стрельбы −35%.", mods: { speed: 0.35, range: -0.35 } },
    { id: "sniper_eye", name: "Глаз снайпера", rarity: "rare", category: "weapon", description: "Разброс −60%, дальность +50%. Скорострельность −30%.", mods: { spread: -0.6, range: 0.5, fireRate: -0.3 } },
    { id: "spray", name: "Поливай и молись", rarity: "rare", category: "weapon", description: "Скорострельность +30%, магазин +50%. Урон −25%, разброс +50%.", mods: { fireRate: 0.3, clip: 0.5, damage: -0.25, spread: 0.5 } },
    { id: "one_clip", name: "Один, но большой", rarity: "rare", category: "weapon", description: "Магазин +150%. Перезарядка медленнее на 50%.", mods: { clip: 1.5, reload: -0.5 } },
    { id: "small_mag", name: "Обрез магазина", rarity: "rare", category: "weapon", description: "Магазин −50%. Урон +45%, перезарядка быстрее на 40%.", mods: { clip: -0.5, damage: 0.45, reload: 0.4 } },
    { id: "monster_slayer", name: "Истребитель орды", rarity: "rare", category: "attack", description: "Урон по монстрам +70%. Скорость бега −12%.", mods: { monsterDamage: 0.7, speed: -0.12 } },
    { id: "miser", name: "Скупой платит дважды", rarity: "common", category: "strange", description: "Шанс не потратить патрон +40%. Перезарядка медленнее на 45%.", mods: { ammoRefund: 0.4, reload: -0.45 } },
    { id: "crit_addict", name: "Всё или ничего", rarity: "epic", category: "attack", description: "Шанс крита +40%. Обычные, не критические попадания наносят на 40% меньше: урон −40%, крит наносит тройной урон.", mods: { crit: 0.4, damage: -0.4, critDamage: 1 } },
    { id: "tortoise", name: "Черепаха", rarity: "epic", category: "defense", description: "Снижение урона от монстров +55%. Скорость бега −30%.", mods: { monsterArmor: 0.55, speed: -0.3 } },
    { id: "hare", name: "Заяц", rarity: "epic", category: "mobility", description: "Скорость бега +50%. Макс. здоровье −40, снижение любого урона −15%.", mods: { speed: 0.5, maxHp: -40, armor: -0.15 } },
    { id: "slow_bullets", name: "Тяжёлые пули", rarity: "common", category: "weapon", description: "Урон +30%. Скорость пули −35%: по бегущим попасть труднее.", mods: { damage: 0.3, bulletSpeed: -0.35 } },
    { id: "needle", name: "Иглы", rarity: "common", category: "weapon", description: "Скорострельность +30%. Урон −15%.", mods: { fireRate: 0.3, damage: -0.15 } },
    { id: "point_blank", name: "В упор", rarity: "rare", category: "weapon", description: "Урон +55%. Дальность стрельбы −50%.", mods: { damage: 0.55, range: -0.5 } },
    { id: "marksman", name: "Стрелок с вышки", rarity: "rare", category: "weapon", description: "Дальность +80%. Урон −15%.", mods: { range: 0.8, damage: -0.15 } },
    { id: "pain_killer", name: "Обезболивающее", rarity: "common", category: "defense", description: "Снижение любого урона +15%.", mods: { armor: 0.15 } },
    { id: "energy_drink", name: "Энергетик", rarity: "common", category: "mobility", description: "Скорость бега +8%, скорострельность +4%. Макс. здоровье −10.", mods: { speed: 0.08, fireRate: 0.04, maxHp: -10 } },
    { id: "lucky_coin", name: "Счастливая монета", rarity: "common", category: "fortune", description: "Шанс крита +5%, уклонение +3%.", mods: { crit: 0.05, dodge: 0.03 } },
    { id: "dead_weight", name: "Мёртвый груз", rarity: "common", category: "strange", description: "Опыт +30%. Скорость бега −5%.", mods: { speed: -0.05, exp: 0.3 } }
];

export const PERKS:Perk[] = [...POSITIVE_PERKS, ...SPECIAL_PERKS, ...generatePerks()];

const perkById = new Map(PERKS.map(el => [el.id, el]));

export function getPerk(id:string):Perk | undefined {
    return perkById.get(id);
}

const RARITY_WEIGHT:Record<PerkRarity, number> = { common: 60, rare: 30, epic: 10 };

/**
 * Предложение на уровень: три разных перка. Особые перки выпадают заметно чаще сделок,
 * иначе их мало кто увидит на фоне нескольких сотен сгенерированных.
 */
export function rollPerkOffer(taken:Set<string>, level:number, count = 3):Perk[] {
    const epicBoost = Math.min(2.5, 1 + level / 15);
    const featured = [...POSITIVE_PERKS, ...SPECIAL_PERKS];
    const featuredIds = new Set(featured.map(el => el.id));
    const offer:Perk[] = [];
    const usedStats = new Set<string>();

    const tryAdd = (perk:Perk) => {
        if (taken.has(perk.id) || offer.includes(perk)) {
            return false;
        }
        const mainStat = Object.keys(perk.mods)[0];
        if (usedStats.has(mainStat)) {
            return false;
        }
        usedStats.add(mainStat);
        offer.push(perk);
        return true;
    };

    // Игрок всегда видит хотя бы один вариант без скрытого недостатка.
    const positivePool = PERKS.filter(el => el.positive && !taken.has(el.id));
    for (let attempt = 0; attempt < 100 && positivePool.length && offer.length < count; attempt++) {
        const perk = positivePool[Math.floor(Math.random() * positivePool.length)];
        const weight = RARITY_WEIGHT[perk.rarity] * (perk.rarity === "epic" ? epicBoost : 1);
        if (Math.random() * 60 <= weight && tryAdd(perk)) {
            break;
        }
    }

    for (let attempt = 0; attempt < 400 && offer.length < count; attempt++) {
        const useFeatured = Math.random() < 0.5;
        const pool = useFeatured ? featured : PERKS;
        const perk = pool[Math.floor(Math.random() * pool.length)];
        if (!useFeatured && featuredIds.has(perk.id)) {
            continue;
        }
        const weight = RARITY_WEIGHT[perk.rarity] * (perk.rarity === "epic" ? epicBoost : 1);
        if (Math.random() * 60 > weight) {
            continue;
        }
        tryAdd(perk);
    }
    return offer;
}

export function computeStats(perkIds:Iterable<string>):PlayerStats {
    const stats = { ...BASE_STATS };
    for (const id of perkIds) {
        const perk = perkById.get(id);
        if (!perk) {
            continue;
        }
        for (const key of Object.keys(perk.mods) as (keyof PlayerStats)[]) {
            stats[key] += perk.mods[key] || 0;
        }
    }
    for (const key of Object.keys(STAT_LIMITS) as (keyof PlayerStats)[]) {
        const [min, max] = STAT_LIMITS[key]!;
        stats[key] = Math.max(min, Math.min(max, stats[key]));
    }
    stats.killBounty = Math.max(0, stats.killBounty);
    stats.teamShare = Math.max(0, stats.teamShare);
    return stats;
}
