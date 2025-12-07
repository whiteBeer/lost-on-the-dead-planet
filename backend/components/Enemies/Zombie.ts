import { Scene } from "../Scene";
import { BaseEnemy } from "./BaseEnemy";
import { Coords, EnemyParams } from "../../types";
import { calcTimedPoint } from "../../utils/geometry";
import { ENEMIES } from "../../configs/Enemies";

export class Zombie extends BaseEnemy {

    type = "zombie";

    moveInterval:NodeJS.Timeout | null = null;

    protected serverProps:{
        flankBias:number;
        viewDist:number;
    }

    constructor(scene:Scene, params:EnemyParams) {
        super(scene, params);
        this.scene = scene;
        this.width = ENEMIES.Zombie.width;
        this.height = ENEMIES.Zombie.height;
        this.color = "0x6F8";
        this.defaultSpeedInSecond = ENEMIES.Zombie.speed + Math.round(Math.random() * 50);
        this.speedInSecond = this.defaultSpeedInSecond;

        this.health = ENEMIES.Zombie.health;
        this.maxHealth = ENEMIES.Zombie.health;
        this.damageValue = ENEMIES.Zombie.damage;
        this.attackInterval = ENEMIES.Zombie.attackInterval;

        this.serverProps = {
            flankBias: (Math.random() - 0.5) * 1.2,
            viewDist: 350
        };

        this.move();
    }

    move() {
        this.moveInterval = setInterval(() => {
            // Рассчитываем, где зомби СЕЙЧАС (на основе времени)
            const enemyCoords = calcTimedPoint(
                this.startX, this.startY, this.rotation, this.speedInSecond, this.updatedAt
            );

            const nearestPlayer = this.findNearestPlayer(enemyCoords);

            if (nearestPlayer) {
                this.speedInSecond = this.defaultSpeedInSecond;

                const diffX = nearestPlayer.pageX - enemyCoords.x;
                const diffY = nearestPlayer.pageY - enemyCoords.y;

                // Считаем реальную дистанцию до игрока
                const distToPlayer = Math.hypot(diffX, diffY);

                // Базовый угол прямо на игрока
                const directAngle = Math.atan2(diffY, diffX);

                // ЛОГИКА ОБХОДА:
                // Если мы далеко (> 150px) - применяем смещение (идем по дуге)
                // Если близко - идем прямо, чтобы кусать
                let finalAngle = directAngle;

                if (distToPlayer > this.serverProps.viewDist) {
                    finalAngle += this.serverProps.flankBias;
                }

                // Сохраняем Math.PI, так как он был в твоей оригинальной логике (видимо, спрайт смотрит влево)
                this.rotation = finalAngle;

                // Обновляем точку старта для следующего тика интерполяции
                this.startX = enemyCoords.x;
                this.startY = enemyCoords.y;
                this.updatedAt = new Date().toISOString();
            } else {
                // Если игроков нет - просто стоим или крутимся
                this.speedInSecond = 0;
                // Можно добавить логику "блуждания" (wandering), если хочешь
                this.rotation += 0.03;
            }

            // Отправляем обновление
            this.scene.emit("enemiesUpdated", { enemy: this.toJSON() });
        }, 200);
    }

    findNearestPlayer(enemyCoords:Coords) {
        const players = this.scene.playersCollection.getLivePlayers();

        if (players.length === 0) {
            return null;
        }

        let nearestPlayer = players[0];
        // Используем квадрат расстояния для скорости (избегаем корней внутри цикла)
        let minDistanceSq = Math.pow(players[0].pageX - enemyCoords.x, 2) +
            Math.pow(players[0].pageY - enemyCoords.y, 2);

        for (let i = 1; i < players.length; i++) {
            const p = players[i];
            const distSq = Math.pow(p.pageX - enemyCoords.x, 2) +
                Math.pow(p.pageY - enemyCoords.y, 2);

            if (distSq < minDistanceSq) {
                nearestPlayer = p;
                minDistanceSq = distSq;
            }
        }

        return nearestPlayer;
    }
}