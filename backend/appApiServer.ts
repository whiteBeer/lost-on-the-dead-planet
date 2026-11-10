import express, { Express, Request, Response } from "express";
import { roomIdValidator } from "./classes/Validator";
import { RoomsManager } from "./classes/RoomsManager";
import { EmitManager } from "./classes/EmitManager";
import { NotFoundError } from "./errors";
import errorHandlerMiddleware from "./middleware/errorHandler";
import notFoundMiddleware from "./middleware/notFound";

import cors from "cors";

export class AppApiServer {
    private readonly app:Express;
    private readonly roomsManager:RoomsManager;
    private readonly emitManager:EmitManager;

    constructor(app:Express, roomsManager:RoomsManager, emitManager:EmitManager) {
        this.app = app;
        this.roomsManager = roomsManager;
        this.emitManager = emitManager;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupMiddleware():void {
        this.app.use(cors());
        this.app.use(express.json());
    }

    private setupRoutes():void {
        this.app.get("/", (req:Request, res:Response) => {
            res.json({ msg: "Zero Eliya: Lost On the Dead Asteroid." });
        });
        this.app.put("/api/rooms/:roomId", this.createRoom.bind(this));
        this.app.get("/api/rooms/:roomId/scene", this.getScene.bind(this));
        this.app.put("/api/rooms/:roomId/new-game", this.newGame.bind(this));
        this.app.put("/api/rooms/:roomId/players/:socketId/name", this.setPlayerName.bind(this));
        this.app.put("/api/sandbox/rooms/:roomId/add-zombie", this.addZombie.bind(this));
        this.app.put("/api/sandbox/rooms/:roomId/add-spider", this.addSpider.bind(this));
    }

    private setupErrorHandling():void {
        this.app.use(notFoundMiddleware);
        this.app.use(errorHandlerMiddleware);
    }

    private async createRoom(req:Request, res:Response):Promise<void> {
        await roomIdValidator.validateAsync(req.params);
        const roomId = req.params.roomId;
        const scene = this.roomsManager.createRoom(roomId);
        if (!scene) {
            res.json({ isCreated: false });
            return;
        } else {
            const sceneEvents = [
                "enemiesUpdated",
                "enemiesRemoved",
                "enemiesDamaged",
                "enemiesAdded",
                "enemyDied",
                "missilesAdded",
                "missilesRemoved",
                "playersDamaged",
                "playersDied",
                "pickupAdded",
                "pickupRemoved",
                "waveStarted",
                "waveCleared",
                "hitFx",
                "perkOffer",
                "playerStats",
                "sceneReset",
                "gameOver",
                "lobbyUpdated",
                "gameStarted",
                "gamePaused",
                "spectatorsUpdated"
            ];
            sceneEvents.forEach((sceneEvent) => {
                scene.on(sceneEvent, (data) => {
                    this.emitManager.emit(roomId, sceneEvent, Object.assign(
                        typeof data === "object" && data !== null ? data : { value: data },
                        { serverCurrentDateTime: new Date().toISOString() }
                    ));
                });
            });
            res.json({ isCreated: true });
        }
    }

    private async getScene(req:Request, res:Response):Promise<void> {
        await roomIdValidator.validateAsync(req.params);
        const roomScene = this.roomsManager.getRoomScene(req.params.roomId);
        if (!roomScene) {
            throw new NotFoundError("Scene not found");
        } else {
            res.json(roomScene.getSceneWithConfigs());
        }
    }

    private async newGame(req:Request, res:Response):Promise<void> {
        await roomIdValidator.validateAsync(req.params);
        const roomId = req.params.roomId;
        const roomScene = this.roomsManager.getRoomScene(roomId);
        if (!roomScene) {
            throw new NotFoundError("Scene not found");
        } else {
            roomScene.newGame();
            this.emitManager.emitSceneChanged(roomId, roomScene.getScene());
            res.json({});
        }
    }

    private async setPlayerName(req:Request, res:Response):Promise<void> {
        await roomIdValidator.validateAsync({ roomId: req.params.roomId });
        const roomId = req.params.roomId;
        const socketId = String(req.params.socketId || "");
        const roomScene = this.roomsManager.getRoomScene(roomId);
        if (!roomScene) {
            throw new NotFoundError("Scene not found");
        }
        const name = req.body?.name || "";
        const player = roomScene.playersCollection.getPlayerById(socketId);
        if (player) {
            player.setName(name);
            this.emitManager.emit(roomId, "playersUpdated", roomScene.playersCollection.getPlayersJSON());
            roomScene.emitLobbyState();
            res.json({ name: player.name });
            return;
        }
        const specName = roomScene.setSpectatorName(socketId, name);
        if (!specName) {
            throw new NotFoundError("Player not found");
        }
        res.json({ name: specName });
    }

    private addZombie(req:Request, res:Response):void {
        const roomId = req.params.roomId;
        const roomScene = this.roomsManager.getRoomScene(roomId);
        if (!roomScene) {
            throw new NotFoundError("Scene not found");
        } else {
            roomScene.enemiesCollection.addZombie();
            this.emitManager.emitSceneChanged(roomId, roomScene.getScene());
            res.json({});
        }
    }

    private addSpider(req:Request, res:Response):void {
        const roomId = req.params.roomId;
        const roomScene = this.roomsManager.getRoomScene(roomId);
        if (!roomScene) {
            throw new NotFoundError("Scene not found");
        } else {
            roomScene.enemiesCollection.addSpider();
            this.emitManager.emitSceneChanged(roomId, roomScene.getScene());
            res.json({});
        }
    }
}
