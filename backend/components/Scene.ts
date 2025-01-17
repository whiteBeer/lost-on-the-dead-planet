import { Server } from "socket.io";

import { Enemies } from "./Enemies";
import { Missiles } from "./Missiles";
import { Players } from "./Players";

export class Scene {

    io:Server;

    width = 700;
    height = 700;

    enemiesCollection:Enemies;
    missilesCollection:Missiles;
    playersCollection:Players;

    constructor(io:Server) {
        this.io = io;
        this.enemiesCollection = new Enemies(this);
        this.missilesCollection = new Missiles(this);
        this.playersCollection = new Players(this);

        // setInterval(() => {
        //     this.verifyScene();
        // }, 50);
    }

    // verifyScene () {
    //     const players = this.playersCollection.getPlayers();
    //     const enemies = this.enemiesCollection.getEnemies();
    //
    //     players.forEach(player => {
    //         enemies.forEach(enemy => {
    //             const leftBottom = (player.rotation - Math.PI/2)
    //         });
    //     });
    // }
}