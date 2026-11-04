// Нагрузка: node tests/load.js <url> <ботов> <секунд>. Боты бегают и стреляют, замеряются снимки и задержка.
const { io } = require("../../frontend/node_modules/socket.io-client");
const [url = "http://127.0.0.1:7789", botsArg = "50", secArg = "20"] = process.argv.slice(2);
const bots = Number(botsArg), seconds = Number(secArg);
let snapshots = 0, bytes = 0, errors = 0, welcomed = 0;
const sockets = [];
for (let i = 0; i < bots; i++) {
    const socket = io(url, { auth: { name: `bot${i}` }, transports: ["websocket"] });
    let me = null, angle = Math.random() * 6.28;
    socket.on("welcome", () => { welcomed++; });
    socket.on("connect_error", () => errors++);
    socket.on("s", (s) => {
        snapshots++;
        bytes += JSON.stringify(s).length;
        me = s.me;
        if (me.dead) socket.emit("respawn");
        if (me.offer) socket.emit("perk", 0);
    });
    setInterval(() => {
        if (!me) return;
        angle += (Math.random() - 0.5) * 0.5;
        socket.emit("input", { x: me.x + Math.cos(angle) * 9, y: me.y + Math.sin(angle) * 9, r: angle, f: true });
    }, 50);
    sockets.push(socket);
}
setTimeout(() => {
    const perBot = bytes / bots / seconds / 1024;
    console.log(JSON.stringify({ bots, welcomed, errors, snapshotsPerBotPerSec: +(snapshots / bots / seconds).toFixed(1), kbPerBotPerSec: +perBot.toFixed(1) }));
    process.exit(0);
}, seconds * 1000);
