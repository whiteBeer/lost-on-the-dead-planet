import express, { Express, Request, Response } from "express";
import { Server as HttpServer } from "http";
import { roomIdValidator } from "./classes/Validator";
import { RoomsManager } from "./classes/RoomsManager";
import { emitManager } from "./classes/EmitManager";
import { NotFoundError, BadRequestError } from "./errors";
import errorHandlerMiddleware from "./middleware/errorHandler";
import notFoundMiddleware from "./middleware/notFound";

import cors from "cors";

export class AppApiServer {
    private readonly app: Express;
    private readonly roomsManager: RoomsManager;

    constructor(httpServer: HttpServer, roomsManager: RoomsManager) {
        this.roomsManager = roomsManager;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();

        httpServer.on("request", this.app);
    }

    private setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(express.json());
    }

    private setupRoutes(): void {
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

    private async createRoom(req: Request, res: Response): Promise<void> {
        await roomIdValidator.validateAsync(req.params);
        const isCreated = this.roomsManager.createRoom(req.params.roomId);
        if (!isCreated) {
            throw new BadRequestError("Scene already exists");
        } else {
            res.json({isCreated});
        }
    }

    private async getScene(req: Request, res: Response): Promise<void> {
        await roomIdValidator.validateAsync(req.params);
        const roomScene = this.roomsManager.getRoomScene(req.params.roomId);
        if (!roomScene) {
            throw new NotFoundError("Scene not found");
        } else {
            res.json(roomScene.getScene());
        }
    }

    private async newGame(req: Request, res: Response): Promise<void> {
        await roomIdValidator.validateAsync(req.params);
        const roomId = req.params.roomId;
        const roomScene = this.roomsManager.getRoomScene(roomId);
        if (!roomScene) {
            throw new NotFoundError("Scene not found");
        } else {
            roomScene.newGame();
            emitManager.emitSceneChanged(roomId, roomScene.getScene());
            res.json({});
        }
    }

    private addZombie(req: Request, res: Response): void {
        const roomId = req.params.roomId;
        const roomScene = this.roomsManager.getRoomScene(roomId);
        if (!roomScene) {
            throw new NotFoundError("Scene not found");
        } else {
            roomScene.enemiesCollection.addZombie();
            emitManager.emitSceneChanged(roomId, roomScene.getScene());
            res.json({});
        }
    }

    private addSpider(req: Request, res: Response): void {
        const roomId = req.params.roomId;
        const roomScene = this.roomsManager.getRoomScene(roomId);
        if (!roomScene) {
            throw new NotFoundError("Scene not found");
        } else {
            roomScene.enemiesCollection.addSpider();
            emitManager.emitSceneChanged(roomId, roomScene.getScene());
            res.json({});
        }
    }
}