import {Socket} from "socket.io";
import {Scene} from "./components/Scene";
import {server} from "./classes/ServerFacade";
import {PlayerJSON} from "./types";

const app = server.getHttpServer();
const io = server.getWebSocketServer();

const scene = new Scene();

app.get("/api/scene", (req, res) => {
    res.json(scene.getScene());
});

app.put("/api/new-game", (req, res) => {
    scene.newGame();
    res.json({});
    server.emit("sceneChanged", scene.getScene());
});

app.put("/api/sandbox/add-zombie", (req, res) => {
    scene.enemiesCollection.addZombie();
    res.json({});
    server.emit("sceneChanged", scene.getScene());
});

app.put("/api/sandbox/add-spider", (req, res) => {
    scene.enemiesCollection.addSpider();
    res.json({});
    server.emit("sceneChanged", scene.getScene());
});

io.on("connection", async (socket:Socket) => {

    const scenePlayers = scene.playersCollection;
    const newPlayer = scenePlayers.addPlayer(socket.id);
    if (newPlayer) {
        console.log("Connected: " + socket.id, newPlayer);

        socket.on("playerMoved", (params: PlayerJSON) => {
            const currentPlayerIndex = scenePlayers.updatePlayer(socket.id, params);
            if (currentPlayerIndex !== -1) {
                server.emit("playerMoved", scenePlayers.getPlayers()[currentPlayerIndex]);
            }
        });

        socket.on("missileCreate", (params) => {
            scene.missilesCollection.createMissile(Object.assign(params, {
                ownerId: socket.id
            }));
        });

        socket.on("disconnect", () => {
            scenePlayers.deletePlayer(socket.id);
            server.emit("playerDisconnected", {
                socketId: socket.id
            });
            console.log("Disconnected ", socket.id, scenePlayers.getPlayers());
        });

        server.emit("allPlayers", scenePlayers.getPlayers());
    }
});