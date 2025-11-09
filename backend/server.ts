import {Socket} from "socket.io";
import {roomIdValidator} from "./classes/Validator";
import {server} from "./classes/ServerFacade";
import {RoomsManager} from "./classes/RoomsManager";
import {PlayerJSON} from "./types";
import errorHandlerMiddleware from "./middleware/errorHandler";
import notFoundMiddleware from "./middleware/notFound";
import {NotFoundError} from "./errors";

const app = server.getHttpServer();
const io = server.getWebSocketServer();

const roomsManager = new RoomsManager();

app.put("/api/rooms/:roomId", async (req, res, next) => {
    await roomIdValidator.validateAsync(req.params);
    const room = roomsManager.createRoom(req.params.roomId);
    res.json(room);
});

app.get("/api/rooms/:roomId/scene", async (req, res, next) => {
    await roomIdValidator.validateAsync(req.params);
    const roomScene = roomsManager.getRoomScene(req.params.roomId);
    if (roomScene) {
        res.json(roomScene.getScene());
    } else {
        throw new NotFoundError("Scene not found");
    }
});

app.put("/api/rooms/:roomId/new-game", async (req, res, next) => {
    await roomIdValidator.validateAsync(req.params);
    const roomId = req.params.roomId;
    const roomScene = roomsManager.getRoomScene(roomId);
    if (roomScene) {
        roomScene.newGame();
        res.json({});
        server.emit(roomId, "sceneChanged", roomScene.getScene());
    } else {
        res.json({});
    }
});

app.put("/api/sandbox/rooms/:roomId/add-zombie", (req, res) => {
    const roomId = req.params.roomId;
    const roomScene = roomsManager.getRoomScene(roomId);
    roomScene.enemiesCollection.addZombie();
    res.json({});
    server.emit(roomId, "sceneChanged", roomScene.getScene());
});

app.put("/api/sandbox/rooms/:roomId/add-spider", (req, res) => {
    const roomId = req.params.roomId;
    const roomScene = roomsManager.getRoomScene(roomId);
    roomScene.enemiesCollection.addSpider();
    res.json({});
    server.emit(roomId, "sceneChanged", roomScene.getScene());
});

io.on("connection", async (socket:Socket) => {
    const roomId = (socket?.handshake?.headers["room-id"] || "").toString();
    const roomScene = roomsManager.getRoomScene(roomId);
    if (roomScene) {
        socket.join(roomId);
        const scenePlayers = roomScene.playersCollection;
        const newPlayer = scenePlayers.addPlayer(socket.id);
        if (newPlayer) {
            console.log("Connected: " + socket.id, newPlayer);

            socket.on("playerMoved", (params: PlayerJSON) => {
                const currentPlayerIndex = scenePlayers.updatePlayer(socket.id, params);
                if (currentPlayerIndex !== -1) {
                    server.emit(roomId, "playerMoved", scenePlayers.getPlayers()[currentPlayerIndex]);
                }
            });

            socket.on("missileCreate", (params) => {
                roomScene.missilesCollection.createMissile(Object.assign(params, {
                    ownerId: socket.id
                }));
            });

            socket.on("disconnect", () => {
                scenePlayers.deletePlayer(socket.id);
                server.emit(roomId, "playerDisconnected", {
                    socketId: socket.id
                });
                console.log("Disconnected ", socket.id, scenePlayers.getPlayers());
            });

            server.emit(roomId, "allPlayers", scenePlayers.getPlayers());
        }
    }
});


app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
