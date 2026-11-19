type FullscreenDocument = Document & {
    webkitFullscreenElement?:Element;
    webkitFullscreenEnabled?:boolean;
    webkitExitFullscreen?:() => void;
};
type KeyboardNavigator = Navigator & {
    keyboard?:{ lock?:(keys:string[]) => Promise<void>; unlock?:() => void };
};

export function isFullscreen() {
    const doc = document as FullscreenDocument;
    return !!(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export function supportsFullscreen() {
    const doc = document as FullscreenDocument;
    return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

export function unlockGameKeyboard() {
    (navigator as KeyboardNavigator).keyboard?.unlock?.();
}

/** Must be called directly from a click/tap; the browser may ask for keyboard permission. */
export async function enterFullscreen():Promise<boolean> {
    if (isFullscreen()) return true;
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?:() => void };
    try {
        if (el.requestFullscreen) {
            await el.requestFullscreen({ navigationUI: "hide" });
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else {
            return false;
        }
        try {
            // Short Esc closes game panels; holding Esc still exits fullscreen.
            await (navigator as KeyboardNavigator).keyboard?.lock?.(["Escape", "Digit1", "Digit2", "Digit3"]);
        } catch {
            // Unsupported/denied: fullscreenchange closes panels and exposes the re-entry button.
        }
        return isFullscreen();
    } catch {
        return false;
    }
}
