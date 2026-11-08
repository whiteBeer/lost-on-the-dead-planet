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
    private moveStick:Stick | null = null;
    private aimStick:Stick | null = null;
    private lastAim:number | null = null;
    readonly isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    private keys = new Set<string>();
    private mouseX = 0;
    private mouseY = 0;
    private mouseDown = false;
    private handlers:[EventTarget, string, (e:any) => void][] = [];

    sprintToggle = false;    // кнопка «Бег» на телефоне

    constructor(private readonly canvas:HTMLElement, private readonly onKey:(code:string, mod:boolean) => void) {
        // Стрельба начинается только по клику на canvas: клик по панелям интерфейса не стреляет
        this.on(canvas, "mousedown", (e:MouseEvent) => {
            if (e.button === 0) {
                this.mouseDown = true;
            }
        });
        this.on(window, "mouseup", (e:MouseEvent) => {
            if (e.button === 0) {
                this.mouseDown = false;
            }
        });
        this.on(window, "mousemove", (e:MouseEvent) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        this.on(window, "keydown", (e:KeyboardEvent) => {
            const mod = e.ctrlKey || e.altKey || e.metaKey;
            if (!e.repeat) {
                this.onKey(e.code, mod);
            }
            this.keys.add(e.code);
            // Ctrl/Alt + 1..3 — выбор перка, а не переключение вкладок браузера
            if (e.code === "Tab" || e.code === "Space" || (mod && /^Digit[1-3]$/.test(e.code))) {
                e.preventDefault();
            }
        });
        this.on(window, "keyup", (e:KeyboardEvent) => this.keys.delete(e.code));
        this.on(window, "blur", () => this.clear());
        this.on(document, "visibilitychange", () => this.clear());
        this.on(canvas, "contextmenu", (e:Event) => e.preventDefault());

        // Левая половина экрана — бег, правая — прицел и стрельба. Стики появляются там, где коснулись
        this.on(canvas, "touchstart", (e:TouchEvent) => {
            e.preventDefault();
            for (const touch of Array.from(e.changedTouches)) {
                const stick = {
                    id: touch.identifier, originX: touch.clientX, originY: touch.clientY,
                    x: touch.clientX, y: touch.clientY
                };
                if (touch.clientX < window.innerWidth / 2) {
                    this.moveStick = this.moveStick || stick;
                } else {
                    this.aimStick = this.aimStick || stick;
                }
            }
        }, { passive: false });
        this.on(canvas, "touchmove", (e:TouchEvent) => {
            e.preventDefault();
            for (const touch of Array.from(e.changedTouches)) {
                const stick = this.moveStick?.id === touch.identifier ? this.moveStick
                    : this.aimStick?.id === touch.identifier ? this.aimStick : null;
                if (stick) {
                    stick.x = touch.clientX;
                    stick.y = touch.clientY;
                }
            }
        }, { passive: false });
        const endTouch = (e:TouchEvent) => {
            for (const touch of Array.from(e.changedTouches)) {
                if (this.moveStick?.id === touch.identifier) {
                    this.moveStick = null;
                }
                if (this.aimStick?.id === touch.identifier) {
                    this.aimStick = null;
                }
            }
        };
        this.on(canvas, "touchend", endTouch);
        this.on(canvas, "touchcancel", endTouch);
    }

    private on(target:EventTarget, name:string, handler:(e:any) => void, options?:AddEventListenerOptions) {
        target.addEventListener(name, handler, options);
        this.handlers.push([target, name, handler]);
    }

    private clear() {
        this.keys.clear();
        this.mouseDown = false;
        this.moveStick = null;
        this.aimStick = null;
    }

    private aimDrag() {
        return this.aimStick ? Math.hypot(this.aimStick.x - this.aimStick.originX, this.aimStick.y - this.aimStick.originY) : 0;
    }

    /**
     * Направление бега: вектор длиной не больше 1. Стик даёт плавную скорость, клавиши — полную.
     */
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

    /**
     * Угол прицела со стика. Пока стик не трогают, остаётся последний угол.
     */
    get aimAngle():number | null {
        if (this.aimStick && this.aimDrag() >= AIM_DEADZONE) {
            this.lastAim = Math.atan2(this.aimStick.y - this.aimStick.originY, this.aimStick.x - this.aimStick.originX);
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
                list.push({ originX: stick.originX, originY: stick.originY, x: stick.originX + dx * k, y: stick.originY + dy * k });
            }
        }
        return list;
    }

    get sprinting() {
        return this.sprintToggle || this.isKey("ShiftLeft") || this.isKey("ShiftRight");
    }

    isKey(code:string) {
        return this.keys.has(code);
    }

    get isFiring() {
        return this.mouseDown || this.aimDrag() >= AIM_DEADZONE;
    }

    get mouse() {
        return { x: this.mouseX, y: this.mouseY };
    }

    destroy() {
        this.handlers.forEach(([target, name, handler]) => target.removeEventListener(name, handler));
        this.handlers = [];
    }
}
