# Повод

Повод is a Moscow event discovery Mini App for MAX. A person can search live event occurrences with structured filters, inspect source and price evidence, save an occurrence, and use «Мой Повод». Plans, RSVP, Friends, Notifications, and Smart Occasion are present; joining a group is never required to discover or save an event.

## Architecture

The repository is a TypeScript modular monolith: a Fastify API, a separate worker role, and a React/Vite Mini App. PostgreSQL holds business state. Redis/BullMQ handles asynchronous delivery backed by a durable outbox and idempotency controls. MAX Bot API calls remain server side; the MAX Bridge runs in the client. GigaChat can propose search filters, while application code enforces eligibility and waits for user acceptance.

See [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), [catalog](docs/CATALOG.md), and [AI](docs/AI.md). The accepted product specifications and ADRs remain in `docs/product/` and `docs/architecture/adr/`.

## Repository

- `apps/api`, `apps/worker`, `apps/miniapp`: API, worker, and Mini App.
- `packages/`, `modules/`: domain, persistence, integrations, search, and AI.
- `migrations/`: append-only PostgreSQL migrations.
- `scripts/data/`: four reviewed curated catalog inputs; `packages/demo/` holds the labeled synthetic catalog.
- `data/provenance/real-catalog/`: bounded source receipts and review evidence.
- `tests/`: unit and integration regression suite.
- `deploy/`, `certs/`, `licenses/`, `patches/`: deployment and third-party support files.

## Local setup and checks

Use Node 24.20.0, npm 11.19.0, PostgreSQL and Redis. Copy the appropriate environment template into private local configuration; never commit filled values. For a fresh isolated database:

```sh
npm ci --ignore-scripts
npm run migrate
npm run import:curated-official -- scripts/data/curated-official-v1.json scripts/data/curated-official-tretyakov-exact-v1.json scripts/data/curated-kudago-moscow-a-v1.json scripts/data/curated-kudago-moscow-b-v1.json
npm run seed:demo
npm run typecheck
npm run typecheck:pure
npm run test:unit
npm run test:integration
npm run build
```

The integration suite needs isolated PostgreSQL databases and test environment variables; `scripts/test-handoff-integration.ps1` provisions the local test pair on Windows. Run `npm run start:api` and `npm run start:worker` after building. `npm run diagnose:catalog` prints aggregate catalog counts without user rows. Do not run the demo seed in live-only mode.

## Amvera, MAX, and GigaChat

`amvera.yaml` starts migrations, imports the four reviewed sources, seeds demo v3, then supervises API and worker. Follow the [production preflight and rollback procedure](docs/DEPLOYMENT.md) before uploading a source package. Production database and Redis state must remain in place.

MAX integration uses a server-side webhook, durable delivery, session/auth and deep links. Configure the existing MAX bot and webhook through private operator settings; see [deployment](docs/DEPLOYMENT.md). GigaChat is gated by `AI_EXTERNAL_ENABLED` and proposes only a structured Smart Occasion intent; see [AI](docs/AI.md).

Environment variable names: `APP_MODE`, `DEMO_CATALOG_VERSION`, `PUBLIC_ORIGIN`, `COOKIE_PROFILE`, `MAX_INGRESS_MODE`, `DATABASE_URL`, `REDIS_URL`, `SESSION_KEY`, `ESCROW_KEY`, `BOT_TOKEN`, `MAX_WEBHOOK_SECRET`, `CREDENTIAL_SCOPE`, `LIVE_GATE`, `MAX_BOT_USERNAME`, `POVOD_MINIAPP_URL`, `POVOD_PRIVACY_URL`, `POVOD_ABOUT_URL`, `ALLOWED_SOURCE_ORIGINS`, `CURATED_SOURCE_HOSTS`, `AI_EXTERNAL_ENABLED`, `GIGACHAT_AUTH_KEY`, `MAP_EXTERNAL_ENABLED`, `POVOD_OUTBOUND_ARM_ID`, and optionally `NODE_EXTRA_CA_CERTS`. See `.env.example` and `.env.release.example` for the complete templates. No secret values belong in this repository.
