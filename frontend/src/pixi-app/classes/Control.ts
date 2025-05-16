import {App} from "../App";
import {IMouseCoords} from "../Types";

const keys:any = {
    isKeyW: false,
    isKeyS: false,
    isKeyA: false,
    isKeyD: false,
    isSpace: false
};

const mouseCoords:IMouseCoords = {
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
            const menuHeight = document.getElementById("menu")?.clientHeight || 0;
            mouseCoords.pageX = e.pageX;
            mouseCoords.pageY = e.pageY - menuHeight;
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

        document.addEventListener("contextmenu", clearKeys);
        window.addEventListener("blur", clearKeys);

        function clearKeys () {
            Object.keys(keys).forEach(key => {
                keys[key] = false;
            });
        }
    }

    getMouseCoords () {
        return mouseCoords;
    }

    getKeys () {
        return keys;
    }

    isSpace () {
        return keys["isSpace"];
    }

    isKey (keyCode:string) {
        return keys["is" + keyCode];
    }

    onKey (keyCode:string, callback:any) {
        this.app.pixiApp.ticker.add((ticker) => {
            if (keys["is" + keyCode]) {
                callback(ticker);
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