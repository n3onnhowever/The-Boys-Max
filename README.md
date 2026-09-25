# Повод — The Boys

«Повод» — персональная афиша и навигатор событий внутри MAX. Продукт помогает выбрать конкретный сеанс по интересам, времени и бюджету, увидеть цену либо честный UNKNOWN, место и источник, открыть первоисточник и сохранить событие.

**Текущий T102.2: T102 PASS.** Install/metadata/syntax/unit 115/115/typecheck/build, clean Docker build 25,132 с, startup, host/internal health и stop/restart прошли. API опубликован только на 127.0.0.1:3000; PostgreSQL/Redis остаются в internal backend без host ports. [Актуальный handoff](docs/handoffs/T102_2_NETWORK_MIGRATION_ACCEPTANCE.md), [evidence](artifacts/t102_2/FINAL_VERIFICATION.json). Следующие tickets не активированы.

## Замороженный сценарий

MAX → подключённая Mini App → серверная проверка MAX identity → интересы/структурные фильтры → живые события **Москвы** → detail конкретного Occurrence → цена/UNKNOWN/источник → открыть источник. Save и базовый «Мой Повод» сохраняются между входами. Основной путь должен работать в MAX mobile и web без группы.

Это целевой P0, не заявление о готовности функций. Live ingestion, Save и профиль ещё не завершены. Follow, Smart Povod и map относятся к P1; второй город и Shared Plan/social — Stretch. [Authority/overrides](docs/current/POVOD_SOURCE_AUTHORITY.md) разрешает старые противоречивые P0-флаги. [FINAL SCOPE FREEZE](docs/product/povod-2026-09-19/POVOD_FINAL_SCOPE_FREEZE_MVP.md) остаётся каноническим.

## Архитектура

TypeScript/Fastify API + React/Vite Mini App, модульный монолит с отдельным worker. API обслуживает собранную Mini App и HTTP routes; PostgreSQL хранит бизнес-состояние, durable ingress/outbox и результаты операций; Redis/BullMQ исполняет async-задачи. Redis также нужен outbound governor. MAX Bot API находится на сервере, MAX Bridge — на клиенте. Provider adapters отделены портами.

Queue decision **BLOCKED** до T103 runtime-verification. Существующие BullMQ/Redis/outbox/governor сохранены. [Схема](docs/TARGET_ARCHITECTURE.md) описывает границы, а не наличие работающего live provider.

## Установка и локальные проверки

Нужны Node **24.20.0**, npm **11.19.0** и доступ к npm registry. Это наблюдённые host-версии T102; они соответствуют package.json. Root lockfile создан npm штатно, прямые версии не обновлялись. `.npmrc` включает engine-strict и ignore-scripts.

В корне репозитория:

```powershell
npm ci --ignore-scripts
npm run verify:dependencies
npm run syntax
npm run test:unit
npm run typecheck
npm run build
```

`verify:dependencies` читает metadata закреплённых версий из registry и пишет локальный `dependency-preflight.json`; это не аудит безопасности. `syntax` выполняет транспиляцию, но не заменяет typecheck. `test:unit` не требует БД/MAX/provider. Отдельного lint script нет.

Lifecycle scripts зависимостей отключены. Root scripts просмотрены перед запуском. В lock есть install scripts у optional fsevents/msgpackr-extract; они не запускались. Их присутствие не является runtime-проверкой native путей. Установленный граф: [npm ls receipt](artifacts/t102/logs/installed-graph.txt).

`npm run typecheck` и `npm run build` проходят. Они явно применяют проверяемый declaration-only патч Drizzle 0.45.2; provenance, лицензия и хэши находятся в `licenses/drizzle-orm-0.45.2-NOTICES.md` и `patches/drizzle-orm-0.45.2.json`. `npm ci --ignore-scripts` воспроизводим; strict, NodeNext и skipLibCheck=false сохранены. Напрямую запускать tsc после чистого install следует только после `node scripts/patch-drizzle-declarations.mjs`.

## Docker: одна команда для локальных компонентов

Docker daemon доступен. В T102.2 проверены clean build, startup и stop/restart. Windows host получает 200 от live/ready; внутренние live/ready/HTML тоже проходят. API подключён к обычной bridge-сети frontend и internal-сети test (backend). Настройки системы не менялись.

Документированный запуск всей существующей изолированной test-конфигурации:

```powershell
docker compose up --build -d
```

`compose.yaml` поднимает PostgreSQL, Redis, init, migrate, prepare, API и worker. `checks` находится в отдельном profile и этой командой не запускается. Init генерирует случайные test-only значения в named volume; migrate применяет существующие миграции; prepare создаёт synthetic fixtures и инициализирует test-only outbound governor (включая ожидание 10 секунд). Outbound работает через TestTransport. PostgreSQL, Redis, worker и служебные контейнеры используют только сеть `test` с `internal: true`. Только API дополнительно использует `frontend` и получает обычный bridge egress; внешняя отправка и live-provider ingestion этим flow не подтверждаются. `.env` для него не требуется.

Объявленные image tags: `node:24.20.0-bookworm-slim`, `postgres:18.6`, `redis:8.2.9`. В T102.2 наблюдены Node 24.20.0, npm 11.19.0, PostgreSQL 18.6, Redis 8.2.9, BullMQ 6.3.4 и ioredis 5.11.1. Сборка требует package-lock.json; Dockerfile уже использует `npm ci --ignore-scripts` и существующий build script.

Порты: API + собранная Mini App — `127.0.0.1:3000` (container 3000). PostgreSQL — внутренний 5432, Redis — внутренний 6379, host ports для них не опубликованы. Worker собственного HTTP-порта не имеет. PORT API по умолчанию 3000; смена PORT требует согласования compose mapping.

Проверка доступа с host (T102.2 PASS до и после restart):

```powershell
docker compose ps
Invoke-RestMethod http://127.0.0.1:3000/health/live
Invoke-RestMethod http://127.0.0.1:3000/health/ready
Invoke-WebRequest http://localhost:3000/ -UseBasicParsing
docker compose logs --no-color --tail 100 api worker migrate prepare
```

Ожидается `/health/live`: `alive: true`; `/health/ready`: `database: UP` и поле `outboundHold`. Readiness проверяет БД/hold, но **не** удостоверяет Redis, worker delivery, MAX или provider. `/` должен отдавать собранный HTML после исправления build. В обычном браузере без MAX/действующей сессии ожидается просьба открыть Mini App в MAX; synthetic роли не дают обхода авторизации. Не публикуйте runtime config или логи с секретами.

Измерение T102.2: clean `docker compose --progress plain build --no-cache` — 25,132 с, лимит ≤5 минут выполнен. Первоначальные pull измерены отдельно: Node 16,493 с; PostgreSQL 23,005 с; Redis 7,574 с. Исходный код и точные команды привязаны к хэшам в `artifacts/t102_2/`.

Остановить без удаления данных:

```powershell
docker compose stop
```

Повторный запуск остановленных контейнеров:

```powershell
docker compose start postgres redis api worker
```

Такой restart сохраняет named volumes и не запускает повторно prepare. После него повторите health/log checks. При изменении source/config или после удаления контейнеров используйте `docker compose up --build -d`; это может повторно выполнить prepare и требует согласованного перезапуска worker. Удаление контейнеров/сети без удаления данных: `docker compose down`. `down --volumes` уничтожает локальные тестовые данные и не является обычным stop/restart.

## Окружение и внешние сервисы

[.env.example](.env.example) и [.env.release.example](.env.release.example) содержат только placeholders. Для будущего отдельно согласованного live-deploy локальный `.env.release` заполняется вне Git. Оба примера допускаются tracking policy, реальные `.env*` игнорируются. Наличие примера не открывает live gate.

| Переменные | Назначение |
|---|---|
| APP_MODE | test генерируется test-compose; release фиксирует live |
| PUBLIC_ORIGIN | Точный origin без trailing path; для live — утверждённый HTTPS |
| DATABASE_URL, REDIS_URL | Внешние PG/Redis для release; test-compose использует внутренние сервисы |
| SESSION_KEY, ESCROW_KEY | Серверные ключи; SESSION_KEY минимум 32 символа, ESCROW_KEY — 64 hex; значения не логировать |
| BOT_TOKEN, WEBHOOK_SECRET, CREDENTIAL_SCOPE | Приватный bot token, проверка webhook и область outbound governor; WEBHOOK_SECRET 32–256 разрешённых alphanumeric/underscore/hyphen символов |
| COOKIE_PROFILE | LAX_FIRST_PARTY либо PARTITIONED_EMBEDDED; требуется real-client проверка |
| MAX_INGRESS_MODE | WEBHOOK; POLLING сейчас fail-closed, runner не реализован |
| MAX_BOT_USERNAME | Существующий nickname бота; не регистрировать и не менять в T101/T102 |
| ALLOWED_SOURCE_ORIGINS | Явный список HTTPS origins через запятую, после допуска источников |
| AI_EXTERNAL_ENABLED, MAP_EXTERNAL_ENABLED | false; external admission не реализован |
| LIVE_GATE | Оставлен пустым до отдельного принятия release gates |
| RUNTIME_FILE | Генерируемая test-конфигурация `/runtime/test.json`; не публиковать содержимое |
| NODE_EXTRA_CA_CERTS | Только отдельно проверенный PEM при подтверждённой необходимости; TLS verification остаётся включённой |

`compose.release.yaml` описывает API/worker с внешними PostgreSQL/Redis и HTTPS reverse proxy. Он не поднимает зависимости, не seed-ит тестовые данные и не запускался в T102. Для реальной проверки нужны существующий бот с attached Mini App, безопасно переданные credentials, доступ MAX mobile/web, публичный HTTPS origin и отдельно принятые gates. MAX/PG/Redis reachability в release не установлена.

KudaGo — conditional candidate, **NOT APPROVED**: runtime/data и ручной provider-use gate относятся к T104. Live importer ещё не подключён; fallback provider не одобрен. LLM и карта не обязательны для P0; новые внешние сервисы сейчас не добавляются.

## Данные и тестовый сценарий

PostgreSQL — источник истины; Redis не заменяет durable бизнес-состояние. Event и Occurrence различаются; source/provenance, timestamps и ограничения должны сохраняться. Цена/fee UNKNOWN не становится нулём; conditional/free-with-extra не получает ложного budget PASS; завершившееся событие не рекомендуется как будущее. Save, Follow, suitable/voted и commitment — разные состояния.

Test seed создаёт три **synthetic** роли и один owned SYNTHETIC candidate, без реальных аккаунтов и без выдачи session. Freshness fixture истекает через час и отображается как UNKNOWN. Seed разрешён только для test-mode БД `max23_test`. Fixtures не подтверждают московский coverage, наличие билетов, реальный login или provider integration.

T102 завершён: компилятор, Docker runtime и host-доступ проверены. Следующий шаг — human review и отдельная активация следующего ticket. Queue fault injection, provider/MAX gates и frozen P0 E2E не запускались; они требуют отдельных tickets.

## Ограничения и происхождение

- Нет завершённого P0 E2E, live ingestion, Favorites/basic profile или real-client screenshots. UI всё ещё использует старую надпись «Афиша»; T110 отвечает за изменение.
- Reminders/Smart Povod, map runtime, natural-language model endpoint, /start handler и polling runner не заявляются работающими.
- OpenAPI 3.0.3 generator существует (`npm run openapi`), но T102 его не запускал; DATA-API.yaml, HTTPS deployment и judge package относятся к T112.
- [EventHive notice](licenses/module-22-NOTICES.md) и [MIT licence](licenses/EventHive-LICENSE) сохранены. Указанный в старом notice `analysis/REUSE_AND_LICENSES.csv` отсутствует. Восстановление точных copied/adapted paths/hashes — blocker T112; donor runtime acceptance не выдумывается.
- Lock/registry metadata фиксируют версии и заявленные licences, но не заменяют полный third-party notice/donor audit.
- Текущие evidence: [T101](docs/handoffs/T101_SCOPE_GOVERNANCE.md), [T102](docs/handoffs/T102_DEPENDENCY_BUILD_BASELINE.md), [known gaps](docs/current/KNOWN_GAPS.md). Исторические импорты сохранены неизменными.

## Демо-каталог

Режим `APP_MODE=demo` с `DEMO_CATALOG_VERSION=v1` использует шесть подготовленных командой вымышленных событий. Их даты, места, цены и источники служат только для показа интерфейса и сценария сохранения; это не подтверждённая живая афиша, не предложение билетов и не основание для поездки. Демо-записи остаются отделены от live-режима.
