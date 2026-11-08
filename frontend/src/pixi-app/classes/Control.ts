import { App } from "../App";
import { IMouseCoords } from "../Types";

interface Stick {
    id:number;
    originX:number;
    originY:number;
    x:number;
    y:number;
    visual:HTMLDivElement;
    knob:HTMLDivElement;
}

const STICK_RADIUS = 60;
const MOVE_DEADZONE = 0.15;
const AIM_DEADZONE = 14;


export class Control {

    private app:App;

    private keys = new Set<string>();
    private pressed = new Set<string>();
    private mouseCoords:IMouseCoords = { pageX: 0, pageY: 0 };

    private _mouseMovement = { x: 0, y: 0 };
    private _scrollDelta = 0;

    private _handlers:{ [key:string]:(e:any) => void } = {};

    private isMousePressed = false;
    private moveStick:Stick | null = null;
    private aimStick:Stick | null = null;
    private lastAim:number | null = null;
    public readonly isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    public sprintToggle = false;
    public aimDown = false;

    constructor(app:App) {
        this.app = app;
        this.initListeners();
    }

    private clearKeys() {
        this.keys.clear();
        this.pressed.clear();
        this.isMousePressed = false;
        this.aimDown = false;
        this.removeStick("move");
        this.removeStick("aim");
    }

    private initListeners() {

        this._handlers.keydown = (e) => {
            if (!e.repeat) this.pressed.add(e.code);
            this.keys.add(e.code);
            if (["Space", "Tab"].includes(e.code)) e.preventDefault();
        };
        this._handlers.keyup = (e) => {
            this.keys.delete(e.code);
        };
        this._handlers.mousemove = (e) => {
            this.mouseCoords.pageX = e.pageX - this.getCanvasOffsetLeft();
            this.mouseCoords.pageY = e.pageY - this.getCanvasOffsetTop();
            this._mouseMovement.x += e.movementX;
            this._mouseMovement.y += e.movementY;
        };
        this._handlers.mousedown = (e) => {
            if (e.button === 0 && e.target === this.app.getView()) {
                this.mouseCoords.pageX = e.pageX - this.getCanvasOffsetLeft();
                this.mouseCoords.pageY = e.pageY - this.getCanvasOffsetTop();
                this.isMousePressed = true;
            } else if (e.button === 2 && e.target === this.app.getView()) {
                this.aimDown = true;
            }
        };
        this._handlers.mouseup = (e) => {
            if (e.button === 0) {
                this.mouseCoords.pageX = e.pageX - this.getCanvasOffsetLeft();
                this.mouseCoords.pageY = e.pageY - this.getCanvasOffsetTop();
                this.isMousePressed = false;
            } else if (e.button === 2) {
                this.aimDown = false;
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

        const canvas = this.app.getView();
        this._handlers.touchstart = (e:TouchEvent) => {
            e.preventDefault();
            for (const touch of Array.from(e.changedTouches)) {
                if (touch.clientX < window.innerWidth / 2 && !this.moveStick) {
                    this.moveStick = this.createStick(touch);
                } else if (touch.clientX >= window.innerWidth / 2 && !this.aimStick) {
                    this.aimStick = this.createStick(touch);
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
                    this.positionKnob(stick);
                }
            }
        };
        this._handlers.touchend = (e:TouchEvent) => {
            for (const touch of Array.from(e.changedTouches)) {
                if (this.moveStick?.id === touch.identifier) this.removeStick("move");
                if (this.aimStick?.id === touch.identifier) this.removeStick("aim");
            }
        };
        canvas.addEventListener("touchstart", this._handlers.touchstart, { passive: false });
        canvas.addEventListener("touchmove", this._handlers.touchmove, { passive: false });
        canvas.addEventListener("touchend", this._handlers.touchend, { passive: false });
        canvas.addEventListener("touchcancel", this._handlers.touchend, { passive: false });
    }

    getMouseCoords() {
        return this.mouseCoords;
    }

    getIsMousePressed() {
        return this.isMousePressed;
    }

    isKey(keyCode:string) {
        return this.keys.has(keyCode);
    }

    consumeKey(keyCode:string) {
        const has = this.pressed.has(keyCode);
        this.pressed.delete(keyCode);
        return has;
    }

    getMoveVector() {
        if (this.moveStick) {
            const dx = (this.moveStick.x - this.moveStick.originX) / STICK_RADIUS;
            const dy = (this.moveStick.y - this.moveStick.originY) / STICK_RADIUS;
            const length = Math.hypot(dx, dy);
            if (length < MOVE_DEADZONE) return { x: 0, y: 0 };
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

    getAimAngle() {
        if (this.aimStick) {
            const dx = this.aimStick.x - this.aimStick.originX;
            const dy = this.aimStick.y - this.aimStick.originY;
            if (Math.hypot(dx, dy) >= AIM_DEADZONE) this.lastAim = Math.atan2(dy, dx);
        }
        return this.lastAim;
    }

    get isFiring() {
        return this.isMousePressed || (!!this.aimStick && Math.hypot(
            this.aimStick.x - this.aimStick.originX,
            this.aimStick.y - this.aimStick.originY
        ) >= AIM_DEADZONE);
    }

    get sprinting() {
        return this.sprintToggle || this.isKey("ShiftLeft") || this.isKey("ShiftRight");
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
        document.removeEventListener("contextmenu", this._handlers.contextmenu);
        window.removeEventListener("blur", this._handlers.blur);
        const canvas = this.app.getView();
        canvas.removeEventListener("touchstart", this._handlers.touchstart);
        canvas.removeEventListener("touchmove", this._handlers.touchmove);
        canvas.removeEventListener("touchend", this._handlers.touchend);
        canvas.removeEventListener("touchcancel", this._handlers.touchend);
        this.clearKeys();
    }

    private createStick(touch:Touch):Stick {
        const visual = document.createElement("div");
        const knob = document.createElement("div");
        Object.assign(visual.style, {
            position: "fixed", left: `${touch.clientX - 42}px`, top: `${touch.clientY - 42}px`,
            width: "84px", height: "84px", borderRadius: "50%", zIndex: "18",
            pointerEvents: "none", border: "2px solid rgba(255,255,255,.38)",
            background: "rgba(15,18,12,.24)"
        });
        Object.assign(knob.style, {
            position: "absolute", left: "25px", top: "25px", width: "30px", height: "30px",
            borderRadius: "50%", background: "rgba(168,224,95,.75)", border: "2px solid white"
        });
        visual.appendChild(knob);
        document.body.appendChild(visual);
        return {
            id: touch.identifier, originX: touch.clientX, originY: touch.clientY,
            x: touch.clientX, y: touch.clientY, visual, knob
        };
    }

    private positionKnob(stick:Stick) {
        const dx = stick.x - stick.originX;
        const dy = stick.y - stick.originY;
        const k = Math.min(1, STICK_RADIUS / (Math.hypot(dx, dy) || 1));
        stick.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    }

    private removeStick(type:"move" | "aim") {
        const stick = type === "move" ? this.moveStick : this.aimStick;
        stick?.visual.remove();
        if (type === "move") this.moveStick = null;
        else this.aimStick = null;
    }

}
