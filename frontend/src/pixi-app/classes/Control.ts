import { App } from "../App";
import { IMouseCoords } from "../Types";

interface Stick {
    id:number;
    originX:number;
    originY:number;
    x:number;
    y:number;
}

const STICK_RADIUS = 60;
const MOVE_DEADZONE = 0.15;
const AIM_DEADZONE = 14;

export class Control {

    private app:App;

    private keys:Record<string, boolean> = {};
    private mouseCoords:IMouseCoords = { pageX: 0, pageY: 0 };

    private _mouseMovement = { x: 0, y: 0 };
    private _scrollDelta = 0;

    private _handlers:{ [key:string]:(e:any) => void } = {};
    private touchTarget:EventTarget | null = null;

    private isMousePressed = false;
    private moveStick:Stick | null = null;
    private aimStick:Stick | null = null;
    private lastAim:number | null = null;

    readonly isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

    constructor(app:App) {
        this.app = app;
        this.initListeners();
    }

    private clearKeys() {
        Object.keys(this.keys).forEach(key => {
            this.keys[key] = false;
        });
        this.isMousePressed = false;
        this.moveStick = null;
        this.aimStick = null;
    }

    private initListeners() {
        this._handlers.keydown = (e:KeyboardEvent) => {
            this.keys["is" + e.code] = true;
            if (e.code === "Tab" || e.code === "Space") {
                e.preventDefault();
            }
        };
        this._handlers.keyup = (e:KeyboardEvent) => {
            this.keys["is" + e.code] = false;
        };
        this._handlers.mousemove = (e:MouseEvent) => {
            this.mouseCoords.pageX = e.pageX - this.getCanvasOffsetLeft();
            this.mouseCoords.pageY = e.pageY - this.getCanvasOffsetTop();
            this._mouseMovement.x += e.movementX;
            this._mouseMovement.y += e.movementY;
        };
        this._handlers.mousedown = (e:MouseEvent) => {
            if (e.button === 0) {
                this.mouseCoords.pageX = e.pageX - this.getCanvasOffsetLeft();
                this.mouseCoords.pageY = e.pageY - this.getCanvasOffsetTop();
                this.isMousePressed = true;
            }
        };
        this._handlers.mouseup = (e:MouseEvent) => {
            if (e.button === 0) {
                this.mouseCoords.pageX = e.pageX - this.getCanvasOffsetLeft();
                this.mouseCoords.pageY = e.pageY - this.getCanvasOffsetTop();
                this.isMousePressed = false;
            }
        };
        this._handlers.wheel = (e:WheelEvent) => {
            this._scrollDelta += Math.sign(e.deltaY);
        };
        this._handlers.contextmenu = (e:Event) => {
            e.preventDefault();
            this.clearKeys();
        };
        this._handlers.blur = () => this.clearKeys();
        this._handlers.visibility = () => {
            if (document.visibilityState !== "visible") {
                this.clearKeys();
            }
        };

        // Левая половина — бег, правая — прицел и стрельба. Стики появляются там, где коснулись
        this._handlers.touchstart = (e:TouchEvent) => {
            e.preventDefault();
            for (const touch of Array.from(e.changedTouches)) {
                const stick:Stick = {
                    id: touch.identifier,
                    originX: touch.clientX,
                    originY: touch.clientY,
                    x: touch.clientX,
                    y: touch.clientY
                };
                if (touch.clientX < window.innerWidth / 2) {
                    this.moveStick = this.moveStick || stick;
                } else {
                    this.aimStick = this.aimStick || stick;
                }
            }
        };
        this._handlers.touchmove = (e:TouchEvent) => {
            e.preventDefault();
            for (const touch of Array.from(e.changedTouches)) {
                const stick = this.moveStick?.id === touch.identifier ? this.moveStick
                    : this.aimStick?.id === touch.identifier ? this.aimStick : null;
                if (stick) {
                    stick.x = touch.clientX;
                    stick.y = touch.clientY;
                }
            }
        };
        this._handlers.touchend = (e:TouchEvent) => {
            for (const touch of Array.from(e.changedTouches)) {
                if (this.moveStick?.id === touch.identifier) {
                    this.moveStick = null;
                }
                if (this.aimStick?.id === touch.identifier) {
                    this.aimStick = null;
                }
            }
        };

        window.addEventListener("keydown", this._handlers.keydown);
        window.addEventListener("keyup", this._handlers.keyup);
        document.addEventListener("mousemove", this._handlers.mousemove);
        document.addEventListener("mousedown", this._handlers.mousedown);
        document.addEventListener("mouseup", this._handlers.mouseup);
        document.addEventListener("wheel", this._handlers.wheel, { passive: true });
        document.addEventListener("contextmenu", this._handlers.contextmenu);
        window.addEventListener("blur", this._handlers.blur);
        document.addEventListener("visibilitychange", this._handlers.visibility);

        this.touchTarget = this.app.getView() || this.app.$domEl;
        this.touchTarget.addEventListener("touchstart", this._handlers.touchstart, { passive: false });
        this.touchTarget.addEventListener("touchmove", this._handlers.touchmove, { passive: false });
        this.touchTarget.addEventListener("touchend", this._handlers.touchend);
        this.touchTarget.addEventListener("touchcancel", this._handlers.touchend);
    }

    private aimDrag() {
        return this.aimStick
            ? Math.hypot(this.aimStick.x - this.aimStick.originX, this.aimStick.y - this.aimStick.originY)
            : 0;
    }

    /** Направление бега: стик — плавная скорость, WASD — полная. */
    moveVector() {
        if (this.moveStick) {
            const dx = (this.moveStick.x - this.moveStick.originX) / STICK_RADIUS;
            const dy = (this.moveStick.y - this.moveStick.originY) / STICK_RADIUS;
            const length = Math.hypot(dx, dy);
            if (length < MOVE_DEADZONE) {
                return { x: 0, y: 0 };
            }
            const k = length > 1 ? 1 / length : 1;
            return { x: dx * k, y: dy * k };
        }
        let x = 0;
        let y = 0;
        if (this.isKey("KeyW")) y -= 1;
        if (this.isKey("KeyS")) y += 1;
        if (this.isKey("KeyA")) x -= 1;
        if (this.isKey("KeyD")) x += 1;
        const length = Math.hypot(x, y);
        return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
    }

    /** Угол прицела со стика. Пока стик не трогают — последний угол. */
    get aimAngle():number | null {
        if (this.aimStick && this.aimDrag() >= AIM_DEADZONE) {
            this.lastAim = Math.atan2(
                this.aimStick.y - this.aimStick.originY,
                this.aimStick.x - this.aimStick.originX
            );
        }
        return this.lastAim;
    }

    sticks() {
        const list:{ originX:number, originY:number, x:number, y:number }[] = [];
        for (const stick of [this.moveStick, this.aimStick]) {
            if (stick) {
                const dx = stick.x - stick.originX;
                const dy = stick.y - stick.originY;
                const k = Math.min(1, STICK_RADIUS / (Math.hypot(dx, dy) || 1));
                list.push({
                    originX: stick.originX,
                    originY: stick.originY,
                    x: stick.originX + dx * k,
                    y: stick.originY + dy * k
                });
            }
        }
        return list;
    }

    get isFiring() {
        return this.isMousePressed || this.aimDrag() >= AIM_DEADZONE;
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
        this.clearKeys();
        window.removeEventListener("keydown", this._handlers.keydown);
        window.removeEventListener("keyup", this._handlers.keyup);
        document.removeEventListener("mousemove", this._handlers.mousemove);
        document.removeEventListener("mousedown", this._handlers.mousedown);
        document.removeEventListener("mouseup", this._handlers.mouseup);
        document.removeEventListener("wheel", this._handlers.wheel);
        document.removeEventListener("contextmenu", this._handlers.contextmenu);
        window.removeEventListener("blur", this._handlers.blur);
        document.removeEventListener("visibilitychange", this._handlers.visibility);
        if (this.touchTarget) {
            this.touchTarget.removeEventListener("touchstart", this._handlers.touchstart);
            this.touchTarget.removeEventListener("touchmove", this._handlers.touchmove);
            this.touchTarget.removeEventListener("touchend", this._handlers.touchend);
            this.touchTarget.removeEventListener("touchcancel", this._handlers.touchend);
            this.touchTarget = null;
        }
    }

}
