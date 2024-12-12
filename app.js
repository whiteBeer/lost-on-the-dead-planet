const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { BackendScene } = require('./classes/Scene');

const PORT = 7789;
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const scene = new BackendScene(app);

io.on('connection', (socket) => {

    scene.addPlayer(socket.id);

    console.log("Connected: " + socket.id, scene.players);

    socket.on('playerMoved', (params) => {
        let currentPlayerIndex = scene.updatePlayer(socket.id, params);
        if (currentPlayerIndex !== -1) {
            io.emit('playerMoved', scene.players[currentPlayerIndex]);
        }
    });

    socket.on('disconnect', () => {
        scene.deletePlayer(socket.id);
        io.emit('userDisconnected', {
            socketId: socket.id
        });
        console.log('Disconnected ', socket.id, scene.players);
    });

    io.emit('allPlayers', scene.players);
});

server.listen(PORT, () => {
    console.log('server running at http://localhost:' + PORT);
});