"use client";

import React, { useEffect, useRef, useState } from "react";
import { App as PixiAPP } from "../../../pixi-app/App";
import axios from "axios";
import styles from "./index.module.css";
import { useParams, useRouter } from "next/navigation";

import { BackendPerkOffer, BackendPlayer } from "../../../pixi-app/Types";

const RARITY_TEXT:Record<string, string> = {
    common: "обычный",
    rare: "редкий",
    epic: "эпический"
};

interface DeathInfo {
    level:number;
    exp:number;
}

function Room() {
    const router = useRouter();
    const params = useParams();
    const roomId = String(params["room-name"] ?? "");
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    const apiBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH || "";
    const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const appRef = useRef<PixiAPP | null>(null);
    const [perkOffer, setPerkOffer] = useState<BackendPerkOffer[] | null>(null);
    const [pauseOpen, setPauseOpen] = useState(false);
    const [dead, setDead] = useState<DeathInfo | null>(null);
    const [arenaOver, setArenaOver] = useState(false);
    const [phase, setPhase] = useState<"lobby" | "playing">("lobby");
    const [lobbyPlayers, setLobbyPlayers] = useState<BackendPlayer[]>([]);
    const [meReady, setMeReady] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [canStart, setCanStart] = useState(false);
    const [hostSocketId, setHostSocketId] = useState<string | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);

    const mainMenu = () => {
        router.push("/");
    };

    const newGame = async () => {
        setPauseOpen(false);
        setDead(null);
        setArenaOver(false);
        setPerkOffer(null);
        setMeReady(false);
        setPhase("lobby");
        await axios.put(backendUrl + apiBasePath + "/api/rooms/" + roomId + "/new-game");
        setTimeout(() => {
            appRef.current?.meRespawn();
        }, 400);
    };

    const pickPerk = (perkId:string) => {
        appRef.current?.pickPerk(perkId);
        setPerkOffer(null);
    };

    const toggleReady = () => {
        const next = !meReady;
        setMeReady(next);
        appRef.current?.setReady(next);
    };

    useEffect(() => {
        (async () => {
            const $el = document?.getElementById("game");
            if ($el) {
                appRef.current = new PixiAPP($el);
                appRef.current.onPerkOffer(setPerkOffer);
                appRef.current.onDeath((info) => {
                    setDead(info);
                    setPauseOpen(false);
                    setPerkOffer(null);
                });
                appRef.current.onArenaOver(() => {
                    setArenaOver(true);
                    setPerkOffer(null);
                });
                appRef.current.onLobby((state) => {
                    setPhase(state.phase);
                    setLobbyPlayers(state.players);
                    setMeReady(state.meReady);
                    setIsHost(state.isHost);
                    setCanStart(state.canStart);
                    setHostSocketId(state.hostSocketId);
                    if (state.phase === "playing") {
                        setDead(null);
                        setArenaOver(false);
                    }
                });
                appRef.current.onJoinRejected((info) => {
                    setJoinError(info.message);
                });
                appRef.current.onPause((paused) => {
                    setPauseOpen(paused);
                });
                await appRef.current.init();
                $el.appendChild(appRef.current.getView());
            }
        })();

        return () => {
            appRef.current && appRef.current.destroy();
            appRef.current = null;
        };
    }, []);

    const togglePause = () => {
        appRef.current?.togglePause();
    };

    useEffect(() => {
        const onKey = (e:KeyboardEvent) => {
            if (e.code === "Escape") {
                e.preventDefault();
                if (dead || phase === "lobby" || joinError) return;
                togglePause();
                return;
            }
            if (!perkOffer?.length || !e.ctrlKey) return;
            const index = Number(e.key) - 1;
            if (index >= 0 && index < perkOffer.length) {
                e.preventDefault();
                pickPerk(perkOffer[index].id);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [perkOffer, dead, phase, joinError]);

    const readyCount = lobbyPlayers.filter(p => p.isReady).length;

    return (
        <div className={styles.wrap}>
            <div id="game" className={styles.game}></div>

            {joinError && (
                <div className={styles.overlay}>
                    <h2>Нельзя войти</h2>
                    <p className={styles.deathHint}>{joinError}</p>
                    <button className={styles.primary} onClick={mainMenu}>
                        В меню
                    </button>
                </div>
            )}

            {!joinError && phase === "lobby" && !dead && (
                <div className={`${styles.overlay} ${styles.pauseOverlay}`}>
                    <div className={styles.pauseCard}>
                        <h2>Лобби</h2>
                        <p className={styles.lobbyHint}>
                            Комната <b>{roomId}</b>
                            <br />
                            {lobbyPlayers.length <= 1
                                ? "Ты один — можно сразу жать «Поехали»"
                                : `Готовы: ${readyCount}/${lobbyPlayers.length}`}
                        </p>
                        <ul className={styles.lobbyList}>
                            {lobbyPlayers.map((p, i) => (
                                <li key={p.socketId} className={styles.lobbyItem}>
                                    <span
                                        className={styles.lobbyDot}
                                        style={{ background: p.color || "#888" }}
                                    />
                                    Игрок {i + 1}
                                    {p.socketId === hostSocketId ? " · хост" : ""}
                                    <span className={p.isReady ? styles.readyYes : styles.readyNo}>
                                        {lobbyPlayers.length === 1
                                            ? "хост"
                                            : (p.isReady ? "готов" : "ждёт")}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {lobbyPlayers.length > 1 && (
                            <button
                                className={meReady ? styles.secondary : styles.primary}
                                onClick={toggleReady}
                            >
                                {meReady ? "Не готов" : "Я готов"}
                            </button>
                        )}
                        {isHost ? (
                            <button
                                className={styles.primary}
                                disabled={!canStart}
                                onClick={() => appRef.current?.startGame()}
                            >
                                Поехали
                            </button>
                        ) : (
                            <p className={styles.lobbyHint}>
                                {canStart
                                    ? "Все готовы — ждём хоста"
                                    : "Ждём, пока все нажмут «Я готов»"}
                            </p>
                        )}
                        <button className={styles.secondary} onClick={mainMenu}>
                            В меню
                        </button>
                    </div>
                </div>
            )}

            {perkOffer && perkOffer.length > 0 && !dead && phase === "playing" && (
                <section className={styles.perks}>
                    <h3 className={styles.perksTitle}>
                        Выбери перк
                        <small> Ctrl+цифра или клик · читай внимательно, бой идёт</small>
                    </h3>
                    <div className={styles.perkRow}>
                        {perkOffer.map((card, index) => (
                            <button
                                key={card.id}
                                className={`${styles.perkCard} ${styles["rarity_" + card.rarity] || ""}`}
                                onClick={() => pickPerk(card.id)}
                            >
                                <span className={styles.perkKey}>{index + 1}</span>
                                <span className={styles.perkRarity}>
                                    {RARITY_TEXT[card.rarity] || card.rarity}
                                </span>
                                {card.icon ? (
                                    <img
                                        className={styles.perkIcon}
                                        src={`${publicBasePath}/img/${card.icon}.png`}
                                        alt=""
                                    />
                                ) : null}
                                <span className={styles.perkName}>{card.name}</span>
                                <span className={styles.perkText}>{card.description}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {dead && (
                <div className={styles.overlay}>
                    <h2>Ты погиб</h2>
                    <p>Опыт за эту жизнь: {dead.exp}, уровень {dead.level}</p>
                    {arenaOver ? (
                        <>
                            <p className={styles.deathHint}>Все погибли — волны сброшены.</p>
                            <button className={styles.primary} onClick={newGame}>
                                Начать заново
                            </button>
                        </>
                    ) : (
                        <p className={styles.deathHint}>Жди команду… бой ещё идёт.</p>
                    )}
                    <button className={styles.secondary} onClick={mainMenu}>
                        В меню
                    </button>
                </div>
            )}

            {!dead && arenaOver && (
                <div className={styles.overlay}>
                    <h2>Арена очищена</h2>
                    <p className={styles.deathHint}>Все игроки вышли. Волны сброшены.</p>
                    <button className={styles.primary} onClick={newGame}>
                        Начать заново
                    </button>
                    <button className={styles.secondary} onClick={mainMenu}>
                        В меню
                    </button>
                </div>
            )}

            {pauseOpen && !dead && phase === "playing" && (
                <div className={`${styles.overlay} ${styles.pauseOverlay}`}>
                    <div className={styles.pauseCard}>
                        <h2>Пауза</h2>
                        <button className={styles.primary} onClick={togglePause}>
                            Продолжить
                        </button>
                        <button className={styles.secondary} onClick={newGame}>
                            Начать заново
                        </button>
                        <button className={styles.secondary} onClick={mainMenu}>
                            В меню
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Room;
