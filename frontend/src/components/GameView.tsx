"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { App } from "../game/App";
import { imgUrl } from "../game/Assets";
import { HudState } from "../game/Types";
import styles from "./GameView.module.css";
import Inventory from "./Inventory";
import { itemImage } from "../game/Assets";

const ZONE_COLORS = ["#8ff06a", "#e8d36a", "#f0954e", "#ff5a5a"];

const RARITY_TEXT:Record<string, string> = { common: "обычный", rare: "редкий", epic: "эпический" };
const WEAPON_RARITY_TEXT:Record<string, string> = {
    common: "обычное", uncommon: "необычное", rare: "редкое", epic: "эпическое", legendary: "легендарное"
};

function WeaponIcon({ id, className }:{ id:string, className?:string }) {
    return id ? <img className={className} src={imgUrl(`weapon_${id}`)} alt="" draggable={false} /> : null;
}

function PerkIcon({ icon, className }:{ icon?:string, className?:string }) {
    return icon ? <img className={className} src={imgUrl(icon)} alt="" draggable={false} /> : null;
}

function GameView({ name }:{ name:string }) {
    const hostRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<App | null>(null);
    const miniRef = useRef<HTMLCanvasElement>(null);
    const [hud, setHud] = useState<HudState | null>(null);
    const [teamOpen, setTeamOpen] = useState(false);
    const [perksOpen, setPerksOpen] = useState(false);
    const [invOpen, setInvOpen] = useState(false);

    const onUiKey = useCallback((code:string) => {
        if (code === "KeyT") {
            setTeamOpen(value => !value);
        } else if (code === "KeyP") {
            setPerksOpen(value => !value);
        } else if (code === "KeyI" || code === "Tab") {
            setInvOpen(value => !value);
        } else if (code === "Escape") {
            setInvOpen(false);
            setTeamOpen(false);
            setPerksOpen(false);
        }
    }, []);

    useEffect(() => {
        if (!hostRef.current) {
            return;
        }
        const app = new App(hostRef.current, name, setHud, onUiKey);
        appRef.current = app;
        app.init().catch(error => console.error("Game init failed", error));
        return () => {
            app.destroy();
            appRef.current = null;
        };
    }, [name, onUiKey]);

    useEffect(() => {
        const canvas = miniRef.current;
        const app = appRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !app || !ctx || !hud?.me) {
            return;
        }
        const pos = app.getPosition();
        const k = canvas.width / pos.size;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const terrain = app.getMinimap();
        if (terrain) {
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(terrain, 0, 0, canvas.width, canvas.height);
        }
        const dot = (x:number, y:number, color:string, radius:number) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x * k, y * k, radius, 0, Math.PI * 2);
            ctx.fill();
        };
        hud.roster?.bosses.forEach(([x, y]) => dot(x, y, "#ff7a1a", 6));
        hud.roster?.chests.forEach(([x, y]) => dot(x, y, "#ffd34e", 5));
        hud.roster?.exposed.forEach(([id, x, y]) => {
            if (id !== hud.myId) {
                dot(x, y, "#ff5a5a", 3.5);
            }
        });
        hud.roster?.mates.forEach(([, x, y]) => dot(x, y, "#8ff06a", 3.5));
        dot(pos.x, pos.y, "#ffffff", 3.5);
    }, [hud]);

    const app = appRef.current;
    const me = hud?.me;
    const rows = hud?.roster?.rows || [];
    const myRank = rows.findIndex(row => row.id === hud?.myId);
    const myTeam = hud?.roster?.teams.find(team => team.id === me?.teamId);
    const nameOf = (id:number) => rows.find(row => row.id === id)?.name || "...";
    const weaponName = (id:string) => hud?.weapons[id]?.name || id;
    const currentWeapon = me ? hud?.weapons[me.weapon] : undefined;

    return (
        <div className={styles.root}>
            <div ref={hostRef} className={styles.canvas} />

            {!hud?.me && !hud?.worldFull && hud?.connected !== false && <div className={styles.center}>Загрузка мира...</div>}
            {hud?.connected === false && !hud.worldFull && (
                <div className={styles.overlay}>
                    <h2>Нет связи с сервером</h2>
                    <button className={styles.primary} onClick={() => location.reload()}>Подключиться снова</button>
                </div>
            )}
            {hud?.worldFull && (
                <div className={styles.overlay}>
                    <h2>Мир сейчас заполнен</h2>
                    <button className={styles.primary} onClick={() => location.reload()}>Попробовать снова</button>
                </div>
            )}

            {me && (
                <>
                    <section className={styles.board}>
                        <h3 className={styles.boardTitle}>Рейтинг по опыту</h3>
                        <ol className={styles.boardList}>
                            {rows.slice(0, 10).map((row, index) => {
                                const isMe = row.id === hud?.myId;
                                const isMate = !!me.teamId && row.teamId === me.teamId && !isMe;
                                return (
                                    <li key={row.id} className={`${styles.boardRow} ${isMe ? styles.rowMe : ""} ${isMate ? styles.rowMate : ""} ${row.dead ? styles.rowDead : ""}`}>
                                        <span className={styles.rank}>{index + 1}</span>
                                        <span className={styles.boardName} title={row.name}>{row.name}</span>
                                        <WeaponIcon id={row.weapon} className={styles.boardWeapon} />
                                        <span className={styles.boardExp}>{row.exp}</span>
                                    </li>
                                );
                            })}
                        </ol>
                        {myRank >= 10 && (
                            <div className={`${styles.boardRow} ${styles.rowMe}`}>
                                <span className={styles.rank}>{myRank + 1}</span>
                                <span className={styles.boardName}>{rows[myRank].name}</span>
                                <WeaponIcon id={rows[myRank].weapon} className={styles.boardWeapon} />
                                <span className={styles.boardExp}>{rows[myRank].exp}</span>
                            </div>
                        )}
                        <div className={styles.myWeapon}>
                            <WeaponIcon id={me.weapon} className={styles.myWeaponIcon} />
                            <div>
                                <div className={styles.myWeaponName}>{currentWeapon?.name}</div>
                                <div className={styles.myWeaponAmmo}>
                                    {hud?.weapons[me.weapon]?.melee ? "ближний бой" : me.reloadLeft > 0 ? "Перезарядка..." : `${me.ammo} / ${me.clip}`}
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className={styles.feed}>
                        {hud?.feed.map(event => (
                            <div key={event.key} className={styles.feedRow}>
                                {event.killer
                                    ? <><b>{event.killer}</b> убил(а) <b>{event.victim}</b></>
                                    : <><b>{event.victim}</b> погиб(ла) от монстров</>}
                            </div>
                        ))}
                    </div>

                    {hud?.announce && <div className={styles.announce}>{hud.announce}</div>}

                    <canvas ref={miniRef} className={styles.mini} width={170} height={170} />

                    <section className={styles.stats}>
                        <div className={styles.level}>
                            <span className={styles.levelBadge}>{me.level}</span>
                            <div className={styles.barWrap}>
                                <div className={styles.barExp} style={{ width: `${me.levelProgress * 100}%` }} />
                                <span className={styles.barText}>Опыт {me.exp}</span>
                            </div>
                        </div>
                        <div className={styles.barWrap}>
                            <div className={styles.barHp} style={{ width: `${me.hp / me.maxHp * 100}%` }} />
                            <span className={styles.barText}>{me.hp} / {me.maxHp}</span>
                        </div>
                        {me.prot && <div className={styles.protect}>Защита после появления: пропадёт после первого выстрела</div>}
                        {hud?.zones && (() => {
                            const z = hud.zones;
                            const level = me.zone < z.safe ? 0 : me.zone < z.wild ? 1 : me.zone < z.danger ? 2 : 3;
                            return (
                                <div className={styles.zone} style={{ color: ZONE_COLORS[level] }}>
                                    {hud.zoneNames[level]}{me.place ? ` · ${me.place}` : ""}
                                    {me.toxic && <b className={styles.toxic}> Ядовитый воздух! Нужен противогаз</b>}
                                </div>
                            );
                        })()}
                    </section>

                    {hud?.nearPickup && (
                        <button className={styles.pickupHint} onClick={() => app?.pickup()}>
                            {hud.nearPickup.startsWith("bag:") ? (
                                <>
                                    <img src={itemImage("bag")} className={styles.pickupIcon} alt="" />
                                    <span><b className={styles.desktopOnly}>E: </b>обыскать сумку {hud.nearPickup.slice(4)}</span>
                                </>
                            ) : (
                                <>
                                    <WeaponIcon id={hud.nearPickup} className={styles.pickupIcon} />
                                    <span>
                                        <b className={styles.desktopOnly}>E: </b>взять {weaponName(hud.nearPickup)}
                                        {" "}({WEAPON_RARITY_TEXT[hud.weapons[hud.nearPickup]?.rarity]})
                                    </span>
                                </>
                            )}
                        </button>
                    )}

                    {invOpen && hud && <Inventory hud={hud} app={app} onClose={() => setInvOpen(false)} />}

                    {!me.dead && (
                        <div className={styles.touchButtons}>
                            <button onClick={() => setInvOpen(value => !value)}>Рюкзак</button>
                            <button onClick={() => app?.heal()}>Лечиться</button>
                            <button onClick={() => app?.reload()}>Перезарядка</button>
                            <button onClick={() => setTeamOpen(value => !value)}>Команда</button>
                            <button onClick={() => setPerksOpen(value => !value)}>Перки</button>
                        </div>
                    )}

                    {me.offer && !me.dead && (
                        <section className={styles.perks}>
                            <h3 className={styles.perksTitle}>
                                Выбери перк{me.offersLeft > 1 ? ` (ещё выборов: ${me.offersLeft - 1})` : ""}
                                <small> читай внимательно, бой идёт</small>
                            </h3>
                            <div className={styles.perkRow}>
                                {me.offer.map((card, index) => (
                                    <button
                                        key={card.id}
                                        className={`${styles.perkCard} ${styles["rarity_" + card.rarity]}`}
                                        onClick={() => app?.pickPerk(index)}
                                    >
                                        <span className={styles.perkKey}>{index + 1}</span>
                                        <span className={styles.perkRarity}>{RARITY_TEXT[card.rarity]}</span>
                                        <PerkIcon icon={card.icon} className={styles.perkIcon} />
                                        <span className={styles.perkName}>{card.name}</span>
                                        <span className={styles.perkText}>{card.description}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {perksOpen && (
                        <section className={styles.side}>
                            <h3>Мои перки: {me.perks.length}</h3>
                            {me.perks.length === 0 && <p className={styles.muted}>Пока пусто. Перки даются за новый уровень.</p>}
                            <ul className={styles.perkList}>
                                {me.perks.map(id => (
                                    <li key={id}>
                                        <PerkIcon icon={hud?.perkCatalog[id]?.icon} className={styles.perkListIcon} />
                                        <div>
                                            <b>{hud?.perkCatalog[id]?.name}</b>
                                            <p>{hud?.perkCatalog[id]?.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <p className={styles.muted}>Всего перков в игре: {Object.keys(hud?.perkCatalog || {}).length}.</p>
                            <button className={styles.secondary} onClick={() => setPerksOpen(false)}>Закрыть</button>
                        </section>
                    )}

                    {teamOpen && (
                        <section className={styles.side}>
                            <h3>{myTeam ? myTeam.name : "Команда"}</h3>
                            {myTeam ? (
                                <>
                                    <ul className={styles.teamList}>
                                        {myTeam.members.map(id => <li key={id}>{nameOf(id)}{id === hud?.myId ? " (ты)" : ""}</li>)}
                                    </ul>
                                    <button className={styles.secondary} onClick={() => app?.leaveTeam()}>Выйти из команды</button>
                                </>
                            ) : <p className={styles.muted}>Союзники не ранят друг друга и получают часть опыта за убийства рядом.</p>}
                            <h4 className={styles.subhead}>Игроки в мире</h4>
                            <ul className={styles.teamList}>
                                {rows.filter(row => row.id !== hud?.myId && (!me.teamId || row.teamId !== me.teamId)).slice(0, 40).map(row => (
                                    <li key={row.id} className={styles.teamRow}>
                                        <span className={styles.boardName}>{row.name}</span>
                                        <button className={styles.small} onClick={() => app?.invite(row.id)}>Позвать</button>
                                    </li>
                                ))}
                            </ul>
                            {rows.length <= 1 && <p className={styles.muted}>Кроме тебя в мире пока никого нет.</p>}
                            <button className={styles.secondary} onClick={() => setTeamOpen(false)}>Закрыть</button>
                        </section>
                    )}

                    {hud && hud.invites.length > 0 && (
                        <div className={styles.invite}>
                            <p><b>{hud.invites[0].fromName}</b> зовёт тебя в команду</p>
                            <div className={styles.inviteButtons}>
                                <button className={styles.primary} onClick={() => app?.acceptInvite(hud.invites[0].fromId)}>Принять (Y)</button>
                                <button className={styles.secondary} onClick={() => app?.declineInvite(hud.invites[0].fromId)}>Отказать (N)</button>
                            </div>
                        </div>
                    )}

                    {me.dead && (
                        <div className={styles.overlay}>
                            <h2>Ты погиб</h2>
                            <p>Опыт за эту жизнь: {me.exp}, уровень {me.level}, убийств: {me.kills}</p>
                            <button className={styles.primary} disabled={!me.canRespawn} onClick={() => app?.respawn()}>
                                {me.canRespawn ? "Вернуться в мир" : "Подожди немного..."}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default GameView;
