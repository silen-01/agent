# agent-service

Голосовой AI-ассистент (React + Vite + Gemini Live).

## Скрипты

- `npm run dev` — запуск в режиме разработки
- `npm run build` — сборка для production
- `npm run preview` — просмотр собранного билда
- `npm run lint` — проверка линтером
- `npm run audit:prod` — проверка уязвимостей только у production-зависимостей (в dev-зависимостях, например `@vercel/node`, могут оставаться известные уязвимости до обновлений upstream)

## Переменные окружения

- **Локально (dev):** в `.env` задайте `VITE_GEMINI_API_KEY` — используется только при `npm run dev`, в production bundle не попадает.
- **Прод (Vercel):** в настройках проекта добавьте **GEMINI_API_KEY** (без префикса `VITE_`). Ключ отдаётся клиенту только через serverless-эндпоинт `/api/live-token`, в статику не вшивается.

## Отладка на телефоне (логи консоли)

Чтобы смотреть логи с мобильного (почему долго подключается, реконнект и т.д.):

### Android (Chrome)

1. На ПК: Chrome → `chrome://inspect` → включите «Discover USB devices».
2. Подключите телефон по USB, на телефоне разрешите отладку по USB.
3. В списке устройств найдите вкладку с вашим сайтом → «inspect». Откроется DevTools, вкладка **Console** — там все `console.log` с телефона (фильтр по `[LiveSession]`).

### iPhone/iPad (Safari)

1. На iPhone: Настройки → Safari → Дополнения → **Веб-инспектор** — включить.
2. Подключите iPhone к Mac по кабелю.
3. На Mac: Safari → меню **Разработка** → выберите ваш iPhone → вкладка с вашим сайтом. Откроется Web Inspector, вкладка **Console** — логи с телефона.

### Что смотреть в логах

Все сообщения подключения помечены префиксом **`[LiveSession]`**. Ожидаемая последовательность при успешном запуске:

- `launch() called`
- `launch: connect() start`
- `GeminiLiveClient.connect() start`
- `GeminiLiveClient.connect() resolved`
- `launch: connect() resolved, session set`
- `onopen (initial connect)`
- `session ready (first message or fallback)`

Если сразу после `onopen` идёт `onclose` или `onerror` — соединение обрывается. В логе теперь выводятся **code** и **reason** закрытия:

- **1007** — «User location is not supported for the API use»: **Gemini Live API недоступен в вашем регионе.** Это ограничение именно для **API** (вызовы по ключу), а не для сайта gemini.google.com — сайт может открываться, а API в той же стране быть недоступен. VPN обычно не помогает. Приложение покажет сообщение и прекратит реконнекты.
- **1008** — «Operation is not implemented, or supported, or enabled»: часто конфиг (модель, голос) или браузер не поддерживается.
- **1011** — внутренняя ошибка на стороне API; иногда помогает смена модели или повтор через несколько секунд.

Если цикл «onopen → onclose» повторяется на десктопе (в т.ч. Safari) — откройте консоль и посмотрите точные `code` и `reason` в логе `[LiveSession] onclose (socket closed) code: … reason: …`.
