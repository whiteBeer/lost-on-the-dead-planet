import * as PIXI from "pixi.js";

export class Scene {

    app = null;
    pixiObj = null;

    width = 1000;
    height = 1000;

    constructor (app, params = {}) {
        this.app = app;
        this.socketId = params.socketId || "me";
        const container = new PIXI.Container();
        const line = new PIXI.Graphics();
        line.lineStyle(2, "#FFF");
        line.moveTo(10, 10);
        line.lineTo(this.width, 10);
        line.lineTo(this.width, this.height);
        line.lineTo(10, this.height);
        line.lineTo(10, 10);
        container.addChild(line);
        container.position.set(0, 0);
        
        this.pixiObj = container;
        app.stage.addChild(this.pixiObj);
    }
}

export default Scene;