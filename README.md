# ПОВОД

**ПОВОД** — мини-приложение MAX для поиска событий в Москве и планирования досуга. Можно выбрать конкретный сеанс по времени, цене и интересам, сохранить его или договориться о встрече с друзьями. Поиск и сохранение работают и для одного человека. Проект команды **The Boys**.

## Что это и для кого

Приложение помогает жителям и гостям Москвы выбрать событие без перехода между разрозненными афишами. В нём есть поиск с фильтрами, карточка конкретного сеанса (Occurrence) с источником и честной информацией о цене, Save и раздел «Мой Повод». Plans, Friends и Notifications помогают согласовать совместный выход. MAX связывает мини-приложение с аккаунтом пользователя; Smart Occasion через GigaChat предлагает параметры поиска, которые пользователь может принять или изменить.

## Возможности

- Категории, дата, время, стоимость и текстовый поиск; подробности отдельного сеанса и переход к источнику.
- Сохранение событий, личные планы, друзья и уведомления. Для поиска группа не требуется.
- MAX Mini App и серверная интеграция MAX Bot API с обработкой повторных доставок.
- Smart Occasion: GigaChat предлагает структурированные фильтры, а приложение проверяет условия и показывает записи из каталога.

## Каталог

Подготовлено **215 конкретных сеансов**: **167 LIVE** из проверенных реальных источников и **48 DEMO**, явно помеченных как синтетические записи для показа на хакатоне. LIVE означает запись, привязанную к реальному источнику; DEMO не является действующим предложением билета. Это подготовленный набор, а не полное покрытие событий Москвы.

Категории: **Кино, Театр, Концерты, Музеи и выставки, Спорт, На воздухе, Волонтерство, Другое**. Метод подготовки и ограничения источников описаны в [документации каталога](docs/CATALOG.md).

## Архитектура и технологии

React 19.2.8 и Vite 8.2.2 обслуживают Mini App. Fastify 5.12.3 и TypeScript 5.9.3 образуют API; отдельный Node worker выполняет фоновые задачи. PostgreSQL 18.6 хранит бизнес-данные, Redis 8.2.9 и BullMQ 6.3.4 обслуживают очередь и доставку через outbox. MAX Bot API вызывается только сервером, MAX Bridge работает в клиенте. GigaChat подключён как необязательный поставщик для Smart Occasion. Runtime: **Node.js 24.20.0, npm 11.19.0**. Подробнее: [архитектура](docs/ARCHITECTURE.md), [AI](docs/AI.md).

## Быстрый локальный запуск

Нужны Node.js 24.20.0, npm 11.19.0, Docker и Docker Compose. Команды из терминала:

```sh
git clone https://github.com/n3onnhowever/The-Boys-Max.git
cd The-Boys-Max
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run test:unit
npm run build
docker compose up --build -d
```

`compose.yaml` поднимает **изолированный локальный тестовый** PostgreSQL, Redis, API и worker. Он создаёт приватную тестовую конфигурацию в Docker volume и тестовые записи; это не каталог из 215 сеансов. После запуска `http://localhost:3000/health/ready` должен отвечать успешно. Интеграционный набор запускается так:

```sh
docker compose --profile checks run --rm checks
docker compose down
```

Для проверки подготовленного каталога в **новой изолированной БД** нужны миграции, импорт четырёх проверенных JSON из `scripts/data/` и посев помеченного DEMO-набора. Порядок и условия описаны в [каталоге](docs/CATALOG.md) и [развёртывании](docs/DEPLOYMENT.md). Не очищайте существующую БД ради совпадения суммарного счётчика.

## Docker-образ

Сборка релизного образа из исходников:

```sh
docker build --target release -t povod:hackathon-final .
```

Готовый Docker-образ для загрузки опубликован в [GitHub Release «hackathon-final-2026-09-30»](https://github.com/n3onnhowever/The-Boys-Max/releases/tag/hackathon-final-2026-09-30). Скачайте архив `POVOD_DOCKER_*.tar.gz` и соответствующий `.sha256`, проверьте контрольную сумму, затем загрузите образ:

```sh
docker load -i POVOD_DOCKER_<SHA>.tar.gz
```

Для запуска API с **собственной приватной** конфигурацией требуются внешние PostgreSQL и Redis, утверждённый HTTPS origin и переменные из `.env.release.example`. Локально собранный образ можно запустить так:

```sh
docker run --rm --env-file .env.release -p 127.0.0.1:3000:3000 povod:hackathon-final
docker compose -f compose.release.yaml up --build -d
```

Релизный Compose запускает API и worker, но не создаёт производственные PostgreSQL/Redis и не настраивает MAX. Для Amvera предусмотрен `amvera.yaml`; порядок миграций, подготовки каталога и отката — в [инструкции по развёртыванию](docs/DEPLOYMENT.md).

## Переменные окружения

Примеры имён и пустых значений: `.env.example`, `.env.release.example`. Заполненные файлы хранятся вне Git.

- **PostgreSQL:** `DATABASE_URL`.
- **Redis:** `REDIS_URL`.
- **MAX:** `BOT_TOKEN`, `MAX_WEBHOOK_SECRET`, `MAX_INGRESS_MODE`, `MAX_BOT_USERNAME`, `POVOD_MINIAPP_URL`.
- **GigaChat:** `AI_EXTERNAL_ENABLED`, `GIGACHAT_AUTH_KEY` (ключ нужен только при включённом внешнем AI).
- **Публичный origin и сессии:** `PUBLIC_ORIGIN`, `SESSION_KEY`, `ESCROW_KEY`, `COOKIE_PROFILE`, `CREDENTIAL_SCOPE`.

## Тесты и зависимости

```sh
npm run typecheck
npm run typecheck:pure
npm run test:unit
npm run build
pwsh -NoProfile -File scripts/test-handoff-integration.ps1
```

Последняя команда создаёт отдельные локальные PostgreSQL/Redis, выполняет миграции и импорт каталога, запускает `npm run test:integration`, затем останавливает тестовые контейнеры. Прямой `npm run test:integration` требует уже настроенных тестовых БД и переменных. Проверенный набор: **330/330 unit**, **100/100 integration**. Версии npm-библиотек заданы в `package.json` и воспроизводимо зафиксированы в `package-lock.json`. `requirements.txt` — читаемый перечень версий для организаторов, не файл для `pip install`.

## Структура репозитория

- `apps/api`, `apps/worker`, `apps/miniapp` — API, worker и Mini App.
- `packages/`, `modules/` — доменная логика, хранение, поиск и интеграции.
- `migrations/` — миграции PostgreSQL.
- `scripts/data/`, `packages/demo/` — проверенные входные данные и помеченный DEMO-каталог.
- `data/provenance/real-catalog/` — происхождение LIVE-записей.
- `tests/` — unit- и integration-регрессии.
- `deploy/`, `amvera.yaml`, `compose*.yaml`, `Dockerfile` — конфигурация запуска.
- `licenses/` — сведения о сторонних материалах.

## Безопасность и данные

Секреты и заполненные runtime-файлы не входят в Git или Docker-образ. Неизвестная цена остаётся **UNKNOWN**; DEMO-записи отмечены, а LIVE и DEMO различаются в данных. GigaChat не создаёт события каталога и не принимает решения за пользователя. Источник, время и ограничения записи показываются без выдуманных фактов.
