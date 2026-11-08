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

/** Полноэкранный режим без адресной строки. Работает только по жесту игрока (нажатие, касание). */
export function enterFullscreen() {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?:() => void };
    const doc = document as Document & { webkitFullscreenElement?:Element };
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
        return;
    }
    try {
        const result = el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen?.();
        // В полноэкранном режиме Chrome отдаёт игре Ctrl+1..3 (выбор перка), а не переключает вкладки
        Promise.resolve(result).then(() => (navigator as Navigator & { keyboard?:{ lock?:(keys:string[]) => Promise<void> } })
            .keyboard?.lock?.(["Digit1", "Digit2", "Digit3"])).catch(() => {});
    } catch {
        // Браузер не умеет (iPhone): остаётся обычный режим
    }
}

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
    const [tradeOpen, setTradeOpen] = useState(false);
    const [sprintOn, setSprintOn] = useState(false);

    const onUiKey = useCallback((code:string) => {
        if (code === "KeyT") {
            setTeamOpen(value => !value);
        } else if (code === "KeyP") {
            setPerksOpen(value => !value);
        } else if (code === "KeyI" || code === "Tab") {
            setInvOpen(value => !value);
        } else if (code === "OpenTrade") {
            setTradeOpen(value => !value);
        } else if (code === "Escape") {
            setTradeOpen(false);
            setInvOpen(false);
            setTeamOpen(false);
            setPerksOpen(false);
        }
    }, []);

    // Телефон: если вышли из полноэкранного режима, следующее касание снова прячет адресную строку
    useEffect(() => {
        if (!window.matchMedia("(pointer: coarse)").matches) {
            return;
        }
        const again = () => enterFullscreen();
        window.addEventListener("touchend", again);
        return () => window.removeEventListener("touchend", again);
    }, []);

    // Колесо мыши — смена инструмента и оружия
    useEffect(() => {
        let last = 0;
        const onWheel = (event:WheelEvent) => {
            if ((event.target as HTMLElement)?.tagName !== "CANVAS" || Date.now() - last < 200) {
                return;
            }
            last = Date.now();
            appRef.current?.switchSlot("swap");
        };
        window.addEventListener("wheel", onWheel, { passive: true });
        return () => window.removeEventListener("wheel", onWheel);
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
        // Аирдроп: в полёте мигает жёлтым, на земле — красный
        hud.roster?.chests.forEach(([x, y, left]) => dot(x, y, left > 0 ? (Date.now() % 1000 < 500 ? "#ffd34e" : "#ff9a2e") : "#ff4a2e", 5));
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
                        <div className={styles.slots}>
                            {(["tool", "gun"] as const).map((slot, index) => {
                                const id = slot === "tool" ? me.tool : me.gun;
                                const active = !!id && me.weapon === id;
                                return (
                                    <button
                                        key={slot}
                                        className={`${styles.myWeapon} ${active ? styles.slotActive : ""}`}
                                        title={slot === "tool" ? "Инструмент (1)" : "Оружие (2)"}
                                        onClick={() => app?.switchSlot(slot)}
                                    >
                                        <span className={styles.slotKey}>{index + 1}</span>
                                        {id ? <WeaponIcon id={id} className={styles.myWeaponIcon} /> : <span className={styles.myWeaponIcon} />}
                                        <div>
                                            <div className={styles.myWeaponName}>{id ? weaponName(id) : "нет оружия"}</div>
                                            <div className={styles.myWeaponAmmo}>
                                                {slot === "tool" ? "инструмент"
                                                    : !id ? "—"
                                                        : active && me.reloadLeft > 0 ? "Перезарядка..."
                                                            : `${active ? me.ammo : me.gunAmmo} / ${me.clip && active ? me.clip : hud?.weapons[id]?.clipSize} · запас ${me.reserve}`}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
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
                    <button className={styles.mute} title="Звук (M)" onClick={() => {
                        app?.sound.toggle();
                        setHud(value => value ? { ...value, muted: !value.muted } : value);
                    }}>{hud?.muted ? "🔇" : "🔊"}</button>

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
                        <div className={`${styles.barWrap} ${styles.barThin}`} title="Выносливость: бег (Shift) и рывок (Пробел)">
                            <div className={styles.barStamina} style={{ width: `${me.stamina}%` }} />
                            <span className={styles.barText}>Выносливость {me.stamina}</span>
                        </div>
                        <div className={styles.needs}>
                            <div className={`${styles.barWrap} ${styles.barSmall}`} title="Сытость: ешь консервы или мясо из рюкзака">
                                <div className={styles.barFood} style={{ width: `${me.food}%` }} />
                                <span className={styles.barText}>Еда {me.food}</span>
                            </div>
                            <div className={`${styles.barWrap} ${styles.barSmall}`} title="Вода: пей из рюкзака">
                                <div className={styles.barWater} style={{ width: `${me.water}%` }} />
                                <span className={styles.barText}>Вода {me.water}</span>
                            </div>
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

                    {me.hint && <div className={styles.hint}>{me.hint}</div>}

                    {me.wanted > 0 && (
                        <div className={styles.wanted}>
                            Тебя разыскивают лагеря: {Math.floor(me.wanted / 60000)}:{String(Math.floor(me.wanted / 1000) % 60).padStart(2, "0")}
                            <small> охрана стреляет, ты на миникарте у всех</small>
                        </div>
                    )}

                    <div className={styles.toasts}>
                        {hud?.toasts.map(toast => (
                            <div key={toast.key} className={styles.toast}>
                                <img src={itemImage(toast.id)} alt="" />{toast.text}
                            </div>
                        ))}
                    </div>

                    {!me.dead && (() => {
                        const count = (ids:string[]) => me.inv.reduce((sum, slot) => sum + (slot && ids.includes(slot.id) ? slot.n : 0), 0);
                        const heal = count(["medkit", "bandage"]);
                        const food = count(["canned", "meat"]);
                        const water = count(["water"]);
                        const grenades = count(["grenade"]);
                        return (
                            <div className={styles.quick}>
                                <button disabled={!heal} onClick={() => app?.heal()} title="Лечиться (H)">
                                    <img src={itemImage(count(["medkit"]) ? "medkit" : "bandage")} alt="" /><span>{heal}</span><b className={styles.desktopOnly}>H</b>
                                </button>
                                <button disabled={!food} onClick={() => app?.quickUse("food")} title="Съесть (F)">
                                    <img src={itemImage("canned")} alt="" /><span>{food}</span><b className={styles.desktopOnly}>F</b>
                                </button>
                                <button disabled={!water} onClick={() => app?.quickUse("water")} title="Выпить (V)">
                                    <img src={itemImage("water")} alt="" /><span>{water}</span><b className={styles.desktopOnly}>V</b>
                                </button>
                                <button disabled={!grenades} onClick={() => app?.grenade()} title="Бросить гранату (G)">
                                    <img src={itemImage("grenade")} alt="" /><span>{grenades}</span><b className={styles.desktopOnly}>G</b>
                                </button>
                            </div>
                        );
                    })()}

                    {hud?.nearPickup && (
                        <button className={styles.pickupHint} onClick={() => hud.nearPickup === "trader" ? setTradeOpen(value => !value) : app?.pickup()}>
                            {hud.nearPickup === "chest" ? (
                                <>
                                    <img src={imgUrl("chest")} className={styles.pickupIcon} alt="" />
                                    <span><b className={styles.desktopOnly}>E: </b>вскрыть аирдроп</span>
                                </>
                            ) : hud.nearPickup === "trader" ? (
                                <span><b className={styles.desktopOnly}>E: </b>торговать</span>
                            ) : hud.nearPickup.startsWith("item:") ? (
                                <>
                                    <img src={itemImage(hud.nearPickup.slice(5))} className={styles.pickupIcon} alt="" />
                                    <span><b className={styles.desktopOnly}>E: </b>подобрать {hud.items[hud.nearPickup.slice(5)]?.name}</span>
                                </>
                            ) : hud.nearPickup === "shelf" ? (
                                <span><b className={styles.desktopOnly}>E: </b>обыскать полку</span>
                            ) : hud.nearPickup.startsWith("bag:") ? (
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

                    {tradeOpen && hud?.nearPickup === "trader" && (() => {
                        const camp = hud.camps[hud.nearTraderCamp];
                        const offers = camp ? hud.trades[camp.tier] || [] : [];
                        const quests = camp ? hud.questCatalog[camp.tier] || [] : [];
                        const taken = new Map(me.quests);
                        const have = (id:string) => me.inv.reduce((sum, slot) => sum + (slot && slot.id === id ? slot.n : 0), 0);
                        const label = (id:string) => id === "hire" ? "Нанять наёмника на 8 минут"
                            : id.startsWith("w:") ? hud.weapons[id.slice(2)]?.name || id : hud.items[id]?.name || id;
                        return (
                            <section className={styles.trade}>
                                <h3>{camp?.name || "Торговец"} · монет: {have("coin")}</h3>
                                <p className={styles.muted}>Монстры сюда не заходят. Кто начнёт стрелять в лагере, станет врагом охраны на 30 минут.</p>
                                <h4 className={styles.subhead}>Задания</h4>
                                <ul>
                                    {quests.map(q => {
                                        const progress = taken.get(q.id);
                                        const done = progress !== undefined && (q.bring ? have(q.bring[0]) >= q.bring[1] : progress >= q.need);
                                        return (
                                            <li key={q.id}>
                                                <div>
                                                    <b>{q.text}</b>
                                                    <span>
                                                        награда: {q.reward[0]} монет, {q.reward[1]} опыта
                                                        {progress !== undefined && !q.bring ? ` · ${Math.min(progress, q.need)}/${q.need}` : ""}
                                                        {progress !== undefined && q.bring ? ` · есть ${have(q.bring[0])}/${q.bring[1]}` : ""}
                                                    </span>
                                                </div>
                                                {progress === undefined
                                                    ? <button className={styles.small} onClick={() => app?.quest(q.id, "take")}>Взять</button>
                                                    : <button className={styles.small} disabled={!done} onClick={() => app?.quest(q.id, "claim")}>Сдать</button>}
                                            </li>
                                        );
                                    })}
                                </ul>
                                <h4 className={styles.subhead}>Товары</h4>
                                <ul>
                                    {offers.map(offer => {
                                        const can = Object.entries(offer.give).every(([id, n]) => have(id) >= n);
                                        return (
                                            <li key={offer.id}>
                                                <img src={offer.get[0] === "hire" ? imgUrl("weapon_Rifle") : itemImage(offer.get[0])} alt="" />
                                                <div>
                                                    <b>{label(offer.get[0])}{offer.get[1] > 1 ? ` ×${offer.get[1]}` : ""}</b>
                                                    <span>за {Object.entries(offer.give).map(([id, n]) => `${label(id)} ${have(id)}/${n}`).join(", ")}</span>
                                                </div>
                                                <button className={styles.small} disabled={!can} onClick={() => app?.trade(offer.id)}>Обменять</button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <button className={styles.secondary} onClick={() => setTradeOpen(false)}>Закрыть</button>
                            </section>
                        );
                    })()}

                    {!me.dead && (
                        <>
                            <button className={styles.dashButton} onClick={() => app?.dash()}>Рывок</button>
                            <button className={`${styles.sprintButton} ${sprintOn ? styles.sprintOn : ""}`} onClick={() => {
                                app?.setSprintToggle(!sprintOn);
                                setSprintOn(!sprintOn);
                            }}>Бег</button>
                        </>
                    )}

                    {!me.dead && (
                        <button className={styles.swapButton} onClick={() => app?.switchSlot("swap")}>
                            ⇄<span>{me.gun && me.weapon === me.gun ? "Инструмент" : "Оружие"}</span>
                        </button>
                    )}

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
                                <small> Ctrl+цифра или клик · читай внимательно, бой идёт</small>
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
                            {me.level > 1 && (
                                <p className={styles.muted}>
                                    Бонус {me.level} уровня: урон +{me.levelBonus[0]}%, здоровье +{me.levelBonus[1]}, защита +{me.levelBonus[2]}%.
                                    Растёт с каждым уровнем.
                                </p>
                            )}
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
                            {me.killedBy && <p className={styles.killedBy}>Причина: {me.killedBy}</p>}
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
