# Lost on the Dead Planet

Многопользовательский .io-шутер. Единый мир 4000×4000, зомби и монстры, команды, PvP, дроп оружия, опыт, уровни, 583 перка.

## Локальный запуск
BACKEND: создать `.env` с `NODE_ENV=local` и `APP_PORT=7789`, затем `npm i`, `npm start`.

FRONTEND: создать `.env` с `NEXT_PUBLIC_BACKEND_URL=http://localhost:7789`, затем `npm i`, `npm run dev`. Клиент: http://localhost:7790/

На телефоне: левая половина экрана — бег, правая — прицел и стрельба.

## Сборка под подпуть
`NEXT_PUBLIC_BASE_PATH` (например `/world`) и `NEXT_PUBLIC_SOCKET_PATH` (например `/world-api/socket.io`) записать в `frontend/.env.production`: `next.config.js` читается и при сборке, и при запуске, значения должны совпадать. За обратным прокси на сервере: `APP_HOST=127.0.0.1`. Если клиент на другом домене: `CORS_ORIGIN=<адрес клиента>`.

## Проверки
- `cd backend && npx tsc && node tests/world.test.js`: логика мира.
- `node tests/load.js <url> <ботов> <секунд>`: нагрузка.
- `node tests/playground.js` + `python3 tools/e2e.py`: сквозная проверка клиента в Chromium.

## Где что
- `backend/World.ts`: симуляция; `backend/configs/`: оружие, монстры, перки, карта, баланс.
- `frontend/src/game/`: Pixi-клиент; `frontend/src/components/GameView.tsx`: интерфейс.
- `tools/cut_sheet.py`, `tools/make_tile.py`: обработка листов картинок из ChatGPT.
