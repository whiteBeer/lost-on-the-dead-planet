import React from "react";
import { BackendWeaponState } from "../pixi-app/Types";
import styles from "./WeaponHud.module.css";

export default function WeaponHud({ weapon, name, basePath }:{ weapon:BackendWeaponState; name:string; basePath:string }) {
    const clip = Math.max(1, weapon.clipSize);
    const ammo = Math.max(0, weapon.ammo);
    const low = ammo <= Math.max(1, Math.floor(clip * 0.2));
    const tier = ["I", "II", "III", "IV", "V"][Math.max(0, Math.min(4, weapon.level - 1))];
    const status = weapon.isReloading ? "Перезарядка…" : ammo === 0 ? "Магазин пуст" : "Готово к бою";

    return (
        <section aria-label="Текущее оружие" className={`${styles.card} ${low ? styles.low : ""} ${weapon.isReloading ? styles.reloading : ""}`}>
            <header><span>Оружие</span><b>Ур. {tier}</b></header>
            <div className={styles.body}>
                <div className={styles.icon}><img src={`${basePath}/img/weapon_${weapon.id}.png`} alt={name} draggable={false} /></div>
                <div className={styles.details}>
                    <h2>{name}</h2>
                    <strong className={styles.ammo} aria-label="Патроны">{ammo}<span> / {clip}</span></strong>
                </div>
            </div>
            <div className={styles.magazine} role="meter" aria-label="Магазин" aria-valuemin={0} aria-valuemax={clip} aria-valuenow={ammo}>
                <i style={{ width: `${Math.min(100, ammo / clip * 100)}%` }} />
            </div>
            <footer><span>Запас ∞</span><span aria-live="polite">{status}</span></footer>
        </section>
    );
}
