export interface WorldConfig {
    size:number;
    seed:number;
    playerRadius:number;
    playerSpeed:number;
    viewWidth:number;
    viewHeight:number;
    // [id, вид, форма, x, y, радиус, ширина, высота, поворот, стиль, цел ли]
    obstacles:[number, string, "c" | "r", number, number, number, number, number, number, string, number][];
    map:{
        gridSize:number;
        cell:number;
        zone:string;
        zones:{ safe:number, wild:number, danger:number, toxic:number };
        zoneNames:string[];
        settlements:{ kind:string, name:string, x:number, y:number, w:number, h:number }[];
        roads:{ x:number, y:number, w:number, h:number }[];
    };
    items:Record<string, { name:string, kind:string, description:string }>;
    recipes:{ id:string, result:string, count:number, cost:Record<string, number> }[];
    weapons:Record<string, { id:string, name:string, rarity:string, fireRate:number, clipSize:number, melee:{ range:number, arc:number } | null }>;
    enemies:Record<string, { id:string, name:string, size:number, radius:number }>;
    perks:Record<string, { name:string, description:string, icon:string }>;
}

export interface PerkCard {
    id:string;
    name:string;
    description:string;
    rarity:"common" | "rare" | "epic";
    category:string;
    icon?:string;
}

export interface MeState {
    x:number;
    y:number;
    hp:number;
    maxHp:number;
    dead:boolean;
    canRespawn:boolean;
    exp:number;
    level:number;
    levelProgress:number;
    kills:number;
    weapon:string;
    tool:string;
    gun:string;
    gunAmmo:number;
    hint:string;
    ammo:number;
    clip:number;
    reloadLeft:number;
    reloadTotal:number;
    speed:number;
    fireInterval:number;
    spread:number;
    teamId:number;
    prot:boolean;
    offersLeft:number;
    offer:PerkCard[] | null;
    perks:string[];
    inv:({ id:string, n:number } | null)[];
    armor:string;
    mask:string;
    zone:number;
    toxic:boolean;
    place:string;
}

// [id, x, y, rotation, hp, maxHp, weaponId, protected]
export type NetPlayer = [number, number, number, number, number, number, string, number];
// [id, type, x, y, rotation, hp, maxHp, флаги: 1 идёт, 2 невидим, 4 рывок]
export type NetEnemy = [number, string, number, number, number, number, number, number];
// [id, kind, itemId, x, y, lifetimeLeftMs, count]
export type NetPickup = [number, string, string, number, number, number, number];
// [id, x, y, landsInMs] — аирдроп, 0 — уже на земле
export type NetChest = [number, number, number, number];
// [id, kind, x, y, vx, vy, left, size, ownerId]
export type NetBullet = [number, string, number, number, number, number, number, number, number];
export type NetFx = [string, number, number, number?, number?];

export interface Snapshot {
    t:number;
    me:MeState;
    p:NetPlayer[];
    e:NetEnemy[];
    k:NetPickup[];
    c:NetChest[];
    b:NetBullet[];
    fx:NetFx[];
}

export interface RosterRow {
    id:number;
    name:string;
    exp:number;
    level:number;
    kills:number;
    weapon:string;
    teamId:number;
    dead:boolean;
}

export interface Roster {
    rows:RosterRow[];
    teams:{ id:number, name:string, members:number[] }[];
    exposed:[number, number, number][];
    bosses:[number, number][];
    chests:[number, number, number][];
    mates:[number, number, number][];
}

export interface FeedEvent {
    killer:string;
    victim:string;
    weapon:string;
}

export interface Invite {
    fromId:number;
    fromName:string;
}

export interface HudState {
    connected:boolean;
    worldFull:boolean;
    myId:number;
    me:MeState | null;
    roster:Roster | null;
    feed:(FeedEvent & { key:number })[];
    invites:Invite[];
    announce:string;
    weapons:WorldConfig["weapons"];
    nearPickup:string;
    perkCatalog:WorldConfig["perks"];
    items:WorldConfig["items"];
    recipes:WorldConfig["recipes"];
    zoneNames:string[];
    zones:WorldConfig["map"]["zones"] | null;
}
