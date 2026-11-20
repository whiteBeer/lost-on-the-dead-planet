"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Profile, profileRequest } from "../../utils/profile";
import styles from "./shop.module.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function Shop() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const refresh = () => { setError(""); profileRequest().then(setProfile).catch(() => setError("Не удалось открыть профиль. Проверь соединение и разрешение на хранение данных браузера.")); };
    useEffect(refresh, []);
    const action = async (type:string, id:string) => {
        if (busy) return;
        setBusy(true); setError(""); setMessage("");
        try {
            setProfile(await profileRequest(type, id));
            setMessage(type === "buy" ? "Скин куплен. Теперь его можно надеть." : "Скин выбран для следующего матча.");
        } catch (failure) { setError(failure instanceof Error ? failure.message : "Покупка не прошла"); }
        finally { setBusy(false); }
    };

    return (
        <main className={styles.shop}>
            <header className={styles.heading}>
                <div><p>LOST ON THE DEAD PLANET</p><h1>Магазин выживших</h1></div>
                <div className={styles.wallet} aria-label="Монеты">◉ {profile?.coins ?? "…"}<small>монет на счету</small></div>
            </header>
            <div className={styles.intro}>
                <p>Скины меняют внешний вид, но не дают преимуществ в бою.</p>
                <p>За повышение до 2–5 уровня: 1 монета, до 6–10: 2, с 11-го: 3. Монеты сохраняются после поражения.</p>
                <button className={styles.secondary} onClick={() => router.push("/")}>В меню</button>
            </div>
            {error && <div role="alert" className={styles.error}>{error} {!profile && <button onClick={refresh}>Повторить</button>}</div>}
            <p role="status" className={styles.message}>{message}</p>
            {!profile && !error && <p>Открываем профиль…</p>}
            <div className={styles.grid}>
                {profile?.items.map(item => {
                    const owned = profile.owned.includes(item.id);
                    const equipped = profile.selected === item.id;
                    return (
                        <article key={item.id} className={`${styles.item} ${equipped ? styles.selected : ""}`}>
                            <div className={styles.portrait}><img className={item.id === "default" ? styles.sheet : ""} src={`${BASE}/img/${item.image}`} alt={item.name} /></div>
                            <h2>{item.name}</h2><p>{item.description}</p>
                            <span className={styles.price}>{owned ? "В коллекции" : `◉ ${item.price} монет`}</span>
                            <button disabled={busy || equipped || (!owned && profile.coins < item.price)} onClick={() => action(owned ? "equip" : "buy", item.id)}>
                                {equipped ? "Надето" : owned ? "Надеть" : "Купить"}
                            </button>
                        </article>
                    );
                })}
            </div>
            <p className={styles.note}>Профиль привязан к этому браузеру. Не очищай данные сайта, чтобы сохранить доступ к монетам и покупкам. На другом устройстве будет отдельный профиль.</p>
        </main>
    );
}
