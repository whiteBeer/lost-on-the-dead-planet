import * as PIXI from "pixi.js";
import {App} from "../App";

const keys:any = {
    isKeyW: false,
    isKeyS: false,
    isKeyA: false,
    isKeyD: false
};

const mouseCoords:any = {
    pageX: 0,
    pageY: 0
};

const mouseMoveCallbacks:any[] = [];
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
            mouseMoveCallbacks.forEach(el => el());
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
    }

    getMouseCoords () {
        return mouseCoords;
    }

    onKey (keyCode:string, callback:any) {
        this.app.pixiApp.ticker.add((delta) => {
            if (keys["is" + keyCode]) {
                callback(delta);
            }
        });
    }

    onMouseMove (callback:any) {
        mouseMoveCallbacks.push(callback);
    }

    onMousePressed (callback:any) {
        this.app.pixiApp.ticker.add((delta) => {
            if (isMousePressed) {
                callback(delta);
            }
        });
    }
}

export default Control;