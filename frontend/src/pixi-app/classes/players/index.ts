import { Scene } from "../Scene";
import { App } from "../../App";
import { BackendPlayer } from "../../Types";
import Player from "./Player";

interface IPlayerDisconnected {
    socketId:string;
}

interface IPlayerReloadEvent {
    socketId:string;
    newAmmo:number;
}

export class PlayersCollection {

    app:App;
    scene:Scene;

    players:Player[] = [];

    constructor(app:App, scene:Scene) {
        this.app = app;
        this.scene = scene;

        this.app.socket?.on("playersUpdated", (backendPlayers:BackendPlayer[]) => {
            this.updatePlayers(backendPlayers);
        });

        this.app.socket?.on("playerMoved", (params:BackendPlayer) => {
            if (params.socketId !== this.app.socket?.id) {
                const player = this.findPlayer(params.socketId);
                if (player) {
                    player.moveTo(params.pageX, params.pageY, params.rotation);
                } else {
                    this.addPlayer(params);
                }
            }
        });

        this.app.socket?.on("playerDisconnected", (params:IPlayerDisconnected) => {
            const player = this.findPlayer(params.socketId);
            if (player) {
                player.remove();
                this.players = this.players.filter(el => el.socketId !== params.socketId);
            }
        });

        this.app.socket?.on("playersReloadStarted", (params:IPlayerReloadEvent) => {
            const player = this.findPlayer(params.socketId);
            if (player && player.socketId === this.app.socket?.id) {
                player.weapon.isReloading = true;
            }
        });

        this.app.socket?.on("playersReloadFinished", (params:IPlayerReloadEvent) => {
            const player = this.findPlayer(params.socketId);
            if (player && player.socketId === this.app.socket?.id) {
                player.weapon.ammo = params.newAmmo;
                player.weapon.isReloading = false;
            }
        });
    }

    findPlayer(socketId:string):Player | undefined {
        return this.players.find(el => el.socketId === socketId);
    }

    addPlayer(params:BackendPlayer):Player {
        const player = new Player(this.app, params);
        this.players.push(player);
        this.scene.addToScene(player.getPixiObj());
        return player;
    }

    updatePlayers(backendPlayers:BackendPlayer[]) {
        backendPlayers.forEach((backendPlayer:BackendPlayer) => {
            const player = this.findPlayer(backendPlayer.socketId);
            if (player) {
                player.update(backendPlayer);
            } else {
                const newPlayer = this.addPlayer(backendPlayer);
                if (newPlayer.socketId === this.app.socket?.id) {
                    this.app.scene?.setMePlayer(newPlayer);
                }
            }
        });
    }

    initPlayers(backendPlayers:BackendPlayer[]):Player | undefined {
        this.updatePlayers(backendPlayers);
        return this.findPlayer(this.app.socket?.id || "");
    }

    getPlayers() {
        return this.players;
    }
}