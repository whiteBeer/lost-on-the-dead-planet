"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const ROOM_KEY = "wave-arena-room";

function Main() {
    const router = useRouter();
    const [room, setRoom] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        setRoom(localStorage.getItem(ROOM_KEY) || "");
    }, []);

    const go = (mode:"join" | "create") => {
        const name = room.trim();
        if (!/^[a-zA-Z0-9]{3,30}$/.test(name)) {
            setError("Имя комнаты: 3–30 символов, только латиница и цифры");
            return;
        }
        localStorage.setItem(ROOM_KEY, name);
        setError("");
        router.push("/rooms/" + name + (mode === "create" ? "?new=1" : ""));
    };

    return (
        <main className={styles.menu} style={{ backgroundImage: "url(/img/menu_bg.jpg)" }}>
            <form
                className={styles.card}
                onSubmit={(e) => {
                    e.preventDefault();
                    go("join");
                }}
            >
                <h1 className={styles.title}>Lost on the Dead Planet</h1>
                <p className={styles.subtitle}>Wave-арена. Держись вместе, чисти волны, бери перки.</p>

                <label className={styles.label} htmlFor="room">Имя комнаты</label>
                <input
                    id="room"
                    className={styles.input}
                    value={room}
                    maxLength={30}
                    autoFocus
                    autoComplete="off"
                    placeholder="arena01"
                    onChange={(e) => setRoom(e.target.value)}
                />

                <div className={styles.actions}>
                    <button className={styles.play} type="submit">Войти</button>
                    <button
                        className={styles.secondary}
                        type="button"
                        onClick={() => go("create")}
                    >
                        Создать
                    </button>
                </div>

                {error ? <p className={styles.error}>{error}</p> : null}

                <ul className={styles.help}>
                    <li><b>Создать</b> комнату → друзья жмут <b>Войти</b></li>
                    <li>Все — <b>Я готов</b>, хост жмёт <b>Поехали</b>. В уже идущую игру не пустят</li>
                    <li><b>WASD</b> бежать, <b>мышь</b> целиться · <b>R</b> перезарядка</li>
                    <li><b>Ctrl+1 2 3</b> перк · <b>Esc</b> пауза</li>
                </ul>
                <p className={styles.note}>
                    Волны нарастают сами. Зелёные слабее, жёлтые быстрее, красные толще.
                </p>
            </form>
        </main>
    );
}

export default Main;
