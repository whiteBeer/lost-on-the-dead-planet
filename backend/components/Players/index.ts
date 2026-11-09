import { PlayerJSON } from "../../types";
import { Scene } from "../Scene";
import { PLAYER_COLORS } from "../../configs/Players";
import { Player } from "./Player";

export class Players {

    private readonly scene:Scene;
    private playerColors:string[] = PLAYER_COLORS || [];
    private players:Player[] = [];

    constructor(scene:Scene) {
        this.scene = scene;
    }

    getPlayers() {
        return this.players;
    }

    getLivePlayers() {
        return this.players.filter((el) => !el.isDead);
    }

    getPlayersJSON():PlayerJSON[] {
        return this.players.map(el => el.toJSON());
    }

    getPlayerById(socketId:string):Player | undefined {
        return this.players.find(player => player.socketId === socketId);
    }

    areAllReady() {
        return this.players.length > 0 && this.players.every(p => p.isReady);
    }

    clearReady() {
        this.players.forEach(p => p.setReady(false));
    }

    addPlayer(socketId:string):Player | null {
        if (!this.scene.isJoinable()) {
            return null;
        }
        const existingColors = this.players.map(el => el.color);
        const color = this.playerColors.find(el => !existingColors.includes(el));

        if (color) {
            const startX = Math.round(this.scene.getWidth() / 2 + (Math.random() - 0.5) * 120);
            const startY = Math.round(this.scene.getHeight() / 2 + (Math.random() - 0.5) * 120);
            const newPlayer = new Player(socketId, color, startX, startY, this.scene);
            newPlayer.rotation = Math.random() * 6;
            newPlayer.setReady(false);
            // Временное имя по номеру входа; клиент без localStorage его не перезаписывает
            newPlayer.setName(`Игрок ${this.players.length + 1}`);
            this.players.push(newPlayer);
            this.scene.ensureHost(socketId);
            return newPlayer;
        } else {
            console.warn("Room full. Cannot find color for new player.");
            return null;
        }
    }

    updatePlayer(socketId:string, params:PlayerJSON):number {
        const index = this.players.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            const player = this.players[index];
            // Клиент — источник истины по позиции; сервер только держит в границах арены.
            const margin = player.radius || 13;
            const edgePadX = this.scene.getEdgePadX();
            const edgePadY = this.scene.getEdgePadY();
            const minX = margin + edgePadX;
            const maxX = Math.max(minX, this.scene.getWidth() - margin - edgePadX);
            const minY = margin + edgePadY;
            const maxY = Math.max(minY, this.scene.getHeight() - margin - edgePadY);
            player.pageX = Math.min(maxX, Math.max(minX, Number(params.pageX) || player.pageX));
            player.pageY = Math.min(maxY, Math.max(minY, Number(params.pageY) || player.pageY));
            if (Number.isFinite(params.rotation)) {
                player.rotation = params.rotation;
            }
            return index;
        }
        return -1;
    }

    deletePlayer(socketId:string):void {
        const index = this.players.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            this.players[index].destroy();
            this.players.splice(index, 1);
            if (this.scene.isLobby()) {
                this.scene.reassignHostIfNeeded();
                this.scene.emitLobbyState();
            } else {
                this.scene.wipeIfNoSurvivors(
                    this.players.length === 0 ? "empty" : "allDead"
                );
            }
        }
    }

    tick(deltaSec:number) {
        this.players.forEach(p => p.tick(deltaSec));
    }
}
