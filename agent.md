sd

## 2026-11-19 — курсор после смерти и fullscreen

- Запрос владельца: после смерти исчезает мышь; Escape с открытым рюкзаком выходит из полноэкранного режима, вернуться нельзя.
- Исправление: системный курсор включается при смерти, открытых панелях и потере соединения; death-overlay принимает мышь. Общий fullscreen helper запрашивает Escape вместе с клавишами перков; при разрешённом Keyboard Lock короткий Escape закрывает панели. Если API недоступен или запрещён, выход fullscreen закрывает панели через fullscreenchange. Добавлена кнопка «На весь экран», доступная также на экране смерти; смена fullscreen сбрасывает зажатый ввод.
- Проверено: frontend production build/TypeScript; Chromium regression `tools/e2e_fullscreen.cjs` для keyboard permission granted/denied/unsupported, закрытия рюкзака, повторного fullscreen, death-cursor, клика возрождения и возврата игрового прицела. Смерть и live-state воспроизводятся входящими snapshot только в собственной тестовой вкладке, без убийств на сервере. Известное старое предупреждение frontend ESLint config (`useEslintrc/extensions`) осталось, lint не считается успешным.
- Production ещё не менялся. План: frontend-only deploy с резервной копией, backend и прогресс мира сохраняются. Код можно откатить обратным коммитом; служебный журнал и серверный бэкап — `MOZG/agent_lpt_zombies.md`.
