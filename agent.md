---
name: Wave arena on master
overview: Играбельный wave-арена шутер на структуре master (Scene / Players / Enemies / Missiles / rooms). Open-world не переносим — ассеты, Perks, оружие/враги. Дальше — баланс и уникальное поведение монстров.
todos:
  - id: assets-config
    content: Скопировать ассеты open-world; конфиг размера сцены; Weapons/Enemies/Waves
    status: completed
  - id: waves-enemies
    content: WaveDirector + тиры green/yellow/red/boss; длительность волны; масштаб численности
    status: completed
  - id: enemy-classes-ai
    content: Отдельный класс на каждого монстра + разный movement AI (Spider orbit и т.д.)
    status: completed
  - id: weapons-pickups
    content: 5 оружий, обобщённые Missiles, Pickups — автоподбор ходьбой, TTL ~12с
    status: completed
  - id: hitboxes-geometry
    content: Два прямоугольных хитбокса врага — bulletHit и playerTouch; сохранить геометрию коллизий
    status: completed
  - id: corpses-blood
    content: Слой трупов + hitFx направленные кровавые брызги на клиенте
    status: completed
  - id: perks-hud
    content: Perks PvE-фильтр, level-up офер снизу, HUD волны/HP/обойма
    status: completed
  - id: pause-lobby
    content: Лобби (ready/host/start); ESC — серверная пауза (враги + таймеры волн)
    status: completed
  - id: browser-balance
    content: Playtest — баннер волны/босса, разброс пистолета при зажатии, wipe при смерти всех
    status: completed
isProject: false
---

# Wave-арена на структуре master

База: ветка **`master`** (`components/Scene`, `Players`, `Enemies`, `Missiles`, rooms). Логику из `backend/World.ts` ветки `open-world` **не переносим** — только ассеты, [`backend/configs/Perks.ts`](backend/configs/Perks.ts) и нужные куски конфигов оружия/врагов.

```mermaid
flowchart LR
  subgraph backend [Backend room Scene]
    Lobby[Lobby phase]
    Waves[WaveDirector]
    Players[Players]
    Enemies[Enemies per-class AI]
    Missiles[Missiles]
    Pickups[Pickups]
    Pause[Pause freeze]
    Perks[Perks config]
    Lobby --> Waves
    Waves --> Enemies
    Pause --> Waves
    Pause --> Enemies
    Enemies -->|death| Pickups
    Enemies -->|exp| Players
    Players --> Perks
    Missiles -->|hit| Enemies
  end
  subgraph frontend [Pixi client]
    Ground[ground texture]
    Corpses[corpse layer]
    Blood[blood FX]
    Hud[HUD wave boss HP]
    PauseUI[ESC pause overlay]
  end
  backend -->|socket events| frontend
```

## Жёсткие решения

- Режим: **PvE wave-арена в комнате** + **лобби** (`phase: lobby | playing`): ready / хост / «Поехали». В уже идущую игру войти нельзя.
- Стартовое оружие: **Pistol**.
- Дроп оружия (5 шт.): **Pistol, SMG, Rifle, Shotgun, Sniper**.
- Тиры: **green / yellow / red / boss**. У каждого типа врага **свой класс** в [`backend/components/Enemies/`](backend/components/Enemies/) (не один общий `Zombie`).
- Размер комнаты: [`backend/configs/Scene.ts`](backend/configs/Scene.ts) — **1400×1400**.
- Препятствия: **не делаем**.
- Трупы и кровь: **клиент** (сервер шлёт hit/death + `dir`).
- **Геометрия:** два rect на враге — `bulletHit` и `playerTouch`. Outlines хитбоксов не рисовать.

## Актуальный баланс волн ([`backend/configs/Waves.ts`](backend/configs/Waves.ts))

| Параметр | Значение |
|----------|----------|
| Длительность волны 1 | **20 с** |
| Каждая следующая | **+10 с** (30, 40, 50…) |
| Численность | `× (duration / 60с)` от reference-состава → волна 1 ≈ **⅓** старого count |
| Возраст волны | дополнительно **+10%** монстров за каждую волну после первой |
| Каждая **5-я** волна | **босс**: чёрный `Boss` (~2800 HP база × mul) + немного мелочи |
| Пауза между волнами | ~4.5 с + баннер `waveStarted` (`announcing`, `isBoss`) |

Сложность статов: HP/damage/speed mul по волне (`hpMulPerWave` и т.д.), speed cap ~2.2. Спавн кольцом от центра.

## Движение монстров (разный AI)

Общая база: [`ChaseEnemy.ts`](backend/components/Enemies/ChaseEnemy.ts) (`tickMove` / `commitMove`). Фабрика: [`createEnemy.ts`](backend/components/Enemies/createEnemy.ts).

| Класс | Поведение |
|-------|-----------|
| Zombie | прямой chase + лёгкий фланг |
| Crawler | зигзаг к игроку |
| Runner | рывок → пауза |
| Hound | дуга вокруг, сжимает кольцо |
| Spitter | держит дистанцию / стрейф |
| Bloater | медленно прёт, иногда стоит |
| Screamer | хаотичные рывки к цели |
| **Spider** | **только круг вокруг спавна, на игрока не идёт** |
| Soldier | подошёл → стрейф |
| Stalker | замирает → рывок |
| Brute | редко меняет курс (таран) |
| Behemoth | тяжёлая поступь с покачиванием |
| Boss | спираль к игроку |
| OrbitSpider | sandbox orbit (не арена) |

Дальше: уникальные атаки (плевок Spitter и т.п.) — по мере надобности, в файле класса.

## Решения из playtest (зафиксировать)

### Оружие и патроны
- Обойма конечная, R + авто при 0; запас бесконечный. HUD: `Pistol: 8/12`.
- Дроп: автоподбор ходьбой; TTL ~12 с.
- Курсор: только кольцо разброса у мыши.
- **Пистолет:** `spreadRecovery` понижен (~0.1), чтобы при **зажатии LKM** разброс **рос** (раньше recovery съедал increment между выстрелами).

### Волны и UI
- Угол: `ВОЛНА N` / на боссе `БОСС · ВОЛНА N`; центр — баннер (для босса «БОСС / ВОЛНА N»).
- Перки: карточки **внизу**; бой не на паузе от перков.
- Фон: тайловый ground.

### Пауза ESC (серверная)
- Esc / «Продолжить» → `togglePause` → `gamePaused`.
- На паузе: стоп AI врагов, заморозка таймеров WaveDirector (between + spawn), skip `Scene.update`, блок move/shoot/reload/pickup на сокете; клиент не интерполирует врагов/пули.
- Не путать с паузой перк-офера.

### Смерть / рестарт
- 0 живых → `wipeIfNoSurvivors` → `gameOver` + `sceneReset`.
- «Начать заново» → `PUT .../new-game` → снова **лобби**.
- Spawn protection ~3 с; clamp в границы карты.

### Перки (только PvE)
- Без PvP/open-world карточек. Fast×10 / TestMode — удалены.

### Frontend SSR
- Room id в UI из `useParams()`, не `getRoomId()` с `window` (иначе hydration mismatch). `getRoomId()` остаётся для Pixi/socket после mount.

## Геометрия коллизий (обязательно сохранить)

[`Scene.ts`](backend/components/Scene.ts) + [`geometry.ts`](backend/utils/geometry.ts):

- Пуля → `bulletHit` rect (`checkLineRectangleCollision`).
- Касание → `playerTouch` rect (`checkCircleRotatedRectangleCollision`).
- Не сливать в один бокс; не circles для врага.
- `hitFx` — точка с bullet-rect.

## Структура backend (как есть)

**Scene** — lobby/playing, pause, WaveDirector, game loop 20 ms, wipe/newGame, `getScene` (+ `paused`).

**Enemies/** — `BaseEnemy`, `ChaseEnemy`, по файлу на тип, `createEnemy` / `spawnTier`.

**WaveDirector** — announce → spawn по duration; pause/resume с remaining ms; boss wave composition.

**Players / Weapon / Missiles / Pickups** — как раньше (5 оружий, pellets/pierce, автоpickup).

**Socket/API** — `playerReady`, `startGame`, `togglePause`, `pickPerk`, `gamePaused`, `lobbyUpdated`, `gameStarted`, …

## Frontend (как есть)

- Слои: ground → corpses → entities → FX.
- HUD: волна/босс, HP, ammo, баннер.
- React overlays: лобби, пауза, смерть, перки снизу.
- Курсор: ring разброса.

## Проверка в браузере

1. Backend `:7789`, frontend `:7790`.
2. Лобби → старт → волны 1–5 (на 5-й босс): AI различимы, трупы/кровь/дроп/перки.
3. Esc: монстры и таймер волны реально стоят; resume продолжает спавн.
4. Зажать ЛКМ с пистолетом — кольцо разброса растёт.
5. Два клиента в одной комнате (общий прогресс / общая пауза).

## Дальше (не блокирует текущий билд)

1. Уникальные атаки у части монстров (Spitter ranged и т.д.).
2. Тюнинг boss HP / adds / длительности поздних волн.
3. Починить frontend eslint (`eslint.config.mjs` vs ESLint 8 — `eslint/config` не резолвится); backend eslint: 0 errors, остаются старые warnings (`any` / destructure в `toJSON`).
4. Playtest баланса «сессия ощущается играбельной».
