import * as PIXI from "pixi.js";
import {App} from "../App";

const keys:any = {
    isKeyW: false,
    isKeyS: false,
    isKeyA: false,
    isKeyD: false,
    isSpace: false
};

const mouseCoords:any = {
    pageX: 0,
    pageY: 0
};

const mouseMoveCallbacks:any[] = [];
const mouseScrollCallbacks:any[] = [];
let isMousePressed = false;

export class Control {

    app:App;

    constructor (app:App) {
        this.app = app;
        document.addEventListener("keydown", (e) => {
            keys["is" + e.code] = true;
        });
        document.addEventListener("keyup", (e) => {
            keys["is" + e.code] = false;
        });
        document.addEventListener("mousemove", (e) => {
            mouseCoords.pageX = e.pageX;
            mouseCoords.pageY = e.pageY;
            mouseMoveCallbacks.forEach(el => el(e));
        });
        document.addEventListener("mousedown", (e) => {
            mouseCoords.pageX = e.pageX;
            mouseCoords.pageY = e.pageY;
            isMousePressed = true;
        });
        document.addEventListener("mouseup", (e) => {
            mouseCoords.pageX = e.pageX;
            mouseCoords.pageY = e.pageY;
            isMousePressed = false;
        });

        document.addEventListener("wheel", (e) => {
            mouseScrollCallbacks.forEach(el => el(e.deltaY > 0 ? "down" : "up"));
        });
    }

    getMouseCoords () {
        return mouseCoords;
    }

    isSpace () {
        return keys["isSpace"];
    }

    onKey (keyCode:string, callback:any) {
        this.app.pixiApp.ticker.add((ticker) => {
            if (keys["is" + keyCode]) {
                callback(ticker.deltaTime);
            }
        });
    }

    onMouseMove (callback:any) {
        mouseMoveCallbacks.push(callback);
    }

    onMouseWheel (callback:(direction:string) => void) {
        mouseScrollCallbacks.push(callback);
    }

    onMousePressed (callback:any) {
        this.app.pixiApp.ticker.add((ticker) => {
            if (isMousePressed) {
                callback(ticker.deltaTime);
            }
        });
    }
}