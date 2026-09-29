# T102.1 — compiler repair and Docker baseline

**CODE BASELINE PASS. T102 overall PARTIAL: Docker host access requires network/isolation review.**

Starting/ending HEAD: 4f9a198d4fa2b18686efa19a59b6ac78281d341d, main; no commit. Starting T070/T101/T102 changes preserved. User explicitly activated this bounded T102 continuation. Stop here for human review; T103/T104/T105/T106 NOT STARTED.

Inputs: AGENTS.md, ACTIVE_TASK, T101/T102 handoffs, artifacts/t102 BUILD_BLOCKERS/COMMAND_RESULTS/FINAL_VERIFICATION and compiler logs; package/lock/tsconfig and installed dependency declarations; source authority and data safety patch. Starting file hashes: artifacts/t102_1/STARTING_HASHES.json. Final source revision: 07b6d7888655a1ea9c77a091554de630f431d2617092704717f77aedb6455757, files in SOURCE_REVISION.json (includes migrations). CODE_ONLY revision records earlier compiler phase.

## Changes

1. ioredis named Redis imports at five source/helper sites, matching installed CJS/ESM contract. No queue behavior change.
2. Fastify unknown error narrowing with validation-array check and integer HTTP status guard; domain/application handling unchanged.
3. HTTP Amount discriminated union matching domain; existing canonical price validator retained, no change to domain price arithmetic, conditional/raw evidence or UNKNOWN.
4. Leaflet first coordinate checked before setView; no UI change.
5. Pinned Drizzle 0.45.2 declaration-only repair across 15 files, guarded by version and input/output hashes. Explicit prefix in typecheck/build; no hooks. Strict and skipLibCheck=false unchanged. Apache-2.0 license/notice retained. Existing pins unchanged; dev peers gel 2.2.1/mysql2 3.24.4 added to resolve mandatory cross-dialect declaration references.
6. One-line migration 0002 DROP target corrected from plans_state_check to plans_check, proven on real PostgreSQL. Constraint expression/schema intent unchanged.
7. Ten focused unit tests added: amount/price boundary, native Redis export, SQL generation, Fastify responses.

Exact files: artifacts/t102_1/FILES_CHANGED.md. Full cause counts and patch rationale: ROOT_CAUSE_ANALYSIS.md.

## Actual validation

| Command | Result (exit) | Duration |
|---|---|---|
| npm.cmd ci --ignore-scripts | PASS (0) | 3.449 s |
| npm.cmd run verify:dependencies | PASS (0) | 7.360 s |
| npm.cmd run syntax | PASS (0) | 0.819 s |
| npm.cmd run test:unit | PASS (0) | 0.845 s |
| npm.cmd run typecheck | PASS (0) | 4.194 s |
| npm.cmd run build | PASS (0) | 4.695 s |
| docker compose --progress plain build --no-cache | PASS (0) | 24.759 s |
| docker compose up --build -d | PASS (0) | 27.250 s |
| docker compose exec -T api node --input-type=module -e for (const path of ['/health/live','/health/ready']) { const r=await fetch('http://127.0.0.1:3000'+path); const body=await r.json(); if(!r.ok || (path.endsWith('live') ? body.alive!==true : body.database!=='UP')) process.exit(1); console.log(JSON.stringify({path,status:r.status,body})); } const r=await fetch('http://127.0.0.1:3000/'); if(!r.ok || !r.headers.get('content-type')?.includes('text/html')) process.exit(1); console.log('HTML 200'); | PASS (0) | 3.424 s |
| docker compose stop | PASS (0) | 1.023 s |
| docker compose start postgres redis api worker | PASS (0) | 14.674 s |
| docker compose exec -T api node --input-type=module -e import {setTimeout} from 'node:timers/promises';for(let i=0;i<30;i++){try{const a=await fetch('http://127.0.0.1:3000/health/live');const b=await fetch('http://127.0.0.1:3000/health/ready');const live=await a.json(),ready=await b.json();if(!a.ok||!b.ok||live.alive!==true||ready.database!=='UP')throw Error('Not ready');console.log(JSON.stringify({live,ready}));process.exit(0);}catch{await setTimeout(1000);}}process.exit(1); | PASS (0) | 3.439 s |

Unit: 115/115, no skips. npm ci --ignore-scripts leaves lock hash unchanged. Initial fresh compiler results: typecheck 89 / build 83; 70 Drizzle diagnostics in each. Docker clean build 24.759 s <= 300 s; initial base pulls separately: Node 16.493 s, PostgreSQL 23.005 s, Redis 7.574 s. No cache prune or system settings changes.

Actual host/container Node v24.20.0, npm 11.19.0; container PostgreSQL 18.6, Redis 8.2.9, BullMQ 6.3.4, ioredis 5.11.1, Drizzle 0.45.2, Fastify 5.12.3. Engine 29.7.2 / Compose 5.5.1. Runtime versions and migration checksums saved in logs. PostgreSQL/Redis/API healthy; worker running; init/migrate/prepare exit 0. Internal live/ready/HTML PASS before restart; internal live/ready PASS after restart. Containers stopped at end, volumes retained.

## Remaining blocker and limits

**BLOCKED_NETWORK_DECISION**: requested 127.0.0.1:3000 binding exists in HostConfig, but NetworkSettings.Ports is empty because API is only on internal bridge. Host HTTP/curl fails; this is NOT BLOCKED_DOCKER_DAEMON. Docker overall is PARTIAL, not an accepted host-accessible one-command demo. No new network, egress relaxation, proxy, firewall or Desktop modification applied. Human review must choose how to expose localhost while preserving required isolation.

Reproduce: docker compose start postgres redis api worker; docker compose exec -T api node -e "fetch('http://127.0.0.1:3000/health/ready').then(async r=>console.log(r.status,await r.text()))"; curl.exe --fail --max-time 5 http://127.0.0.1:3000/health/ready; docker inspect --format '{{json .HostConfig.PortBindings}} {{json .NetworkSettings.Ports}}' the-boys-integration26-test-api-1; docker compose stop.

NOT_RUN: T103 fault injection/integration suite, provider ingestion/gates, real MAX auth/client, UI/browser acceptance, live E2E, deployment. Basic health does not certify delivery correctness. Runtime data is synthetic. Follow/map/Smart/social scope unchanged. Existing Fastify disableRequestLogging deprecation remains a non-blocking notice. Legacy wire's explicit conditional PriceSnapshot mapping remains T105.

Risks: local declaration patch maintenance; new dev-only peer graph; changed unapplied 0002 migration checksum needs separate review for any previously migrated environment. Previous import/spec/research bytes and T101/T102 evidence preserved. No secrets intentionally recorded; heuristic scan limitations in SECRET_SCAN.json.

T103: compiler and isolated PG/Redis prerequisites now demonstrated, but not activated/unblocked as an approved ticket; T102 network review remains. T104: code build prerequisite satisfied, independent provider/rights gate and human activation still required. T106: not ready for end-to-end acceptance; host network and MAX provisioning/client gates remain. No next ticket authorized.
