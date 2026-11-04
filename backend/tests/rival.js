// Бот-соперник рядом с точкой площадки: node tests/rival.js <url> <имя>
const { io } = require("../../frontend/node_modules/socket.io-client");
const [url = "http://127.0.0.1:7789", name = "botВася"] = process.argv.slice(2);
const socket = io(url, { auth: { name }, transports: ["websocket"] });
let me = null, invited = false, target = 0;
socket.on("s", (s) => { me = s.me; if (me.dead) socket.emit("respawn"); });
socket.on("roster", (r) => {
    const other = r.rows.find(el => !el.name.startsWith("bot"));
    if (other && !invited) { invited = true; target = other.id; socket.emit("teamInvite", other.id); console.log("invited", other.name); }
});
setInterval(() => {
    if (!me) return;
    const dx = 2120 - me.x, dy = 1500 - me.y, d = Math.hypot(dx, dy);
    const step = Math.min(d, 8.5);
    socket.emit("input", { x: me.x + (d ? dx / d * step : 0), y: me.y + (d ? dy / d * step : 0), r: Math.PI, f: false });
}, 50);
