"use client";

import React, { useState } from "react";
import { App } from "../game/App";
import { itemImage } from "../game/Assets";
import { HudState } from "../game/Types";
import styles from "./Inventory.module.css";

interface Props {
    hud:HudState;
    app:App | null;
    onClose:() => void;
}

function Inventory({ hud, app, onClose }:Props) {
    const [selected, setSelected] = useState<number | null>(null);
    const [dragFrom, setDragFrom] = useState<number | null>(null);
    // Тап по предмету выделяет его, тап по другой ячейке перекладывает, тап по ячейке снаряжения — надевает
    const tapSlot = (index:number) => {
        const stack = me.inv[index];
        if (selected !== null && selected !== index && me.inv[selected]) {
            app?.moveSlot(selected, index);
            setSelected(stack ? index : null);
            return;
        }
        setSelected(stack ? index : null);
    };
    const equipSelected = (from:number | null) => {
        if (from !== null && me.inv[from]) {
            app?.useSlot(from);
            setSelected(null);
            return true;
        }
        return false;
    };
    const dropTarget = (onDrop:(from:number) => void) => ({
        onDragOver: (e:React.DragEvent) => e.preventDefault(),
        onDrop: (e:React.DragEvent) => {
            e.preventDefault();
            if (dragFrom !== null) {
                onDrop(dragFrom);
            }
            setDragFrom(null);
        }
    });
    const me = hud.me!;
    const nameOf = (id:string) => id.startsWith("w:")
        ? hud.weapons[id.slice(2)]?.name || id
        : hud.items[id]?.name || id;
    const describe = (id:string) => id.startsWith("w:")
        ? (hud.weapons[id.slice(2)]?.melee
            ? "Инструмент или холодное оружие: встаёт в слот 1, прежний уйдёт в рюкзак."
            : "Оружие: встаёт в слот 2, прежнее уйдёт в рюкзак.")
        : hud.items[id]?.description || "";
    const have = (id:string) => me.inv.reduce((sum, slot) => sum + (slot && slot.id === id ? slot.n : 0), 0);
    const slot = selected !== null ? me.inv[selected] : null;
    const kind = slot ? (slot.id.startsWith("w:") ? "weapon" : hud.items[slot.id]?.kind) : "";
    const info = slot ? hud.items[slot.id] : undefined;
    const actionText = kind === "weapon" ? "Взять в руки" : kind === "armor" || kind === "mask" ? "Надеть"
        : info?.food ? "Съесть" : info?.water ? "Выпить" : kind === "use" ? "Использовать" : "";

    return (
        <section className={styles.panel}>
            <header className={styles.header}>
                <h3>Рюкзак</h3>
                <button className={styles.close} onClick={onClose}>Закрыть</button>
            </header>

            <div className={styles.columns}>
                <div className={styles.left}>
                    <div className={styles.equip}>
                        <button className={styles.equipSlot} title="Перетащи сюда инструмент или нажми, чтобы убрать в рюкзак"
                            {...dropTarget(from => app?.useSlot(from))}
                            onClick={() => equipSelected(selected) || app?.unequip("tool")}>
                            <img src={itemImage(`w:${me.tool}`)} alt="" />
                            <span>{hud.weapons[me.tool]?.name}</span>
                        </button>
                        <button className={styles.equipSlot} title="Перетащи сюда оружие или нажми, чтобы убрать в рюкзак"
                            {...dropTarget(from => app?.useSlot(from))}
                            onClick={() => equipSelected(selected) || (me.gun && app?.unequip("gun"))}>
                            {me.gun ? <img src={itemImage(`w:${me.gun}`)} alt="" /> : <i>оружие</i>}
                            <span>{me.gun ? hud.weapons[me.gun]?.name : "нет оружия"}</span>
                        </button>
                        <button className={styles.equipSlot} title="Перетащи сюда броню или нажми, чтобы снять"
                            {...dropTarget(from => app?.useSlot(from))}
                            onClick={() => equipSelected(selected) || (me.armor && app?.unequip("armor"))}>
                            {me.armor ? <img src={itemImage(me.armor)} alt="" /> : <i>броня</i>}
                            <span>{me.armor ? nameOf(me.armor) : "нет брони"}</span>
                        </button>
                        <button className={styles.equipSlot} title="Перетащи сюда противогаз или нажми, чтобы снять"
                            {...dropTarget(from => app?.useSlot(from))}
                            onClick={() => equipSelected(selected) || (me.mask && app?.unequip("mask"))}>
                            {me.mask ? <img src={itemImage(me.mask)} alt="" /> : <i>маска</i>}
                            <span>{me.mask ? nameOf(me.mask) : "нет маски"}</span>
                        </button>
                    </div>

                    <div className={styles.grid}>
                        {me.inv.map((stack, index) => (
                            <button
                                key={index}
                                className={`${styles.slot} ${selected === index ? styles.selected : ""}`}
                                onClick={() => tapSlot(index)}
                                draggable={!!stack}
                                onDragStart={() => setDragFrom(index)}
                                {...dropTarget(from => app?.moveSlot(from, index))}
                            >
                                {stack && <img src={itemImage(stack.id)} alt="" draggable={false} />}
                                {stack && stack.n > 1 && <span className={styles.count}>{stack.n}</span>}
                            </button>
                        ))}
                    </div>

                    {slot ? (
                        <div className={styles.details}>
                            <b>{nameOf(slot.id)}{slot.n > 1 ? ` ×${slot.n}` : ""}{slot.a !== undefined ? ` · в магазине ${slot.a}` : ""}</b>
                            <p>{describe(slot.id)}</p>
                            <div className={styles.actions}>
                                {actionText && <button className={styles.primary} onClick={() => app?.useSlot(selected!)}>{actionText}</button>}
                                <button className={styles.secondary} onClick={() => {
                                    app?.dropSlot(selected!);
                                    setSelected(null);
                                }}>Выбросить</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className={styles.shortHint}>Нажми на предмет — появятся действия. Нажми предмет, потом пустую ячейку — переложишь.</p>
                            <p className={styles.hint}>Перетаскивай предметы мышью. На телефоне: нажми на предмет, потом на ячейку, куда его положить, или на ячейку снаряжения, чтобы надеть. Ресурсы добываются ударами по деревьям и камням, машины разбираются гаечным ключом. Ещё ресурсы падают с монстров и из ящиков.</p>
                        </>
                    )}
                </div>

                <div className={styles.right}>
                    <h4>Создать</h4>
                    <ul className={styles.recipes}>
                        {hud.recipes.map((recipe) => {
                            const can = Object.entries(recipe.cost).every(([id, need]) => have(id) >= need);
                            return (
                                <li key={recipe.id} className={can ? styles.can : ""}>
                                    <img src={itemImage(recipe.result)} alt="" />
                                    <div className={styles.recipeText}>
                                        <b>{nameOf(recipe.result)}{recipe.count > 1 ? ` ×${recipe.count}` : ""}</b>
                                        <span>
                                            {Object.entries(recipe.cost).map(([id, need]) => (
                                                <em key={id} className={have(id) >= need ? styles.enough : styles.lack}>
                                                    {nameOf(id)} {have(id)}/{need}
                                                </em>
                                            ))}
                                        </span>
                                    </div>
                                    <button className={styles.make} disabled={!can} onClick={() => app?.craft(recipe.id)}>Создать</button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </section>
    );
}

export default Inventory;
