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

const scene = new BackendScene();

io.on("connection", (socket:Socket) => {

    scene.addPlayer(socket.id);

    console.log("Connected: " + socket.id, scene.players);

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
});

server.listen(PORT, () => {
    console.log("server running at http://localhost:" + PORT);
});