#!/bin/bash
rm -rf game
git clone https://syeskov:ff428175-4140-4666-8a58-7a900807f7cd@gitflic.ru/project/syeskov/game.git
cd game
cd frontend
npm i
npm run build
pm2 delete game-client
pm2 serve dist 7790 --name game-client -- prod