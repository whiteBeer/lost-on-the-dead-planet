import dotenv from "dotenv";
dotenv.config();
import { createServer } from "http";
import { AppApiServer } from "./appApiServer";
import { AppSocketServer } from "./appSocketServer";
import { RoomsManager } from "./classes/RoomsManager";

class Server {
    private readonly roomsManager: RoomsManager;
    private readonly httpServer: ReturnType<typeof createServer>;
    private readonly socketService: AppSocketServer;
    private readonly apiService: AppApiServer;

    constructor() {
        this.roomsManager = new RoomsManager();
        this.httpServer = createServer();

        this.apiService = new AppApiServer(this.httpServer, this.roomsManager);
        this.socketService = new AppSocketServer(this.httpServer, this.roomsManager);

        this.handleGlobalErrors();
    }

    start(): void {
        const PORT = process.env.APP_PORT || 3000;
        this.httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
        // Обработка graceful shutdown
        process.on("SIGTERM", () => this.shutdown("SIGTERM"));
        process.on("SIGINT", () => this.shutdown("SIGINT"));
    }

    private handleGlobalErrors(): void {
        process.on("uncaughtException", (err) => {
            console.error("Uncaught Exception:", err);
            this.shutdown("Uncaught Exception");
        });

        process.on("unhandledRejection", (reason) => {
            console.error("Unhandled Rejection:", reason);
            this.shutdown("Unhandled Rejection");
        });
    }

    private shutdown(signal: string): void {
        console.log(`Received ${signal}. Shutting down gracefully...`);
        this.httpServer.close(() => {
            console.log("Server closed");
            process.exit(0);
        });
    }
}

new Server().start();