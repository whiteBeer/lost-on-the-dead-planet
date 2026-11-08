import { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "../../styles/globals.css";

export const metadata:Metadata = {
    title: "Lost on the Dead Planet — LPT Games",
    description: "Многопользовательский шутер в браузере: открытый мир, зомби, команды, оружие и сотни перков.",
    // Добавленная на главный экран игра открывается без адресной строки (в т.ч. на iPhone)
    manifest: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LPT Zombies" }
};

export const viewport:Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function RootLayout({ children }:{ children:ReactNode }) {
    return (
        <html lang="ru">
            <body>{children}</body>
        </html>
    );
}
