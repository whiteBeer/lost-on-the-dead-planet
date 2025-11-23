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
    }

    start(): void {
        const PORT = process.env.APP_PORT || 3000;
        this.httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
        // Обработка graceful shutdown
        process.on("SIGTERM", () => this.shutdown());
        process.on("SIGINT", () => this.shutdown());
    }

    private shutdown(): void {
        console.log("Shutting down server...");
        this.httpServer.close(() => {
            console.log("Server closed");
            process.exit(0);
        });
    }
}

new Server().start();