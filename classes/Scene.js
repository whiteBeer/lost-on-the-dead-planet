
let config = require('./../configs/Main');

class BackendScene {

    playerColors = config.playerColors;

    app = null;
    width = 1000;
    height = 1000;
    players = [];

    constructor (app, params = {}) {
        this.app = app;
    }

    addPlayer (socketId) {
        const playersColors = this.players.map(el => el.color);
        const color = this.playerColors.find(el => {
            return playersColors.indexOf(el) === -1;
        });
        this.players.push({
            socketId: socketId,
            color: color,
        });
    }

    updatePlayer (socketId, params) {
        let currentPlayerIndex = -1;
        this.players = this.players.map((el, i) => {
            if (el.socketId === socketId) {
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

        return currentPlayerIndex;
    }

    deletePlayer (socketId) {
        this.players = this.players.filter(it => it.socketId !== socketId);
    }
}

module.exports = {BackendScene};