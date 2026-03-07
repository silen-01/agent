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
