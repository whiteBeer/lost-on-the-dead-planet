import dotenv from "dotenv";
import { createServer } from "http";
import express, { Express } from "express";
import { Server as SocketIOServer } from "socket.io";
import { AppApiServer } from "./appApiServer";
import { AppSocketServer } from "./appSocketServer";
import { RoomsManager } from "./classes/RoomsManager";
import { EmitManager } from "./classes/EmitManager";

dotenv.config();

class Server {
    private readonly httpServer:ReturnType<typeof createServer>;
    private readonly app:Express;
    private readonly io:SocketIOServer;
    private readonly roomsManager:RoomsManager;
    private readonly emitManager:EmitManager;
    private readonly socketService:AppSocketServer;
    private readonly apiService:AppApiServer;

    constructor() {
        // this is here because init order important
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = new SocketIOServer(this.httpServer, {
            cors: { origin: "*" }
        });

        this.roomsManager = new RoomsManager();
        this.emitManager = new EmitManager(this.io);

        this.apiService = new AppApiServer(this.app, this.roomsManager, this.emitManager);
        this.socketService = new AppSocketServer(this.io, this.roomsManager, this.emitManager);

        this.handleGlobalErrors();
    }

    start():void {
        const PORT = process.env.APP_PORT || 3000;
        this.httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
        process.on("SIGTERM", () => this.shutdown("SIGTERM"));
        process.on("SIGINT", () => this.shutdown("SIGINT"));
    }

    private handleGlobalErrors():void {
        process.on("uncaughtException", (err) => {
            console.error("Uncaught Exception:", err);
            this.shutdown("Uncaught Exception");
        });

        process.on("unhandledRejection", (reason) => {
            console.error("Unhandled Rejection:", reason);
            this.shutdown("Unhandled Rejection");
        });
    }

    private shutdown(signal:string):void {
        console.log(`Received ${signal}. Shutting down gracefully...`);
        this.httpServer.close(() => {
            console.log("Server closed");
            process.exit(0);
        });
    }
}

new Server().start();