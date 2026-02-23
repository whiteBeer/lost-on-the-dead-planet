import express, { Express, Request, Response } from "express";
import { roomIdValidator } from "./classes/Validator";
import { RoomsManager } from "./classes/RoomsManager";
import { EmitManager } from "./classes/EmitManager";
import { NotFoundError, BadRequestError } from "./errors";
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
            res.json({ msg: "Lost on the dead Planet." });
        });
        this.app.put("/api/rooms/:roomId", this.createRoom.bind(this));
        this.app.get("/api/rooms/:roomId/scene", this.getScene.bind(this));
        this.app.put("/api/rooms/:roomId/new-game", this.newGame.bind(this));
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
            throw new BadRequestError("Scene already exists");
        } else {
            const sceneEvents = [
                "enemiesUpdated",
                "enemiesRemoved",
                "enemiesDamaged",
                "missilesAdded",
                "missilesRemoved",
                "playersDamaged",
                "playersDied"
            ];
            sceneEvents.forEach((sceneEvent) => {
                scene.on(sceneEvent, (data) => {
                    this.emitManager.emit(roomId, sceneEvent, Object.assign(data, {
                        serverCurrentDateTime: new Date().toISOString()
                    }));
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