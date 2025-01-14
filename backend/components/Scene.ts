import { Server } from "socket.io";

import { Enemies } from "./Enemies";
import { Missiles } from "./Missiles";
import { Players } from "./Players";

export class Scene {

    io:Server;

    width = 1000;
    height = 1000;

    enemiesCollection:Enemies;
    missilesCollection:Missiles;
    playersCollection:Players;

    constructor(io:Server) {
        this.io = io;
        this.enemiesCollection = new Enemies(this);
        this.missilesCollection = new Missiles(this);
        this.playersCollection = new Players(this);
    }
}