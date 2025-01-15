import express from "express";
import cors from "cors";
import { Server, Socket } from "socket.io";
import { Scene } from "./components/Scene";
import { Player } from "./types";

const PORT = 7789;
const app = express().use(cors());
const server = app.listen(PORT, () => {
    console.log("server running at http://localhost:" + PORT);
});
const io = new Server(server, {
    cors: { origin: "*" }
});

const scene = new Scene(io);

app.get("/api/scene", (req, res) => {
    res.json({
        serverCurrentDateTime: new Date().toISOString(),
        width: scene.width,
        height: scene.height,
        players: scene.playersCollection.getPlayers(),
        enemies: scene.enemiesCollection.getEnemies(),
        missiles: scene.missilesCollection.getMissiles()
    });
});

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
});