export interface ShopItem { id:string; kind:string; name:string; price:number; description:string; image:string }
export interface Profile { coins:number; earned:number; owned:string[]; selected:string; items:ShopItem[] }

export function profileToken() {
    let token = localStorage.getItem("wave-arena-profile");
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        token = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("");
        localStorage.setItem("wave-arena-profile", token);
    }
    return token;
}

export async function profileRequest(action = "", itemId?:string):Promise<Profile> {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    const base = process.env.NEXT_PUBLIC_API_BASE_PATH || "";
    const response = await fetch(`${backend}${base}/api/profile${action ? `/${action}` : ""}`, {
        method: action ? "POST" : "GET",
        headers: { Authorization: `Bearer ${profileToken()}`, "Content-Type": "application/json" },
        body: action ? JSON.stringify({ itemId }) : undefined,
        cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Профиль временно недоступен");
    return data;
}
