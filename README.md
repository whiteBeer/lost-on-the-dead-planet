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

### Hosting below a URL prefix

The frontend and Socket.IO/API routes can be placed below separate prefixes:

```env
NEXT_PUBLIC_BASE_PATH=/wave-arena
NEXT_PUBLIC_API_BASE_PATH=/wave-arena-api
NEXT_PUBLIC_BACKEND_URL=
```

Keep `NEXT_PUBLIC_BACKEND_URL` empty when nginx serves the frontend and API on
the same host. The backend accepts `APP_HOST` (defaults to `127.0.0.1`) and
`APP_PORT`.
