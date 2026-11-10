import * as PIXI from "pixi.js";
import { App } from "../App";
import Player from "./players/Player";
import { BackendPerkOffer } from "../Types";

interface WaveBanner {
    root:PIXI.Container;
    text:PIXI.Text;
    life:number;
    phase:"in" | "hold" | "out";
}

export class Hud {
    private readonly app:App;
    private readonly mePlayer:Player;

    private pixiObj:PIXI.Container;
    private readonly waveText:PIXI.Text;
    private readonly statusText:PIXI.Text;
    private readonly hintText:PIXI.Text;
    private wave = 0;
    private banner:WaveBanner | null = null;

    constructor(app:App, mePlayer:Player) {
        this.app = app;
        this.mePlayer = mePlayer;

        this.waveText = new PIXI.Text({
            text: "ВОЛНА —",
            style: {
                fill: 0xfff07a,
                fontSize: 28,
                fontFamily: "Segoe UI, Arial",
                fontWeight: "800",
                dropShadow: {
                    alpha: 0.85,
                    blur: 3,
                    color: 0x000000,
                    distance: 2
                }
            }
        });
        this.waveText.position.set(16, 12);

        this.statusText = new PIXI.Text({
            text: "",
            style: {
                fill: 0xffffff,
                fontSize: 18,
                fontFamily: "Segoe UI, Arial",
                align: "left",
                dropShadow: {
                    alpha: 0.7,
                    blur: 2,
                    color: 0x000000,
                    distance: 2
                }
            }
        });
        this.statusText.position.set(16, 48);

        const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
        this.hintText = new PIXI.Text({
            text: isTouch ? "" : "WASD · ЛКМ · Esc меню",
            style: {
                fill: 0xdddddd,
                fontSize: 13,
                fontFamily: "Segoe UI, Arial"
            }
        });
        this.hintText.position.set(16, 136);

        this.pixiObj = new PIXI.Container();
        this.pixiObj.addChild(this.waveText);
        this.pixiObj.addChild(this.statusText);
        this.pixiObj.addChild(this.hintText);

        this.app.socket?.on("waveStarted", (data:{ wave:number, isBoss?:boolean }) => {
            this.wave = data.wave;
            this.waveText.text = data.isBoss ? `БОСС · ВОЛНА ${this.wave}` : `ВОЛНА ${this.wave}`;
            this.showWaveBanner(this.wave, !!data.isBoss);
        });

        this.app.socket?.on("waveCleared", (data:{ wave:number }) => {
            this.wave = data.wave;
        });

        this.app.socket?.on("perkOffer", (data:{
            socketId:string,
            level:number,
            perks:BackendPerkOffer[]
        }) => {
            if (data.socketId === this.app.socket?.id) {
                this.app.notifyPerkOffer(data.perks);
            }
        });

        this.app.socket?.on("playerStats", (data:{ player:any }) => {
            if (data.player?.socketId === this.app.socket?.id) {
                this.mePlayer.update(data.player);
                if (!data.player.perkOffer?.length) {
                    this.app.notifyPerkOffer(null);
                }
            }
        });

        const initialWave = this.app.scene?.wave || 0;
        if (initialWave > 0) {
            this.wave = initialWave;
            this.waveText.text = `ВОЛНА ${this.wave}`;
            // socket waveStarted часто уходит до создания Hud — показываем баннер при входе
            this.showWaveBanner(this.wave);
        }
    }

    private showWaveBanner(wave:number, isBoss = false) {
        if (this.banner) {
            this.pixiObj.removeChild(this.banner.root);
            this.banner.root.destroy({ children: true });
            this.banner = null;
        }

        const w = this.app.getScreenWidth() || window.innerWidth;
        const h = window.innerHeight;
        const root = new PIXI.Container();

        const text = new PIXI.Text({
            text: isBoss ? `БОСС\nВОЛНА ${wave}` : `ВОЛНА ${wave}`,
            style: {
                fill: isBoss ? "#e8e8e8" : "#fff3b0",
                fontSize: isBoss ? 64 : 72,
                fontFamily: "Segoe UI, Arial Black, Arial",
                fontWeight: "bold",
                stroke: { color: isBoss ? "#000000" : "#1a1408", width: 8 },
                align: "center",
                dropShadow: {
                    alpha: 0.85,
                    blur: 10,
                    color: "#000000",
                    distance: 5
                }
            }
        });
        text.anchor.set(0.5);
        text.position.set(w / 2, h * 0.42);
        text.alpha = 1;
        text.scale.set(0.7);
        root.addChild(text);
        this.pixiObj.addChild(root);
        this.pixiObj.setChildIndex(root, this.pixiObj.children.length - 1);

        this.banner = { root, text, life: 0, phase: "in" };
    }

    public getPixiObj() {
        return this.pixiObj;
    }

    public update(deltaMS = 16):void {
        const wave = this.app.scene?.wave || this.wave;
        if (wave !== this.wave && wave > 0) {
            this.wave = wave;
            this.waveText.text = `ВОЛНА ${this.wave}`;
        }

        const hp = Math.max(0, Math.round(this.mePlayer.health));
        const maxHp = Math.max(1, Math.round(this.mePlayer.maxHealth));
        const weaponId = this.mePlayer.weapon.id || "?";
        const level = this.mePlayer.level;
        const exp = this.mePlayer.exp;
        const ammo = Math.max(0, this.mePlayer.weapon.ammo);
        const clip = Math.max(1, this.mePlayer.weapon.clipSize || 1);
        const reloading = this.mePlayer.weapon.isReloading ? " · перезарядка" : "";
        const attack = Math.max(0, Math.round(this.mePlayer.weapon.damage));
        const speed = Math.max(0, Math.round(this.mePlayer.getSpeed()));
        const fireMs = this.mePlayer.weapon.fireRate || this.mePlayer.weapon.config.fireRate || 1;
        const shotsPerSec = Math.round(1000 / fireMs * 10) / 10;
        this.statusText.text =
            `HP ${hp}/${maxHp} · Lv ${level} (xp ${exp})\n${weaponId}: ${ammo}/${clip}${reloading}\nАтака ${attack} · Бег ${speed} · Скорострел ${shotsPerSec}`;

        this.updateBanner(deltaMS / 1000);
    }

    private updateBanner(dt:number) {
        if (!this.banner) return;
        const b = this.banner;
        b.life += dt;
        const text = b.text;

        if (b.phase === "in") {
            const t = Math.min(1, b.life / 0.35);
            const e = 1 - Math.pow(1 - t, 3);
            text.alpha = e;
            text.scale.set(0.55 + 0.45 * e);
            if (t >= 1) {
                b.phase = "hold";
                b.life = 0;
            }
        } else if (b.phase === "hold") {
            text.alpha = 1;
            text.scale.set(1);
            if (b.life >= 1.45) {
                b.phase = "out";
                b.life = 0;
            }
        } else {
            const t = Math.min(1, b.life / 0.4);
            const e = t * t;
            text.alpha = 1 - e;
            text.y -= 40 * dt;
            text.scale.set(1 + 0.15 * e);
            if (t >= 1) {
                this.pixiObj.removeChild(b.root);
                b.root.destroy({ children: true });
                this.banner = null;
            }
        }
    }

    public destroy() {
        if (this.banner) {
            this.banner.root.destroy({ children: true });
            this.banner = null;
        }
        this.pixiObj.destroy({ children: true });
    }
}
