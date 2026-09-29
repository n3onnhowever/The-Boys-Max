# Queue decision gate

**Classification: BLOCKED** (2026-09-19, HEAD 4f9a198d4fa2b18686efa19a59b6ac78281d341d).

Actual evidence:
- package.json pins bullmq 6.3.4 and ioredis 5.11.1; no lockfile, installed graph, pg-boss or Valkey.
- compose.yaml declares redis:8.2.9 with durable AOF/everysec and noeviction; postgres:18.6. Release compose expects external Redis/PG.
- apps/worker/main.ts constructs Queue/Worker `max-effects`, concurrency 4, and runs PostgreSQL outbox reconciliation every second.
- packages/persistence/delivery.ts owns durable attempts, deduplication and explicit UNKNOWN outcomes. Redis also backs packages/platform/governor.ts/governor.lua; it is not merely a proposed new cache.
- tests/integration/foundation.test.ts includes real PG/BullMQ duplicate, Redis loss and worker-kill scenarios; tests/helpers/kill-worker.ts supports them.
- Fresh pure unit suite PASS 105/105. Integration NOT_RUN. Typecheck/build fail before compilation because tsc is absent. Docker info fails because dockerDesktopLinuxEngine is unavailable. PostgreSQL version/extensions not inspectable.

Why not the other classifications:
- NO_QUEUE_NEEDED would require proof that required work is one scheduled idempotent sync and a reviewed treatment of existing outbound functionality. Neither is established.
- KEEP_EXISTING_BULLMQ under ADR-003 requires runtime-green evidence; static code and unit tests do not satisfy that condition.
- EVALUATE_PG_BOSS requires runtime prerequisites and a justified need. Node version alone does not establish PostgreSQL/migration/hosting conditions or justify replacing implemented BullMQ.

Disposition: preserve existing BullMQ/Redis and outbox code. T103 verifies it first after T102 dependency reproducibility and daemon availability. Do not convert this BLOCKED result into permission to migrate.

Reproduction (future integration task, isolated test stack only; NOT executed here):
```powershell
docker info
npm ci --ignore-scripts
npm run typecheck
npm run test:unit
npm run build
docker compose build
docker compose up -d postgres redis prepare
docker compose stop worker
docker compose --profile checks run --rm checks
```
The suite owns its worker and uses TestTransport; never set a live gate to make it pass. Record build duration separately, excluding only initial base-image download. Any dependency compatibility failure is recorded before choosing a replacement. If Docker cannot start, record BLOCKED_DOCKER_DAEMON and follow docs/runbooks/DOCKER_WINDOWS.md; no system repair in this preflight.
