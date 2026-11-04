import { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "../../styles/globals.css";

export const metadata:Metadata = {
    title: "Lost on the Dead Planet — LPT Games",
    description: "Многопользовательский шутер в браузере: открытый мир, зомби, команды, оружие и сотни перков."
};

export const viewport:Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function RootLayout({ children }:{ children:ReactNode }) {
    return (
        <html lang="ru">
            <body>{children}</body>
        </html>
    );
}
