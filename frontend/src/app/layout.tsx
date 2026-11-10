import { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "../../styles/globals.css";

export const metadata:Metadata = {
    title: "Zero Eliya: Lost on the Dead Asteroid",
    description: "Кооперативная браузерная арена: отражайте волны монстров, выбирайте перки и побеждайте боссов.",
    // Добавленная на главный экран игра открывается без адресной строки (в т.ч. на iPhone)
    manifest: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LPT Arena" }
};

export const viewport:Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover"
};

export default function RootLayout({ children }:{
    children:ReactNode
}) {
    return (
        <html lang="ru">
            <body>{children}</body>
        </html>
    );
}
