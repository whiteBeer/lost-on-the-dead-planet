import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { SHOP_ITEMS, coinsForLevel } from "../configs/Shop";

interface Account {
    coins:number;
    earned:number;
    owned:string[];
    selected:string;
    claimed:Record<string, number>;
}

export class ShopError extends Error {}

/** Single-process store. Each mutation replaces a 0600 file atomically. */
export class ProfileStore {
    private accounts:Record<string, Account> = {};
    constructor(private readonly file = process.env.PROFILE_DB_PATH || join(process.cwd(), "data", "profiles.json")) {
        if (existsSync(file)) {
            const data = JSON.parse(readFileSync(file, "utf8"));
            if (data.version !== 1 || !data.accounts) throw new Error("Invalid profile database");
            for (const account of Object.values(data.accounts) as Account[]) {
                if (!Number.isSafeInteger(account.coins) || account.coins < 0 || !Array.isArray(account.owned)
                    || !account.owned.includes(account.selected) || !account.claimed) throw new Error("Invalid profile record");
            }
            this.accounts = data.accounts;
        }
    }

    ensureToken(token:unknown):string {
        if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new ShopError("Нужен профиль браузера");
        const key = createHash("sha256").update(token).digest("hex");
        if (!this.accounts[key]) this.commit(key, { coins: 0, earned: 0, owned: ["default"], selected: "default", claimed: {} });
        return key;
    }

    view(key:string) {
        const account = this.accounts[key];
        if (!account) throw new ShopError("Профиль не найден");
        return { coins: account.coins, earned: account.earned, owned: [...account.owned], selected: account.selected, items: SHOP_ITEMS };
    }

    rewardLevel(key:string, runId:string, level:number) {
        if (!Number.isSafeInteger(level) || level < 2 || level > 10000) return 0;
        const account = this.accounts[key];
        if (!account) return 0;
        const previous = account.claimed[runId] || 1;
        if (level <= previous) return 0;
        let coins = 0;
        for (let next = previous + 1; next <= level; next++) coins += coinsForLevel(next);
        const claimed = { ...account.claimed, [runId]: level };
        // Keep a generous history so a repeated event cannot award the same run twice.
        const runs = Object.keys(claimed);
        runs.slice(0, Math.max(0, runs.length - 500)).forEach(id => delete claimed[id]);
        this.commit(key, { ...account, coins: account.coins + coins, earned: account.earned + coins, claimed });
        return coins;
    }

    buy(key:string, itemId:unknown) {
        const item = SHOP_ITEMS.find(entry => entry.id === itemId);
        if (!item) throw new ShopError("Товар не найден");
        const account = this.accounts[key];
        if (account.owned.includes(item.id)) return this.view(key);
        if (account.coins < item.price) throw new ShopError("Не хватает монет");
        this.commit(key, { ...account, coins: account.coins - item.price, owned: [...account.owned, item.id] });
        return this.view(key);
    }

    equip(key:string, itemId:unknown) {
        const account = this.accounts[key];
        if (typeof itemId !== "string" || !account.owned.includes(itemId)) throw new ShopError("Сначала купи этот скин");
        this.commit(key, { ...account, selected: itemId });
        return this.view(key);
    }

    private commit(key:string, account:Account) {
        const accounts = { ...this.accounts, [key]: account };
        mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
        const pending = `${this.file}.${process.pid}.tmp`;
        writeFileSync(pending, JSON.stringify({ version: 1, accounts }), { mode: 0o600 });
        renameSync(pending, this.file);
        this.accounts = accounts;
    }
}
