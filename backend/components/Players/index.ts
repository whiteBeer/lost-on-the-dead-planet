import { PlayerJSON } from "../../types";
import { Scene } from "../Scene";
import { PLAYER_COLORS } from "../../configs/Players";
import { Player } from "./Player";

export class Players {

    private readonly scene: Scene;
    private playerColors: string[] = PLAYER_COLORS || [];
    private players: Player[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
    }

    getPlayers() {
        return this.players;
    }

    getPlayersJSON(): PlayerJSON[] {
        return this.players.map(el => el.toJSON());
    }

    getPlayerById(socketId: string): Player | undefined {
        return this.players.find(player => player.socketId === socketId);
    }

    addPlayer(socketId: string): Player | null {
        const existingColors = this.players.map(el => el.color);
        const color = this.playerColors.find(el => !existingColors.includes(el));

        if (color) {
            const startX = Math.round(Math.random() * this.scene.getWidth());
            const startY = Math.round(Math.random() * this.scene.getHeight());
            const newPlayer = new Player(socketId, color, startX, startY);
            newPlayer.rotation = Math.random() * 6;
            this.players.push(newPlayer);
            return newPlayer;
        } else {
            console.warn("Room full. Cannot find color for new player.");
            return null;
        }
    }

    updatePlayer(socketId: string, params: PlayerJSON): number {
        const index = this.players.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            const player = this.players[index];
            player.pageX = params.pageX;
            player.pageY = params.pageY;
            player.rotation = params.rotation;
            return index;
        }
        return -1;
    }

    deletePlayer(socketId: string): void {
        const index = this.players.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            this.players.splice(index, 1);
        }
    }
}