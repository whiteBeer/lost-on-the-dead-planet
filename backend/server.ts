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

    const newPlayer = scene.addPlayer(socket.id);
    if (newPlayer) {
        console.log("Connected: " + socket.id, newPlayer);

        socket.on("playerMoved", (params: Player) => {
            const currentPlayerIndex = scene.updatePlayer(socket.id, params);
            if (currentPlayerIndex !== -1) {
                io.emit("playerMoved", scene.players[currentPlayerIndex]);
            }
        });

        socket.on("disconnect", () => {
            scene.deletePlayer(socket.id);
            io.emit("userDisconnected", {
                socketId: socket.id
            });
            console.log("Disconnected ", socket.id, scene.players);
        });

        io.emit("allPlayers", scene.players);
    }

    io.emit("allEnemies", scene.enemiesCollection.getEnemies());
});

server.listen(PORT, () => {
    console.log("server running at http://localhost:" + PORT);
});