import * as PIXI from "pixi.js";

let keys = {
    isKeyW: false,
    isKeyS: false,
    isKeyA: false,
    isKeyD: false,
};

let mouseCoords = {
    pageX: 0,
    pageY: 0,
};

let mouseMoveCallbacks = [];

export class Control {

    app = null;

    constructor (app, params = {}) {
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
    }

    getMouseCoords () {
        return mouseCoords;
    }

    onKey (keyCode, callback) {
        this.app.ticker.add((delta) => {
            if (keys["is" + keyCode]) {
                callback(delta);
            }
        });
    }

    onMouseMove (callback) {
        mouseMoveCallbacks.push(callback);
    }
}

export default Control;