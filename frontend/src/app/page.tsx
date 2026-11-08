"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import styles from "./page.module.css";

// Pixi работает только в браузере
const GameView = dynamic(() => import("../components/GameView"), { ssr: false });

function enterFullscreen() {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?:() => void };
    try {
        const result = el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen?.();
        Promise.resolve(result).catch(() => {});
    } catch {
        // iPhone не умеет: игра просто идёт в обычном окне
    }
}
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const NAME_KEY = "lpt-zombies-name";

function Main() {
    const [name, setName] = useState("");
    const [playing, setPlaying] = useState(false);
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        setName(localStorage.getItem(NAME_KEY) || "");
        setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    }, []);

    const start = (event:React.FormEvent) => {
        event.preventDefault();
        localStorage.setItem(NAME_KEY, name.trim());
        // Нажатие «Играть» — жест игрока, только по нему браузер разрешает убрать адресную строку
        enterFullscreen();
        if (isTouch) {
            (screen.orientation as ScreenOrientation & { lock?:(o:string) => Promise<void> })?.lock?.("landscape")?.catch(() => {});
        }
        setPlaying(true);
    };

    if (playing) {
        return <GameView name={name.trim()} />;
    }

    return (
        <main className={styles.menu} style={{ backgroundImage: `url(${BASE}/img/menu_bg.jpg)` }}>
            <form className={styles.card} onSubmit={start}>
                <h1 className={styles.title}>Lost on the Dead Planet</h1>
                <p className={styles.subtitle}>Открытый мир. Все против всех и против мертвецов.</p>
                <label className={styles.label} htmlFor="nick">Твоё имя</label>
                <input
                    id="nick"
                    className={styles.input}
                    value={name}
                    maxLength={16}
                    autoFocus
                    autoComplete="off"
                    placeholder="Выживший"
                    onChange={event => setName(event.target.value)}
                />
                <button className={styles.play} type="submit">Играть</button>
                {isTouch ? (
                    <ul className={styles.help}>
                        <li><b>Левая половина экрана</b>: бежать</li>
                        <li><b>Правая половина</b>: целиться и стрелять</li>
                        <li>Удобнее держать телефон горизонтально</li>
                    </ul>
                ) : (
                    <ul className={styles.help}>
                        <li><b>WASD</b> бежать, <b>мышь</b> целиться и стрелять</li>
                        <li><b>R</b> перезарядка, <b>E</b> подобрать, обыскать полку, вскрыть аирдроп</li>
                        <li><b>1</b> инструмент, <b>2</b> оружие, <b>Q</b> или <b>колесо</b> — быстро переключить</li>
                        <li><b>I</b> рюкзак и крафт, <b>H</b> лечение, <b>G</b> граната, <b>M</b> звук</li>
                        <li><b>1 2 3</b> выбрать перк, когда он предложен, <b>T</b> команда, <b>P</b> мои перки</li>
                    </ul>
                )}
                <p className={styles.note}>Ты начинаешь с ножом в безопасной зоне. Ресурсов мало: руби деревья и камни, скручивай верёвку из ткани, машины разбирай гаечным ключом. Следи за едой и водой, патроны берегут: их ищут на полках в домах. В аирдропах — перки, за них стоит драться. Смерть обнуляет уровень, перки и рюкзак: вещи остаются в сумке на месте гибели.</p>
            </form>
        </main>
    );
}

export default Main;
