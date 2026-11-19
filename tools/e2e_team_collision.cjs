const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const front = process.env.ZB_FRONT || 'http://localhost:3064/?bot';

(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const errors = [];
    try {
        const pages = [];
        for (const name of ['TeamUiA', 'TeamUiB']) {
            const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await context.newPage();
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(front);
            await page.locator('#nick').fill(name);
            await page.getByRole('button', { name: 'Играть', exact: true }).click();
            await page.waitForFunction(() => window.__lpt?.meState);
            pages.push(page);
        }
        const [a, b] = pages;
        const button = a.getByRole('button', { name: 'Команда (T)', exact: true });
        assert(await button.isVisible(), 'team access must be visible on desktop');
        await button.click();
        await b.getByRole('button', { name: 'Команда (T)', exact: true }).click();
        const row = a.locator('#team-panel li').filter({ hasText: 'TeamUiB' });
        await row.getByRole('button', { name: 'Позвать', exact: true }).click();
        await b.getByRole('button', { name: 'Принять (Y)', exact: true }).click();
        await a.waitForFunction(() => window.__lpt.meState.teamId > 0);
        await b.waitForFunction(() => window.__lpt.meState.teamId > 0);
        assert.equal(await a.evaluate(() => window.__lpt.meState.teamId), await b.evaluate(() => window.__lpt.meState.teamId));

        const errorAfterWall = await a.evaluate(() => new Promise(resolve => {
            const app = window.__lpt;
            app.socket.once('s', snapshot => {
                const saved = app.map.collision;
                const x = snapshot.me.x;
                const y = snapshot.me.y;
                const wall = { alive: true, shape: 'r', kind: 'wall', x: x + 30, y, w: 8, h: 100 };
                app.map.collision = new Map();
                for (let cx = Math.floor((wall.x - 50) / 200); cx <= Math.floor((wall.x + 50) / 200); cx++) {
                    for (let cy = Math.floor((y - 50) / 200); cy <= Math.floor((y + 50) / 200); cy++) app.map.collision.set(cx * 100000 + cy, [wall]);
                }
                app.x = x + 60;
                app.y = y;
                app.applySnapshot(snapshot);
                const error = Math.hypot(app.x - x, app.y - y);
                app.map.collision = saved;
                app.x = x;
                app.y = y;
                resolve(error);
            });
        }));
        assert(errorAfterWall < 0.001, 'a 60px client error through a wall must reconcile immediately');
        assert.deepEqual(errors, []);
        await a.screenshot({ path: '/tmp/zombies-desktop-team.png' });
        console.log(JSON.stringify({ ok: true, visibleDesktopTeam: true, invite: true, accept: true, sameTeam: true, wallReconciliation: true, errors }));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
