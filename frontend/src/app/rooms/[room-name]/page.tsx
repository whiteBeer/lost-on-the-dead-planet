"use client";

import React, { useEffect } from "react";
import {App as PixiAPP} from "../../../pixi-app/App";
import axios from "axios";
import styles from "./index.module.css";

function Room() {

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    let app;

    const newGame = async () => {
        await axios.put(backendUrl + "/api/new-game");
    };

    const addZombie = async () => {
        await axios.put(backendUrl + "/api/sandbox/add-zombie");
    };

    const addZombie10 = async () => {
        for (let i=0; i<10; i++) {
            await axios.put(backendUrl + "/api/sandbox/add-zombie");
        }
    };

    const addSpider = async () => {
        await axios.put(backendUrl + "/api/sandbox/add-spider");
    };

    useEffect(() => {
        (async () => {
            const $el = document?.getElementById("game");
            if ($el) {
                app = new PixiAPP($el);
                await app.init();
                $el.appendChild(app.getView());
            }
        })();
    }, []);

    return (
        <div>
            <div className={styles.menu}>
                <button onClick={newGame} className="text-xs font-medium btn btn-blue mr-3">New Game</button>
                <button onClick={addZombie}  className="text-xs font-medium btn btn-blue mr-3">Add Zombie</button>
                <button onClick={addZombie10}  className="text-xs font-medium  btn btn-blue mr-3">Add 10 Zombie</button>
                <button onClick={addSpider}  className="text-xs font-medium btn btn-blue">Add Spider</button>
            </div>
            <div id="game" className={styles.game}></div>
        </div>
    );
}

export default Room;
