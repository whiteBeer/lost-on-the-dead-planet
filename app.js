const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = 7789;
const app = express();
const server = createServer(app);
const io = new Server(server, {
    allowEIO3: true,
    cors: {
        origin: true,
        credentials: true
    },
});

const colors = ["red", "blue", "green", "#8F3A84", "#212121"];
let players = [];

io.on('connection', (socket) => {

    const playersColors = players.map(el => el.color);
    const color = colors.find(el => {
        return playersColors.indexOf(el) === -1;
    });
    players.push({
        socketId: socket.id,
        color: color,
    });

    console.log("Connected: " + socket.id, players);

    socket.on('playerMoved', (params) => {
        let currentPlayerIndex = -1;
        players = players.map((el, i) => {
            if (el.socketId === socket.id) {
                currentPlayerIndex = i;
                return {
                    ...el,
                    pageX: params.pageX,
                    pageY: params.pageY,
                    rotation: params.rotation
                };
            } else {
                return el;
            }
        });
        if (currentPlayerIndex !== -1) {
            io.emit('playerMoved', players[currentPlayerIndex]);
        }
    });

    socket.on('disconnect', () => {
        players = players.filter(it => it.socketId !== socket.id);
        io.emit('userDisconnected', {
            socketId: socket.id
        });
        console.log('Disconnected ', socket.id, players);
    });

    io.emit('allPlayers', players);
});

server.listen(PORT, () => {
    console.log('server running at http://localhost:' + PORT);
});