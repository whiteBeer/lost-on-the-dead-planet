import * as PIXI from "pixi.js";

export class ResourcesLoader {

    public static enemies:Record<string, PIXI.Texture[]> = {};
    public static players:Record<string, PIXI.Texture[]> = {};

    public static async loadAssets():Promise<void> {
        PIXI.Assets.add({ alias: "playerTex", src: "/img/player_body_sprite.png" });
        PIXI.Assets.add({ alias: "enemyZombieTex", src: "/img/zombie_sprite.png" });
        await PIXI.Assets.load(["playerTex", "enemyZombieTex"]);

        this.enemies["zombie"] = this.initZombieTextures();
        this.players["player1"] = this.initPlayerTextures();
    }

    public static initPlayerTextures():PIXI.Texture[] {
        const playerTexture = PIXI.Assets.get("playerTex");
        const playerFrames:PIXI.Texture[] = [];
        for (let i = 0; i < 9; i++) {
            playerFrames.push(
                new PIXI.Texture({
                    source: playerTexture.source,
                    frame: new PIXI.Rectangle(0, i * 150, 150, 150)
                })
            );
        }
        return playerFrames;
    }

    public static getPlayerTextures():PIXI.Texture[] {
        return this.players["player1"];
    }


    public static initZombieTextures():PIXI.Texture[] {
        const zombieTexture = PIXI.Assets.get("enemyZombieTex");
        const zombieFrames:PIXI.Texture[] = [];
        for (let i = 0; i < 11; i++) {
            zombieFrames.push(
                new PIXI.Texture({
                    source: zombieTexture.source,
                    frame: new PIXI.Rectangle(0, i * 120, 150, 120)
                })
            );
        }
        return zombieFrames;
    }

    public static getZombieTextures():PIXI.Texture[] {
        return this.enemies["zombie"];
    }


    public static getPlayerTexture():PIXI.Texture {
        return PIXI.Assets.get("playerTex");
    }
}