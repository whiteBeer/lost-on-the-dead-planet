export interface WorldConfig {
    size:number;
    seed:number;
    playerRadius:number;
    playerSpeed:number;
    viewWidth:number;
    viewHeight:number;
    obstacles:[string, number, number, number, number][];
    weapons:Record<string, { id:string, name:string, rarity:string, fireRate:number, clipSize:number }>;
    enemies:Record<string, { id:string, name:string, size:number, radius:number }>;
    perks:Record<string, { name:string, description:string }>;
}

export interface PerkCard {
    id:string;
    name:string;
    description:string;
    rarity:"common" | "rare" | "epic";
    category:string;
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
}

// [id, x, y, rotation, hp, maxHp, weaponId, protected]
export type NetPlayer = [number, number, number, number, number, number, string, number];
// [id, type, x, y, rotation, hp, maxHp, moving]
export type NetEnemy = [number, string, number, number, number, number, number, number];
// [id, kind, weaponId, x, y]
export type NetPickup = [number, string, string, number, number];
// [id, kind, x, y, vx, vy, left, size, ownerId]
export type NetBullet = [number, string, number, number, number, number, number, number, number];
export type NetFx = [string, number, number, number?, number?];

export interface Snapshot {
    t:number;
    me:MeState;
    p:NetPlayer[];
    e:NetEnemy[];
    k:NetPickup[];
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
}
