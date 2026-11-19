const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const front = process.env.WAVE_FRONT || 'http://127.0.0.1:3054';
const back = process.env.WAVE_BACK || 'http://127.0.0.1:3055';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const errors = [];
    try {
        for (const mobile of [false, true]) {
            const context = await browser.newContext(mobile
                ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
                : { viewport: { width: 1280, height: 720 } });
            const page = await context.newPage();
            page.on('pageerror', e => errors.push(e.message));
            const room = `uitest${Date.now()}`;
            const state = async () => {
                const response = await fetch(`${back}/api/rooms/${room}/scene`);
                assert(response.ok);
                return (await response.json()).players[0];
            };
            await page.goto(front);
            await page.locator('#room').fill(room);
            await page.getByRole('button', { name: 'Создать', exact: true }).click();
            await page.getByRole('heading', { name: 'Лобби', exact: true }).waitFor();
            const ready = page.getByRole('button', { name: 'Я готов', exact: true });
            if (await ready.count()) await ready.click();
            await page.getByRole('button', { name: 'Поехали', exact: true }).click();
            await page.locator('canvas').waitFor();
            const hp = page.getByRole('progressbar', { name: 'Здоровье', exact: true });
            const xp = page.getByRole('progressbar', { name: 'Опыт', exact: true });
            await hp.waitFor();
            assert.equal(Number(await hp.getAttribute('aria-valuemax')), (await state()).maxHealth);
            assert.equal(Number(await xp.getAttribute('aria-valuemax')), (await state()).expToNextLevel);
            assert(Number(await xp.getAttribute('aria-valuemax')) > 0);
            await page.keyboard.down('KeyW');
            await page.waitForTimeout(200);
            await page.keyboard.press('Tab');
            const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: /рюкзак/i }) });
            await panel.waitFor();
            const beforeTab = await state();
            await page.waitForTimeout(450);
            const afterTab = await state();
            assert(beforeTab.pageY - afterTab.pageY > 20, 'Tab inventory must not stop walking');
            const alpha = await panel.evaluate(el => getComputedStyle(el).backgroundColor.match(/[\d.]+/g).at(-1));
            assert(Number(alpha) <= 0.55, 'inventory must be transparent');
            await panel.getByRole('button').nth(1).click();
            const beforeClick = await state();
            await page.waitForTimeout(300);
            assert(beforeClick.pageY - (await state()).pageY > 15, 'inventory click must not stop walking');
            await page.keyboard.press('Tab');
            await page.locator('canvas').dispatchEvent('contextmenu', { button: 2 });
            const beforeContext = await state();
            await page.waitForTimeout(300);
            assert(beforeContext.pageY - (await state()).pageY > 15, 'right click must retain WASD');
            await page.keyboard.down('ArrowRight');
            await page.keyboard.down('KeyF');
            const beforeAim = await state();
            await page.waitForTimeout(500);
            const afterAim = await state();
            assert(beforeAim.pageY - afterAim.pageY > 20, 'keyboard aim and fire must retain movement');
            assert(Math.abs(afterAim.rotation) < 0.05, 'ArrowRight must aim right');
            assert(afterAim.weapon.ammo < beforeAim.weapon.ammo, 'F must fire');
            await page.keyboard.up('KeyW');
            await page.keyboard.up('KeyF');
            await page.keyboard.up('ArrowRight');
            await page.waitForTimeout(150);
            const stopped = await state();
            await page.waitForTimeout(250);
            assert(Math.abs((await state()).pageY - stopped.pageY) < 2, 'keyup must stop walking');
            await page.keyboard.down('KeyW');
            await page.evaluate(() => window.dispatchEvent(new Event('blur')));
            await page.waitForTimeout(150);
            const blurred = await state();
            await page.waitForTimeout(250);
            assert(Math.abs((await state()).pageY - blurred.pageY) < 2, 'window blur must still stop walking');
            await page.keyboard.up('KeyW');
            console.log(JSON.stringify({ mobile, tabMovement: true, contextMenuMovement: true, keyboardAimFire: true, bars: true, transparentInventory: true }));
            await context.close();
        }
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
