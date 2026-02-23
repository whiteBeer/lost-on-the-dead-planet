## A little multiplayer game.

**Run local:**
BACKEND:
1. create .env file
```
 APP_PORT=7789
```
2. npm i
3. npm start

FRONTEND:
1. create .env file
```
  NEXT_PUBLIC_BACKEND_URL=http://localhost:7789
```
2. npm i
3. npm run dev

**Client:** http://localhost:7790/

**Backend root:** /backend/app.ts

**Frontend next.js app root:** /frontend/src/app/layout.tsx

**Frontend pixi.js app root:** /frontend/src/pixi-app/App.ts