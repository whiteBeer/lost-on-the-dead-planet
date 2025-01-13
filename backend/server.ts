import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { BackendScene } from "./classes/Scene";
import { Player } from "./types";

const PORT = 7789;
const server = createServer(express());
const io = new Server(server, {
    cors: { origin: "*" }
});

const scene = new BackendScene(io);

io.on("connection", async (socket:Socket) => {

    const scenePlayers = scene.playersCollection;
    const newPlayer = scenePlayers.addPlayer(socket.id);
    if (newPlayer) {
        console.log("Connected: " + socket.id, newPlayer);

        socket.on("playerMoved", (params: Player) => {
            const currentPlayerIndex = scenePlayers.updatePlayer(socket.id, params);
            if (currentPlayerIndex !== -1) {
                io.emit("playerMoved", scenePlayers.getPlayers()[currentPlayerIndex]);
            }
        });

        socket.on("missileCreate", (params) => {
            scene.missilesCollection.createMissile(params, socket.id);
        });

        socket.on("disconnect", () => {
            scenePlayers.deletePlayer(socket.id);
            io.emit("playerDisconnected", {
                socketId: socket.id
            });
            console.log("Disconnected ", socket.id, scenePlayers.getPlayers());
        });

        io.emit("allPlayers", scenePlayers.getPlayers());
    }

    io.emit("allEnemies", scene.enemiesCollection.getEnemies());
});

server.listen(PORT, () => {
    console.log("server running at http://localhost:" + PORT);
});