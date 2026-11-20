const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');
const { ProfileStore } = require('../../backend/dist/classes/ProfileStore');

(async () => {
    const directory = mkdtempSync(join(tmpdir(), 'wave-shop-ui-'));
    const database = join(directory, 'profiles.json');
    const token = randomBytes(32).toString('hex'); // Test identity never printed or committed.
    const store = new ProfileStore(database);
    const key = store.ensureToken(token);
    store.rewardLevel(key, 'local-ui-seed', 50);
    let server;
    const startServer = async () => {
        server = spawn(process.execPath, ['tests/ui-economy-fixture.js'], {
            cwd: resolve(__dirname, '../../backend'), stdio: 'ignore',
            env: { ...process.env, APP_PORT: '3075', APP_HOST: '127.0.0.1', UI_CONTROL_PORT: '3076', PROFILE_DB_PATH: database }
        });
        for (let attempt = 0; attempt < 60; attempt++) {
            try { if ((await fetch('http://127.0.0.1:3075/')).ok) return; } catch {}
            await new Promise(done => setTimeout(done, 100));
        }
        throw new Error('local fixture did not start');
    };
    const stopServer = async () => { if (server && server.exitCode === null) { server.kill('SIGTERM'); await new Promise(done => server.once('exit', done)); } };
    await startServer();
    const browser = await chromium.launch({ headless: true });
    const errors = [];
    try {
        const aContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await aContext.addInitScript(value => localStorage.setItem('wave-arena-profile', value), token);
        const a = await aContext.newPage();
        a.on('pageerror', error => errors.push(error.message));
        a.on('console', message => { if (message.type() === 'warning' && message.text().includes('Texture managed by Assets was destroyed')) errors.push('shared texture was destroyed'); });
        const front = process.env.WAVE_FRONT || 'http://localhost:3074';
        await a.goto(`${front}/shop`);
        const ember = a.getByRole('article').filter({ has: a.getByRole('heading', { name: 'Алый рейдер', exact: true }) });
        await ember.getByRole('button', { name: 'Купить', exact: true }).click();
        await ember.getByRole('button', { name: 'Надеть', exact: true }).click();
        await ember.getByRole('button', { name: 'Надето', exact: true }).waitFor();
        await a.reload();
        await ember.getByRole('button', { name: 'Надето', exact: true }).waitFor();
        for (const img of await a.locator('article img').all()) assert(await img.evaluate(el => el.complete && el.naturalWidth > 0));
        await a.screenshot({ path: '/tmp/wave-shop-desktop.png' });
        const room = `shop${Date.now()}`;
        await a.getByRole('button', { name: 'В меню', exact: true }).click();
        await a.locator('#room').fill(room);
        await a.getByRole('button', { name: 'Создать', exact: true }).click();
        await a.getByRole('heading', { name: 'Лобби', exact: true }).waitFor();
        const bContext = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
        const b = await bContext.newPage();
        b.on('pageerror', error => errors.push(error.message));
        await b.goto(front, { waitUntil: 'networkidle' });
        await b.locator('#room').fill(room);
        await b.getByRole('button', { name: 'Войти', exact: true }).click();
        await b.getByRole('heading', { name: 'Лобби', exact: true }).waitFor();
        await a.getByRole('button', { name: 'Я готов', exact: true }).click();
        await b.getByRole('button', { name: 'Я готов', exact: true }).click();
        await a.getByRole('button', { name: 'Поехали', exact: true }).click();
        await a.getByRole('region', { name: 'Текущее оружие', exact: true }).waitFor();
        const state = async () => (await (await fetch(`http://localhost:3075/api/rooms/${room}/scene`)).json()).players;
        assert.equal((await state())[0].skinId, 'ember', 'purchased skin must be used in the match');
        for (let cycle = 0; cycle < 3; cycle++) {
            await fetch(`http://127.0.0.1:3076/kill?room=${room}`, { method: 'POST' });
            await b.getByRole('heading', { name: 'Ты погиб', exact: true }).waitFor();
            await fetch(`http://127.0.0.1:3076/clear?room=${room}`, { method: 'POST' });
            await b.getByRole('heading', { name: 'Ты погиб', exact: true }).waitFor({ state: 'hidden' });
            await b.getByRole('region', { name: 'Текущее оружие', exact: true }).waitFor();
            assert.equal((await state())[1].isDead, false);
            const before = (await state())[1].pageY;
            await b.keyboard.down('KeyW'); await b.waitForTimeout(350); await b.keyboard.up('KeyW');
            assert((await state())[1].pageY < before - 10, 'revived player must regain movement');
        }
        await a.screenshot({ path: '/tmp/wave-ember-in-game.png' });
        await fetch(`http://127.0.0.1:3076/wipe?room=${room}`, { method: 'POST' });
        await a.getByRole('button', { name: 'В магазин', exact: true }).click();
        await ember.getByRole('button', { name: 'Надето', exact: true }).waitFor();
        await bContext.close();
        // Re-enter without reloading the document: shared sprite/skin cache must survive.
        await a.getByRole('button', { name: 'В меню', exact: true }).click();
        await a.locator('#room').fill(room);
        await a.getByRole('button', { name: 'Создать', exact: true }).click();
        await a.getByRole('button', { name: 'Поехали', exact: true }).click();
        await a.getByRole('region', { name: 'Текущее оружие', exact: true }).waitFor();
        await a.waitForTimeout(400);
        await a.keyboard.press('Escape');
        await a.getByRole('button', { name: 'В меню', exact: true }).click();
        await a.getByRole('button', { name: 'Магазин скинов', exact: true }).click();
        await ember.getByRole('button', { name: 'Надето', exact: true }).waitFor();
        await stopServer();
        await startServer();
        await a.reload();
        await ember.getByRole('button', { name: 'Надето', exact: true }).waitFor();
        assert.equal(new ProfileStore(database).view(key).coins, 119, 'wallet must survive full backend restart');
        await a.setViewportSize({ width: 390, height: 844 });
        await a.screenshot({ path: '/tmp/wave-shop-mobile.png' });
        assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const missingAuth = await fetch('http://localhost:3075/api/profile');
        assert.equal(missingAuth.status, 401);
        const poorToken = randomBytes(32).toString('hex');
        const forged = await fetch('http://localhost:3075/api/profile/buy', { method: 'POST', headers: { Authorization: `Bearer ${poorToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: 'ember', coins: 100000, price: 0 }) });
        assert.equal(forged.status, 400, 'client cannot forge price/balance');
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ ok: true, buyEquip: true, skinInMatch: true, reviveCycles: 3, controlsAfterRevive: true, storeAfterMatch: true, persistenceAfterRestart: true, mobileShop: true, forgedBalanceRejected: true, errors }));
    } finally {
        await browser.close();
        await stopServer();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
