const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const url = process.env.ZB_FRONT || 'http://localhost:3064/?bot';

(async () => {
    const browser = await chromium.launch({
        headless: process.env.HEADED !== '1',
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    });
    try {
        for (const keyboard of ['granted', 'denied', 'unsupported']) {
            const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            const cdp = await context.newCDPSession(page);
            const { targetInfo } = await cdp.send('Target.getTargetInfo');
            const browserCdp = await browser.newBrowserCDPSession();
            await browserCdp.send('Browser.setPermission', {
                permission: { name: 'keyboard-lock' }, setting: keyboard === 'granted' ? 'granted' : 'denied',
                origin: new URL(url).origin, browserContextId: targetInfo.browserContextId
            });
            if (keyboard === 'unsupported') {
                await context.addInitScript(() => Object.defineProperty(navigator, 'keyboard', { value: undefined }));
            }
            await page.goto(url);
            await page.locator('#nick').fill(`UiFs${keyboard}`);
            await page.getByRole('button', { name: 'Играть', exact: true }).click();
            await page.waitForFunction(() => window.__lpt?.meState);
            await page.waitForFunction(() => !!document.fullscreenElement);
            const canvas = page.locator('canvas').first();
            await page.waitForFunction(() => document.querySelector('canvas').style.cursor === 'none');
            await page.keyboard.press('Tab');
            await page.locator('section[class*=Inventory_panel]').waitFor();
            await page.waitForFunction(() => document.querySelector('canvas').style.cursor === 'default');
            await page.waitForTimeout(300);
            await page.keyboard.press('Escape');
            if (keyboard !== 'granted' && await page.evaluate(() => !!document.fullscreenElement)) {
                // Synthetic key injection is not browser chrome on every platform.
                // Exercise the native fullscreen exit event explicitly as well.
                await page.evaluate(() => document.exitFullscreen());
            }
            await page.locator('section[class*=Inventory_panel]').waitFor({ state: 'hidden' });
            const keptFullscreen = await page.evaluate(() => !!document.fullscreenElement);
            if (keyboard === 'granted') assert(keptFullscreen, 'short Esc must close inventory without exiting fullscreen');
            if (keptFullscreen) await page.evaluate(() => document.exitFullscreen());
            await page.getByRole('button', { name: 'На весь экран', exact: false }).waitFor();
            await page.getByRole('button', { name: 'На весь экран', exact: false }).click();
            await page.waitForFunction(() => !!document.fullscreenElement);

            // Reproduce the actual incoming death snapshot, only in this test tab.
            // The shared production world/player is never killed by the test.
            await page.evaluate(() => new Promise(resolve => {
                const app = window.__lpt;
                app.socket.once('s', snapshot => {
                    app.socket.off('s');
                    window.__uiLiveSnapshot = snapshot;
                    app.applySnapshot({ ...snapshot, me: { ...snapshot.me, dead: true, hp: 0, canRespawn: true } });
                    app.pushHud(true);
                    resolve();
                });
            }));
            await page.getByRole('heading', { name: 'Ты погиб', exact: true }).waitFor();
            await page.waitForFunction(() => document.querySelector('canvas').style.cursor === 'default');
            const overlay = page.locator('div[class*=overlay]').filter({ has: page.getByRole('heading', { name: 'Ты погиб', exact: true }) });
            assert.equal(await overlay.evaluate(el => getComputedStyle(el).cursor), 'default');
            assert.notEqual(await overlay.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
            await page.evaluate(() => document.exitFullscreen());
            await page.getByRole('button', { name: 'На весь экран', exact: false }).click();
            await page.waitForFunction(() => !!document.fullscreenElement);
            await page.evaluate(() => {
                const app = window.__lpt;
                const emit = app.socket.emit.bind(app.socket);
                app.socket.emit = (event, ...args) => {
                    if (event === 'respawn') window.__respawnClicked = true;
                    return emit(event, ...args);
                };
            });
            await page.getByRole('button', { name: 'Вернуться в мир', exact: true }).click();
            assert(await page.evaluate(() => window.__respawnClicked), 'death screen must accept a real mouse click');
            await page.evaluate(() => {
                window.__lpt.applySnapshot(window.__uiLiveSnapshot);
                window.__lpt.pushHud(true);
            });
            await page.getByRole('heading', { name: 'Ты погиб', exact: true }).waitFor({ state: 'hidden' });
            await page.waitForFunction(() => document.querySelector('canvas').style.cursor === 'none');
            assert.deepEqual(errors, []);
            console.log(JSON.stringify({ keyboard, inventoryEscape: true, keptFullscreen, reenterFullscreen: true, deathCursor: true, deathClick: true, respawnCursor: true }));
            await context.close();
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
