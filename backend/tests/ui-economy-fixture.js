// Local-only fixture: never used by production app.js. Control HTTP binds loopback.
const { createServer } = require('node:http');
const { Scene } = require('../dist/components/Scene');
const scenes = new Map();
const start = Scene.prototype.startGameByHost;
Scene.prototype.startGameByHost = function (id) {
    const result = start.call(this, id);
    if (result) scenes.set(this.getRoomId(), this);
    return result;
};
const control = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const scene = scenes.get(url.searchParams.get('room'));
    if (req.method !== 'POST' || !scene) { res.writeHead(404); res.end(); return; }
    if (url.pathname === '/kill' || url.pathname === '/wipe') {
        scene.waveDirector.pause();
        const players = scene.playersCollection.getPlayers();
        const targets = url.pathname === '/wipe' ? players : players.slice(1, 2);
        targets.forEach(player => {
            player.isDead = true; player.health = 0;
            scene.emit('playersDied', { socketId: player.socketId });
        });
        if (url.pathname === '/wipe') scene.wipeIfNoSurvivors();
    } else if (url.pathname === '/clear') {
        scene.waveDirector.reset();
        scene.enemiesCollection.removeAllEnemies();
        scene.waveDirector.wave = 1;
        scene.waveDirector.started = true;
        scene.waveDirector.active = true;
        scene.waveDirector.onEnemiesCleared();
        scene.waveDirector.pause();
    } else { res.writeHead(404); res.end(); return; }
    res.end('ok');
});
control.listen(Number(process.env.UI_CONTROL_PORT || 3076), '127.0.0.1');
process.on('SIGTERM', () => control.close());
require('../dist/app');
