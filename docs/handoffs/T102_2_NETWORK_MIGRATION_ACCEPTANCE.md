# T102.2 — network and migration acceptance

**T102 PASS. Stop for human review; no next ticket active.**

Starting and ending HEAD: 4f9a198d4fa2b18686efa19a59b6ac78281d341d, main, no commit. Starting dirty work from prior passes preserved; exact inventory/hashes in artifacts/t102_2/STARTING_STATE.json and PRESERVATION.json. User explicitly authorized this bounded final T102 pass.

Inputs: AGENTS.md, ACTIVE_TASK, T102.1 handoff/root cause/final verification, compose.yaml, compose.release.yaml, Dockerfile, README, all SQL migrations, migration runner and ledger, patch script/notice, focused deployment/history records.

## Result and minimal change

API was attached only to internal bridge test. Add normal frontend bridge and attach API to frontend + test, retaining 127.0.0.1:3000:3000. All other services stay on internal test; PostgreSQL/Redis have no host ports. Worker test behavior requires only backend. Release compose unchanged. API gains ordinary bridge egress under the approved topology; no host networking, firewall or system network changes. No application/contract/schema/queue/auth/UI change.

Migration: SAFE_PRE_RELEASE_EDIT based on available repository evidence. Runner stores four-digit ID plus SHA256 and fails on content mismatch. No evidence of original 0002 applied to external/shared/staging/production deployment; only local corrected ledger exists. The original failed clean transaction rolled back. Preserve correction plans_state_check -> plans_check in DROP target; no new change in this pass. Original/current hashes and limitations in MIGRATION_0002_SAFETY.md and MIGRATION_HASHES.json. Fresh project successfully applies 0001–0003. Any later-discovered external old ledger requires separate history review; no hash bypass.

## Actual checks

- clean-install: exit 0, 3.436 s; artifacts/t102_2/logs/clean-install.txt
- verify-dependencies: exit 0, 7.557 s; artifacts/t102_2/logs/verify-dependencies.txt
- syntax: exit 0, 0.832 s; artifacts/t102_2/logs/syntax.txt
- unit: exit 0, 3.445 s; artifacts/t102_2/logs/unit.txt
- typecheck: exit 0, 6.774 s; artifacts/t102_2/logs/typecheck.txt
- build: exit 0, 4.919 s; artifacts/t102_2/logs/build.txt
- docker-config: exit 0, 0.316 s; artifacts/t102_2/logs/docker-config.txt
- docker-build: exit 0, 25.132 s; artifacts/t102_2/logs/docker-build.txt
- docker-start: exit 0, 28.865 s; artifacts/t102_2/logs/docker-start.txt
- internal-live: exit 0, 0.397 s; artifacts/t102_2/logs/internal-live.txt
- internal-ready: exit 0, 0.393 s; artifacts/t102_2/logs/internal-ready.txt
- internal-root: exit 0, 0.395 s; artifacts/t102_2/logs/internal-root.txt
- host-live: exit 0, 0.036 s; artifacts/t102_2/logs/host-live.txt
- host-ready: exit 0, 0.025 s; artifacts/t102_2/logs/host-ready.txt
- docker-port: exit 0, 0.143 s; artifacts/t102_2/logs/docker-port.txt
- api-dependencies: exit 0, 0.422 s; artifacts/t102_2/logs/api-dependencies.txt
- worker-dependencies: exit 0, 0.421 s; artifacts/t102_2/logs/worker-dependencies.txt
- restart: exit 0, 14.771 s; artifacts/t102_2/logs/restart.txt
- host-live-restart: exit 0, 0.027 s; artifacts/t102_2/logs/host-live-restart.txt
- host-ready-restart: exit 0, 0.026 s; artifacts/t102_2/logs/host-ready-restart.txt
- fresh-start: exit 0, 28.557 s; artifacts/t102_2/logs/fresh-start.txt
- fresh-host-live: exit 0, 0.029 s; artifacts/t102_2/logs/fresh-host-live.txt
- fresh-host-ready: exit 0, 0.034 s; artifacts/t102_2/logs/fresh-host-ready.txt
- fresh-migrations: exit 0, 0.334 s; artifacts/t102_2/logs/fresh-migrations.txt
- diff-check: exit 0, 0.043 s; artifacts/t102_2/logs/diff-check.txt
- secret-prohibited-preservation-scan: exit 0, 0.131 s; artifacts/t102_2/logs/secret-prohibited-preservation-scan.txt

Unit 115/115, zero skips/failures; typecheck zero diagnostics. Docker clean build 25.132 s <=300 s, default startup 28.865 s, restart 14.771 s, fresh-volume startup 28.557 s. Base images already local. Exact executable/argv/commands, UTC starts, exits, durations and source hashes in COMMAND_RESULTS.json; logs retain outputs. Internal /health/live, /health/ready and HTML root 200. Windows curl to http://127.0.0.1:3000/health/live and /health/ready 200 before/after restart and fresh startup. docker port and NetworkSettings.Ports confirm localhost binding; network inspect confirms backend internal/frontend noninternal; PG/Redis unpublished. API and worker each execute PostgreSQL SELECT 1 and Redis PING before/after restart. This does not certify delivery correctness.

Persistence: existing migration ledger (including timestamps), synthetic actor/occurrence counts and named volume mounts unchanged across stop/start. Redis remains on its AOF volume and accessible; no crash/fault-injection durability claim. Both default and fresh stacks stopped; all volumes retained. Fresh project: the-boys-t102-2-fresh. Default reproduction: docker compose up --build -d; stopped default resume: docker compose start postgres redis api worker.

Versions observed: Node 24.20.0, npm 11.19.0, PostgreSQL 18.6, Redis 8.2.9, BullMQ 6.3.4, ioredis 5.11.1, Drizzle 0.45.2, Fastify 5.12.3; Engine/Compose receipts in logs.

Drizzle: fresh npm ci restores all 15 upstream before hashes. Explicit typecheck prefix applies all corrections, build verifies idempotently. All after hashes match; JS/CJS hash map and package-lock unchanged. Version/input/output guards reviewed; no patch redesign/upgrade. Provenance pinned npm tarball/source maps, Apache-2.0, licenses/drizzle-orm-0.45.2-NOTICES.md. Retained technical debt.

## Safety and limits

Secret/prohibited-file heuristic scan PASS, git diff --check PASS. No runtime file or full container env printed. Existing synthetic source literals are not external credentials. No exhaustive secret-detection guarantee. Initial sandbox process setup failed; authorized escalated shell succeeded. Git ownership differed, handled only via per-command -c safe.directory; no global Git setting changed. This was not an application/Docker failure.

Files: artifacts/t102_2/FILES_CHANGED.md. Tested source manifest unchanged except subsequent README documentation update; final hashes recorded separately. No pre-existing file outside the declared pass edits changed.

NOT_RUN: T103 queue fault injection/integration suite, provider/live ingestion/rights approval, real MAX auth/mobile/web/browser acceptance, release deployment. Contract deltas: none. Remaining T102 blockers: none.

T103: T102 prerequisite unblocked, but NOT STARTED and requires separate human activation; queue decision still BLOCKED pending runtime verification. T104: no automatic start; provider/rights and separate authorization remain. T106: not ready as accepted E2E; MAX/client prerequisites and separate authorization remain. T105 also NOT STARTED. Manual T102 repair: none. Next action: review this handoff, then explicitly select the next ticket.
