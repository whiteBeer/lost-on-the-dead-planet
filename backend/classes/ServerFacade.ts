import {Server as WebSocketServer} from "socket.io";
import express, { Express } from "express";
import cors from "cors";

class ServerFacade {

    io:WebSocketServer;
    app:Express;

    constructor() {
        const PORT = process.env.APP_PORT;
        const app = express().use(cors());
        const httpServer = app.listen(PORT, () => {
            console.log("server running at http://localhost:" + PORT);
        });
        this.app = app;
        this.io = new WebSocketServer(httpServer, {
            cors: { origin: "*" }
        });
    }

    getHttpServer ():Express {
        return this.app;
    }

    getWebSocketServer ():WebSocketServer {
        return this.io;
    }

    emit (roomId:string, eventName:string, ...data:any[]) {
        // console.log("WebSocket emit: ", eventName, data);
        const room = this.io.to(roomId);
        room.emit.apply(room, [eventName, ...data]);
    }
}

export const server = new ServerFacade();