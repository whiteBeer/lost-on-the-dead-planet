import {Scene} from "../Scene";
import {BaseEnemy} from "./BaseEnemy";
import {Coords, EnemyParams} from "../../types";
import {calcTimedPoint} from "../../utils/geometry";
import {server} from "../../classes/ServerFacade";

export class Zombie extends BaseEnemy {

    moveInterval: NodeJS.Timeout|null = null;

    constructor(scene:Scene, params:EnemyParams) {
        super(scene, params);
        this.scene = scene;
        this.width = 50;
        this.length = 50;
        this.color = "0x6F8";
        this.speedInSecond = 50 + Math.round(Math.random() * 30);
        this.health = 50;
        this.maxHealth = 50;

        this.move();
    }

    move () {
        this.moveInterval = setInterval(() => {
            const enemyCoords = calcTimedPoint(
                this.startX, this.startY, this.rotation, this.speedInSecond, this.updatedAt
            );
            const nearestPlayer = this.findNearestPlayer(enemyCoords);
            if (nearestPlayer) {
                const diffX = nearestPlayer.pageX - enemyCoords.x;
                const diffY = nearestPlayer.pageY - enemyCoords.y;
                this.rotation = Math.PI + Math.atan2(diffY, diffX);
                this.startX = enemyCoords.x;
                this.startY = enemyCoords.y;
                this.updatedAt = new Date().toISOString();
            }
            server.emit(this.scene.roomId, "enemiesUpdated", {
                serverCurrentDateTime: new Date().toISOString(),
                enemy: this.toJSON()
            });
        }, 200);
    }

    findNearestPlayer (enemyCoords:Coords) {
        const players = this.scene.playersCollection.getPlayers();
        if (players[0]) {
            let nearestPlayer = players[0];
            let nearestPlayerDist =
                Math.abs(players[0].pageX - enemyCoords.x) +
                Math.abs(players[0].pageY - enemyCoords.y);
            players.forEach(el => {
                const dist = Math.abs(el.pageX - enemyCoords.x) +
                    Math.abs(el.pageY - enemyCoords.y);
                if (dist < nearestPlayerDist) {
                    nearestPlayer = el;
                    nearestPlayerDist = dist;
                }
            });
            return nearestPlayer;
        } else {
            return null;
        }
    }
}