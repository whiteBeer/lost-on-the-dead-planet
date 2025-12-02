import { ReactNode } from "react";
import "../../styles/globals.css";

export default function RootLayout({ children }:{
    children:ReactNode
}) {
    return (
        <html lang="ru">
            <body>{children}</body>
        </html>
    );
}