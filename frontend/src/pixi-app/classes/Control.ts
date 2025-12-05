import { App } from "../App";
import { IMouseCoords } from "../Types";


export class Control {

    private app:App;

    private keys:Record<string, boolean> = {};
    private mouseCoords:IMouseCoords = { pageX: 0, pageY: 0 };

    private _mouseMovement = { x: 0, y: 0 };
    private _scrollDelta = 0;

    private _handlers:{ [key:string]:(e:any) => void } = {};

    private isMousePressed = false;

    constructor(app:App) {
        this.app = app;
        this.initListeners();
    }

    private clearKeys() {
        Object.keys(this.keys).forEach(key => {
            this.keys[key] = false;
        });
    }

    private initListeners() {

        this._handlers.keydown = (e) => {
            this.keys["is" + e.code] = true;
        };
        this._handlers.keyup = (e) => {
            this.keys["is" + e.code] = false;
        };
        this._handlers.mousemove = (e) => {
            this.mouseCoords.pageX = e.pageX - this.getCanvasOffsetLeft();
            this.mouseCoords.pageY = e.pageY - this.getCanvasOffsetTop();
            this._mouseMovement.x += e.movementX;
            this._mouseMovement.y += e.movementY;
        };
        this._handlers.mousedown = (e) => {
            if (e.button === 0) {
                this.mouseCoords.pageX = e.pageX - this.getCanvasOffsetLeft();
                this.mouseCoords.pageY = e.pageY - this.getCanvasOffsetTop();
                this.isMousePressed = true;
            }
        };
        this._handlers.mouseup = (e) => {
            if (e.button === 0) {
                this.mouseCoords.pageX = e.pageX - this.getCanvasOffsetLeft();
                this.mouseCoords.pageY = e.pageY - this.getCanvasOffsetTop();
                this.isMousePressed = false;
            }
        };
        this._handlers.wheel = (e) => {
            this._scrollDelta += Math.sign(e.deltaY);
        };
        this._handlers.contextmenu = (e) => {
            e.preventDefault();
            this.clearKeys.call(this);
        };

        this._handlers.blur = () => {
            this.clearKeys.call(this);
        };

        window.addEventListener("keydown", this._handlers.keydown);
        window.addEventListener("keyup", this._handlers.keyup);
        document.addEventListener("mousemove", this._handlers.mousemove);
        document.addEventListener("mousedown", this._handlers.mousedown);
        document.addEventListener("mouseup", this._handlers.mouseup);
        document.addEventListener("wheel", this._handlers.wheel, { passive: true });
        document.addEventListener("contextmenu", this._handlers.contextmenu);
        window.addEventListener("blur", this._handlers.blur);
    }

    getMouseCoords() {
        return this.mouseCoords;
    }

    getIsMousePressed() {
        return this.isMousePressed;
    }

    isSpace() {
        return this.keys["isSpace"];
    }

    isKey(keyCode:string) {
        return this.keys["is" + keyCode];
    }

    getCanvasOffsetTop() {
        return this.app.$domEl.offsetTop || 0;
    }

    getCanvasOffsetLeft() {
        return this.app.$domEl.offsetLeft || 0;
    }

    public getAndResetMouseMovement() {
        const movement = { x: this._mouseMovement.x, y: this._mouseMovement.y };
        this._mouseMovement = { x: 0, y: 0 };
        return movement;
    }

    public getAndResetScrollDelta():number {
        const delta = this._scrollDelta;
        this._scrollDelta = 0;
        return delta;
    }

    public destroy() {
        this.clearKeys.call(this);
        window.removeEventListener("keydown", this._handlers.keydown);
        window.removeEventListener("keyup", this._handlers.keyup);
        document.removeEventListener("mousemove", this._handlers.mousemove);
        document.removeEventListener("mousedown", this._handlers.mousedown);
        document.removeEventListener("mouseup", this._handlers.mouseup);
        document.removeEventListener("wheel", this._handlers.wheel);
        window.removeEventListener("blur", this._handlers.blur);
    }

}