import React, { useEffect, useState } from "react";
import {App} from "../../pixi-app/App";
import axios from "axios";

function Room() {

    const backendUrl = process.env.BACKEND_URL;
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
            app = new App();
            await app.init();
            document?.getElementById("game")?.appendChild(app.getView());
        })();
    }, []);

    return (
        <div>
            <div id="menu">
                <button onClick={newGame} className="toolbar-btn">New Game</button>
                <button onClick={addZombie}  className="toolbar-btn">Add Zombie</button>
                <button onClick={addZombie10}  className="toolbar-btn">Add 10 Zombie</button>
                <button onClick={addSpider}  className="toolbar-btn">Add Spider</button>
            </div>
            <div id="game" style={{
                margin: "0",
                overflow: "hidden"
            }}></div>
        </div>
    );
}

export default Room;
