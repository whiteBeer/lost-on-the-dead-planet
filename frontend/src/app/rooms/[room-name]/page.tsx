"use client";

import React, { useEffect, useRef } from "react";
import { App as PixiAPP } from "../../../pixi-app/App";
import axios from "axios";
import styles from "./index.module.css";
import { useRouter } from "next/navigation";

import { getRoomId } from "../../../utils/getRoomId";

function Room() {

    const router = useRouter();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const appRef = useRef<PixiAPP | null>(null);

    const mainMenu = async () => {
        appRef.current && appRef.current.destroy();
        router.push("/");
    };

    const newGame = async () => {
        await axios.put(backendUrl + "/api/rooms/" + getRoomId() + "/new-game");
        setTimeout(() => {
            appRef.current?.meRespawn();
        }, 500);
    };

    const addZombie = async () => {
        await axios.put(backendUrl + "/api/sandbox/rooms/" + getRoomId() + "/add-zombie");
    };

    const addZombie10 = async () => {
        for (let i = 0; i < 10; i++) {
            await axios.put(backendUrl + "/api/sandbox/rooms/" + getRoomId() + "/add-zombie");
        }
    };

    const addSpider = async () => {
        await axios.put(backendUrl + "/api/sandbox/rooms/" + getRoomId() + "/add-spider");
    };

    useEffect(() => {
        (async () => {
            const $el = document?.getElementById("game");
            if ($el) {
                appRef.current = new PixiAPP($el);
                await appRef.current.init();
                $el.appendChild(appRef.current.getView());
            }
        })();
        return () => {
            appRef.current && appRef.current.destroy();
        };
    }, []);

    return (
        <div>
            <div id="menu" className={styles.menu}>
                <button onClick={mainMenu} className="text-xs font-medium btn btn-blue mr-3">Main menu</button>
                <button onClick={newGame} className="text-xs font-medium btn btn-blue mr-3">New Game</button>
                <button onClick={addZombie} className="text-xs font-medium btn btn-blue mr-3">Add Zombie</button>
                <button onClick={addZombie10} className="text-xs font-medium  btn btn-blue mr-3">Add 10 Zombie</button>
                <button onClick={addSpider} className="text-xs font-medium btn btn-blue">Add Spider</button>
            </div>
            <div id="game" className={styles.game}></div>
        </div>
    );
}

export default Room;