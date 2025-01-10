import * as PIXI from "pixi.js";
import Scene from "./classes/Scene";
import Player from "./classes/Player";
import Players from "./classes/PlayersCollection";
import Control from "./classes/Control";

export function App (env) {
    const app = new PIXI.Application({
        background: '#1099bb',
        resizeTo: window,
    });

    const scene = new Scene(app);
    const mePlayer = new Player(app, {color: "#99B"});
    const players = new Players(
        app, mePlayer,
        env === "dev" ? 'http://localhost:7789' : 'http://178.21.11.153:7789'
    );
    const control = new Control(app);

    control.onKey("KeyW", (delta) => {
        mePlayer.moveY(-mePlayer.speed * delta);
        players.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onKey("KeyS", (delta) => {
        mePlayer.moveY(mePlayer.speed * delta);
        players.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onKey("KeyA", (delta) => {
        mePlayer.moveX(-mePlayer.speed * delta);
        players.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onKey("KeyD", (delta) => {
        mePlayer.moveX(mePlayer.speed * delta);
        players.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onMouseMove(() => {
        players.socket.emit('playerMoved', mePlayer.getCoords());
    });
    control.onMousePressed(() => {
        mePlayer.fire();
    });

    app.ticker.add((delta) => {
        if (document.querySelector('#game').matches(':hover')) {
            mePlayer.refreshRotationAngleToMouse(control.getMouseCoords());
        }
    });


    return app.view;
}

export default App;