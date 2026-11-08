import { ReactNode } from "react";
import type { Metadata } from "next";
import "../../styles/globals.css";

export const metadata:Metadata = {
    title: "Зомби: Волновая арена — LPT Games",
    description: "Кооперативная браузерная арена: отражайте волны монстров, выбирайте перки и побеждайте боссов."
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
