# POVOD

**POVOD (Повод)** is an event discovery and planning Mini App for MAX, built by **The Boys**. It helps people in Moscow find a specific event session that fits their time, budget, and interests, then save it or make a plan. A person can use the app alone; a group is never required.

## For whom and what it does

The app is for people deciding what to do in Moscow and friends coordinating an outing. Search has category, date, time, and price filters. An occurrence detail keeps the event time, price or **UNKNOWN**, source, and the limits of that source visible. Save, «Мой Повод», Plans, Friends, and Notifications support follow-through. Smart Occasion uses GigaChat to suggest structured search filters; the user chooses whether to apply them. The application, rather than the model, enforces eligibility and handles commitments.

The prepared catalog contains **167 LIVE exact occurrences** from reviewed real sources and **48 clearly labeled DEMO occurrences**, for **215 occurrences total**. LIVE means source-backed real event data; DEMO means synthetic showcase data, not a real event or ticket offer. The two kinds remain distinguishable in the UI and data. The eight categories are Cinema, Theatre, Concert, Museum, Sport, Outdoor, Volunteer, and Other. Source receipts and catalog method are documented in [Catalog](docs/CATALOG.md).

## Architecture and stack

This is a TypeScript modular monolith with a Fastify API, a separate worker process, and a React/Vite MAX Mini App. PostgreSQL 18.6 stores durable business state. Redis 8.2.9 and BullMQ process asynchronous work through a durable outbox with idempotency controls. The MAX Bot API is used on the server; the MAX Bridge runs in the client. GigaChat is an optional provider for Smart Occasion. The project uses Node.js 24.20.0 and npm 11.19.0. See [Architecture](docs/ARCHITECTURE.md) and [AI](docs/AI.md).

## Local launch and checks

Install Node.js 24.20.0, npm 11.19.0, Docker, and Docker Compose. Application library versions are pinned in `package.json` and `package-lock.json`; `requirements.txt` explains why there are no Python packages. From the repository root:

```sh
npm ci --ignore-scripts
npm run typecheck
npm run typecheck:pure
npm run test:unit
npm run build
docker compose up --build -d
docker compose --profile checks run --rm checks
```

The default Compose file creates an **isolated local test** PostgreSQL/Redis stack, a generated private test runtime in a Docker volume, API, and worker. Its fixture catalog is for development, not the 215-occurrence showcase. Open `http://localhost:3000/health/ready` to check readiness. The integration command runs the suite against this stack. To stop it:

```sh
docker compose down
```

To reproduce the reviewed 215-occurrence showcase in a fresh isolated database, follow [Catalog](docs/CATALOG.md) and the [deployment procedure](docs/DEPLOYMENT.md): migrate, import the four reviewed curated JSON sources under `scripts/data/`, and seed the labeled demo catalog. Do not replace an existing database or erase user rows to force a global count.

## Docker image and configured startup

Build the production image from this checkout with:

```sh
docker build --target release -t povod:local .
```

The published image can be pulled from GitHub Container Registry:

```sh
docker pull ghcr.io/n3onnhowever/the-boys-max:latest
```

For a configured API container, copy `.env.release.example` to a **private**, untracked `.env.release`, fill values in your own environment, and use externally provisioned PostgreSQL, Redis, and an approved HTTPS origin:

```sh
docker run --rm --env-file .env.release -p 127.0.0.1:3000:3000 ghcr.io/n3onnhowever/the-boys-max:latest
docker compose -f compose.release.yaml up --build -d
```

The release Compose file starts the API and worker; it does not create production PostgreSQL/Redis or configure MAX. Use [Deployment](docs/DEPLOYMENT.md) for migrations, catalog preparation, worker operation, external checks, and rollback. `amvera.yaml` is the separate Amvera startup configuration.

## Configuration and safety

`.env.example` and `.env.release.example` list configuration names and placeholders only. Required deployment settings include PostgreSQL `DATABASE_URL`, Redis `REDIS_URL`, `PUBLIC_ORIGIN`, MAX `BOT_TOKEN` and `MAX_WEBHOOK_SECRET`, plus session keys. `GIGACHAT_AUTH_KEY` is required only when `AI_EXTERNAL_ENABLED` enables external Smart Occasion. Keep all filled runtime files and credentials outside Git. Unknown prices remain unknown; synthetic events are labeled; provider output is advisory.

## Project structure

- `apps/api`, `apps/worker`, `apps/miniapp`: server roles and Mini App.
- `packages/`, `modules/`: domain, persistence, search, provider and social code.
- `migrations/`: PostgreSQL migrations.
- `scripts/data/`, `packages/demo/`: curated source inputs and labeled demo data.
- `data/provenance/real-catalog/`: source receipts and review evidence.
- `tests/`: unit and integration regressions.
- `deploy/`, `amvera.yaml`, `compose*.yaml`, `Dockerfile`: runtime and deployment configuration.
- `licenses/`, `certs/`, `patches/`: third-party notices and support files.
