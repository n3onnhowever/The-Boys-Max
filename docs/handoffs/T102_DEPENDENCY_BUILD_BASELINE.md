# T102 — dependency and build baseline

**Status: PARTIAL. Stopped for human review; T103+ NOT STARTED.**
Starting/ending HEAD: `4f9a198d4fa2b18686efa19a59b6ac78281d341d`, branch main. No commit. Starting tree already contained T070 preflight/import changes; this pass preserves them. Source revision includes working-tree hashes, not SHA alone.

Inputs: T101 handoff; package.json/.npmrc; existing verification scripts and TS configs; Docker/compose/env examples; official case/freeze/spec/patch/contract/ADRs/synthesis verified in artifacts/t101/SOURCE_VERIFICATION.json. Exact source hashes: artifacts/t101/BASELINE_HASHES.json; final file inventory/hashes: artifacts/t102/FILES_CHANGED.json and FINAL_SOURCE_HASHES.json.

Changes: real npm-generated package-lock.json; .gitignore admits existing safe .env.release.example (bytes unchanged); repository-local README; explicit missing donor-provenance notice; current task/state/gaps and evidence. No dependency pins, app/UI/auth/queue/Event/Occurrence/schema/compiler settings, Docker config or runtime behavior changed. Existing BullMQ/Redis/outbox/governor remain. No third-party tools/Skills/MCP/hooks installed.

| Check | Actual result |
|---|---|
| Host versions | Node v24.20.0, npm 11.19.0 |
| npm install --package-lock-only --ignore-scripts | PASS exit 0; 36.617 s; npm lockfile v3; 150 package entries |
| npm ci --ignore-scripts | PASS exit 0; 3.591 s; 120 packages; node_modules absent beforehand |
| npm ls --all --json | PASS exit 0; actual installed graph saved |
| npm run verify:dependencies | PASS exit 0; all pinned metadata read |
| npm run syntax | PASS exit 0; no diagnostics |
| npm run test:unit | PASS exit 0; 105/105, 0 skipped |
| npm run typecheck | FAIL exit 2; 89 diagnostics (70 in dependency declarations), 7.418 s |
| npm run build | FAIL exit 2; 83 diagnostics (70 in dependency declarations), 3.913 s; stopped at tsc before Vite |
| docker info | BLOCKED_DOCKER_DAEMON exit 1; missing dockerDesktopLinuxEngine pipe |
| Both compose configs | PASS static validation only; release config checked without resolving env_file |
| Env policy | Safe template visible; .env/.env.release/.env.local ignored |

Lock SHA-256: `1fa85552dd5227742fed4564e2ccf0ad2cbd33ed8f11da15100bb38e558fb828`. Direct pins and package.json unchanged. No ERESOLVE or engine conflict occurred; compiler failures are separate. Lifecycle scripts disabled throughout. Details: LOCKFILE_RECEIPT.json, LOCKED_PACKAGES.json, dependency-preflight.json and installed-graph log.

Exact check argv, exit codes, durations and logs: artifacts/t102/COMMAND_RESULTS.json. Full unit/typecheck/build logs are under artifacts/t102/logs/. Human-readable execution notes: COMMANDS_RUN.md. Final diff/status/secret/prohibited-file checks: FINAL_VERIFICATION.json, SECRET_SCAN.json and logs/final-status.txt. Exact full changed-file list: FILES_CHANGED.md / FILES_CHANGED.json; separate pre-existing preflight changes are not attributed to T102.

## Remaining blockers and minimal next action

1. Compiler baseline: Drizzle 0.45.2 declarations, ioredis NodeNext imports, Fastify unknown errors, HTTP/domain price-union mismatch and Leaflet bounds. Exact errors and bounded correction proposal: artifacts/t102/BUILD_BLOCKERS.md. No compiler suppression, unchecked contract cast, silent upgrade or dependency patch applied. Review the narrow repair plan before another T102 pass.
2. Docker: manually restore/start Docker Desktop Linux engine, then `docker info`. After compiler baseline is green, record base-image pull separately, clean build duration, `docker compose up --build -d`, health, actual versions, stop/restart and logs as documented in README. No system configuration changed automatically.
3. T112: missing historical EventHive copied/adapted path/hash artifact remains BLOCKED_PROVENANCE_T112. Existing licence retained; no invented provenance.

NOT_RUN: Docker pull/build/start/health/stop/restart/timing, actual container versions, PostgreSQL/Redis reachability, migrations/seed/integration/fault injection, MAX/provider/browser/live gate, OpenAPI generation/deployment. Declared image tags are not observed versions. Partial ignored dist from failed tsc is not a build artifact for release. No final build exists to use for screenshots.

Contract deltas: NONE. P0 and queue remain frozen; queue classification BLOCKED.
T103 unblocked: **NO** — needs successful T102 build + isolated PG/Redis/Docker; human activation also required.
T104/T106 are conceptually independent of T103's queue decision, but **not activated**. Their documented T102 prerequisite is not fully satisfied. After review, bounded standalone provider/manual preparation for T104 can proceed independently of queue faults; real T106 release-image/client checks need working build/Docker, provisioned attached Mini App and local credentials. Do not run two implementation writers/tickets concurrently.

Manual action: review this diff and compiler repair proposal; start Docker Desktop when ready; separately provide/confirm provider-use and MAX provisioning through future approved tasks without sending secrets in chat. This pass stops here.

## Later authorized continuation

This receipt preserves the earlier PARTIAL run. Current result: [T102.1 handoff](T102_1_COMPILER_DOCKER_BASELINE.md): CODE BASELINE PASS; Docker internal runtime PASS, host publication blocked pending network/isolation review.
