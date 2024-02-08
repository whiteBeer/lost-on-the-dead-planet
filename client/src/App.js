import * as PIXI from "pixi.js";
import Player from "./classes/Player";
import Players from "./classes/PlayersCollection";
import Control from "./classes/Control";

export function App () {
    const app = new PIXI.Application({
        background: '#1099bb',
        resizeTo: window,
    });

    const mePlayer = new Player(app, {color: "#99B"});
    const players = new Players(app, mePlayer);
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
        mePlayer.refreshRotationAngleToMouse(control.getMouseCoords());
    });


    return app.view;
}

export default App;