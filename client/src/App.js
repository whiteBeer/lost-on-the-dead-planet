import { io } from "socket.io-client";
import _ from 'lodash';

export function App () {
    const socket = io.connect('http://localhost:7789');
    const $cont = document.getElementById('game');
    $cont.onmousemove = (params) => {
        const coords = {
            pageX: params.pageX,
            pageY: params.pageY
        };
        movePlayer({...coords, socketId: "me"});
        socket.emit('playerMoved', coords);
    };

    socket.on('allPlayers', (players) => {
        players.forEach(player => {
            if (player.socketId !== socket.id) {
                movePlayer(player);
            }
        });
    });

    socket.on('playerMoved', (params) => {
        if (params.socketId !== socket.id) {
            movePlayer(params);
        } else {
            document.getElementById("me").style.backgroundColor = params.color;
        }
    });

    socket.on('userDisconnected', (params) => {
        document.getElementById("game").removeChild(document.getElementById(params.socketId));
    });

    return document.createElement('div');

    function movePlayer(params) {
        const $oldEl = document.getElementById(params.socketId);
        const size = 50;
        if ($oldEl) {
            $oldEl.style.left = (params.pageX - size / 2) + "px";
            $oldEl.style.top = (params.pageY - size / 2) + "px";
        } else {
            const $el = document.createElement("div");
            const $cont = document.getElementById('game');
            const $players = document.getElementsByClassName("player");
            $el.id = params.socketId;
            $el.className = "player";
            $el.style.left = (params.pageX - size / 2) + "px";
            $el.style.top = (params.pageY - size / 2) + "px";
            $el.style.width = size + "px";
            $el.style.height = size + "px";
            $el.style.borderRadius = size + "px";
            $el.style.backgroundColor = params.color || "grey";
            $el.style.position = "fixed";
            $cont.appendChild($el);
        }
    }
}

export default App;