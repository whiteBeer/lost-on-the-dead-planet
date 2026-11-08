import dotenv from "dotenv";
import { createServer } from "http";
import express from "express";
import { Server as SocketIOServer, Socket } from "socket.io";
import { World } from "./World";

dotenv.config();

const isLocal = process.env.NODE_ENV === "local";

class Server {
    private readonly app = express();
    private readonly httpServer = createServer(this.app);
    private readonly world = new World();
    private readonly io:SocketIOServer;

    constructor() {
        this.io = new SocketIOServer(this.httpServer, {
            // Если клиент и сервер на разных доменах, адрес клиента задаётся в CORS_ORIGIN
            cors: process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : isLocal ? { origin: "*" } : undefined,
            perMessageDeflate: false,
            maxHttpBufferSize: 16 * 1024
        });

        this.app.get("/", (_req, res) => {
            res.json({ msg: "Lost on the dead planet." });
        });
        this.app.get("/api/health", (_req, res) => {
            res.json({ players: this.world.playerCount, enemies: this.world.enemyCount });
        });

        this.io.on("connection", socket => this.onConnection(socket));
        this.world.on("snapshot", () => this.sendSnapshots());
        this.world.on("roster", () => this.sendRoster());
        this.world.on("feed", event => this.io.emit("feed", event));
        this.world.on("announce", text => this.io.emit("announce", text));
        this.world.start();
        this.handleGlobalErrors();
    }

    private onConnection(socket:Socket) {
        const player = this.world.addPlayer(socket.id, socket.handshake.auth?.name);
        if (!player) {
            socket.emit("worldFull");
            socket.disconnect();
            return;
        }
        socket.emit("welcome", { id: player.id, world: this.world.getPublicConfig() });

        // Простое ограничение частоты сообщений на сокет
        let windowStart = Date.now();
        let count = 0;
        socket.use((_event, next) => {
            const now = Date.now();
            if (now - windowStart > 1000) {
                windowStart = now;
                count = 0;
            }
            if (++count <= 240) {
                next();
            }
        });

        socket.on("input", input => this.world.handleInput(player, input));
        socket.on("reload", () => this.world.reload(player));
        socket.on("pickup", (want, id) => this.world.takePickup(player, want, id));
        socket.on("perk", index => this.world.pickPerk(player, index));
        socket.on("useSlot", index => this.world.useSlot(player, index));
        socket.on("dropSlot", index => this.world.dropSlot(player, index));
        socket.on("unequip", what => this.world.unequip(player, what));
        socket.on("slot", which => this.world.switchSlot(player, which));
        socket.on("trade", tradeId => this.world.trade(player, tradeId));
        socket.on("quest", (questId, action) => this.world.quest(player, questId, action));
        socket.on("moveSlot", (from, to) => this.world.moveSlot(player, from, to));
        socket.on("quickUse", what => this.world.quickUse(player, what));
        socket.on("dash", () => this.world.dash(player));
        socket.on("craft", recipeId => this.world.craft(player, recipeId));
        socket.on("heal", () => this.world.quickHeal(player));
        socket.on("grenade", () => this.world.useGrenade(player));
        socket.on("respawn", () => this.world.respawn(player));
        socket.on("teamInvite", (targetId) => {
            const target = this.world.invite(player, targetId);
            if (target) {
                this.io.to(target.socketId).emit("teamInvited", { fromId: player.id, fromName: player.name });
            }
        });
        socket.on("teamAccept", (fromId) => {
            if (this.world.acceptInvite(player, fromId)) {
                this.sendRoster();
            }
        });
        socket.on("teamLeave", () => {
            this.world.leaveTeam(player);
            this.sendRoster();
        });
        socket.on("disconnect", () => {
            this.world.removePlayer(socket.id);
        });

        this.sendRoster();
    }

    private sendSnapshots() {
        // Срубленные деревья и разбитые ящики видны всем, где бы они ни были
        const changes = this.world.takeObstacleChanges();
        if (changes.length) {
            this.io.emit("obs", changes);
        }
        for (const player of this.world.allPlayers()) {
            this.io.to(player.socketId).emit("s", this.world.buildSnapshot(player));
        }
    }

    private sendRoster() {
        const roster = this.world.buildRoster();
        for (const player of this.world.allPlayers()) {
            this.io.to(player.socketId).emit("roster", {
                ...roster,
                mates: this.world.getTeammatePositions(player)
            });
        }
    }

    start() {
        const PORT = Number(process.env.APP_PORT || 3000);
        // APP_HOST=127.0.0.1, если сервер стоит за обратным прокси
        this.httpServer.listen(PORT, process.env.APP_HOST || "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
        process.on("SIGTERM", () => this.shutdown("SIGTERM"));
        process.on("SIGINT", () => this.shutdown("SIGINT"));
    }

    private handleGlobalErrors() {
        process.on("uncaughtException", (err) => {
            console.error("Uncaught Exception:", err);
            this.shutdown("Uncaught Exception");
        });
        process.on("unhandledRejection", (reason) => {
            console.error("Unhandled Rejection:", reason);
            this.shutdown("Unhandled Rejection");
        });
    }

    private shutdown(signal:string) {
        console.log(`Received ${signal}. Shutting down...`);
        this.world.stop();
        this.io.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 2000).unref();
    }
}

new Server().start();
