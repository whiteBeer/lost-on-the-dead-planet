const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'client/index.html'));
});

io.on('connection', (socket) => {
    console.log("Connected: " + socket.id);

    socket.on('playerMoved', (params) => {
        console.log(params);
        io.emit('playerMoved', {
            ...params,
            socketId: socket.id
        });
    });

    socket.on('disconnect', () => {
        io.emit('userDisconnected', {
            socketId: socket.id
        });
        console.log('user disconnected');
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});