const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const front = process.env.WAVE_FRONT || 'http://localhost:3054';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        for (const [name, width, height, mobile] of [['desktop', 1280, 800, false], ['landscape', 844, 390, true], ['portrait', 390, 844, true]]) {
            const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(front);
            await page.locator('#room').fill(`hud${Date.now()}`);
            await page.getByRole('button', { name: 'Создать', exact: true }).click();
            await page.getByRole('heading', { name: 'Лобби', exact: true }).waitFor();
            await page.getByRole('button', { name: 'Поехали', exact: true }).click();
            const hud = page.getByRole('region', { name: 'Текущее оружие', exact: true });
            await hud.waitFor();
            await hud.getByRole('heading', { name: 'Пистолет', exact: true }).waitFor();
            await page.waitForFunction(() => {
                const image = document.querySelector('section[aria-label="Текущее оружие"] img');
                return image?.complete && image.naturalWidth > 0;
            });
            const meter = hud.getByRole('meter', { name: 'Магазин', exact: true });
            assert.equal(await meter.getAttribute('aria-valuenow'), '12');
            assert.equal(await meter.getAttribute('aria-valuemax'), '12');
            await page.keyboard.down('KeyF');
            await page.waitForFunction(() => Number(document.querySelector('[aria-label="Магазин"]').getAttribute('aria-valuenow')) < 12);
            await page.keyboard.up('KeyF');
            await page.keyboard.press('KeyR');
            await hud.getByText('Перезарядка…', { exact: true }).waitFor();
            await hud.getByText('Готово к бою', { exact: true }).waitFor();
            assert.equal(await meter.getAttribute('aria-valuenow'), '12', 'reload must update the HUD even without moving');
            assert(await hud.getByText('Запас ∞', { exact: true }).isVisible());
            const box = await hud.boundingBox();
            assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, 'card must fit the viewport');
            const hp = await page.getByRole('progressbar', { name: 'Здоровье', exact: true }).boundingBox();
            const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
            assert(!overlaps(box, hp), 'weapon card must not cover health');
            if (mobile) {
                const inventory = page.getByRole('button', { name: 'Рюкзак', exact: true });
                const inventoryBox = await inventory.boundingBox();
                assert(!overlaps(box, inventoryBox), 'weapon card must not cover the inventory button');
                await inventory.tap();
                await page.getByRole('heading', { name: 'Оружейный рюкзак', exact: true }).waitFor();
                await page.keyboard.press('Tab');
                await page.getByRole('heading', { name: 'Оружейный рюкзак', exact: true }).waitFor({ state: 'hidden' });
            }
            await page.screenshot({ path: `/tmp/wave-weapon-${name}.png` });
            const assetBase = front.replace(/\/$/, '');
            for (const id of ['Pistol', 'SMG', 'Rifle', 'Shotgun', 'Sniper']) {
                const asset = await page.request.get(`${assetBase}/img/weapon_${id}.png`);
                assert.equal(asset.status(), 200, `missing weapon icon ${id}`);
            }
            assert.deepEqual(errors, []);
            console.log(JSON.stringify({ name, icon: true, ammo: true, stationaryReload: true, mobileInventory: mobile, fits: true, errors }));
            await context.close();
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
