# ПОВОД — IMPLEMENTATION PLAN
**Status:** ready for repository preflight  
**Rule:** no new broad research before repository evidence unless a concrete blocker appears.

# Phase 0 — READ-ONLY REPOSITORY PREFLIGHT

No code edits.

Produce:
- current HEAD/branch/dirty state;
- repo tree;
- Node/package manager/lockfile;
- DB/extension versions;
- Docker/compose state;
- actual BullMQ/Redis/worker use;
- provider modules;
- MAX auth/Bridge/Bot/API modules;
- current tests/commands;
- current canonical docs;
- secret/dependency scanners;
- current CI;
- current deployment URL(s).

Output:
`artifacts/preflight/CURRENT_STATE_RECEIPT.{md,json}`

Decision after Phase 0:
- queue path: no queue / keep green BullMQ / pg-boss candidate;
- current gaps vs canonical docs;
- exact file mapping for later work.

# Phase 1 — REPOSITORY GOVERNANCE + REPRODUCIBILITY

1. Import research archives under `docs/research/2026-09-18/raw/`.
2. Put this synthesis under `docs/current/` or equivalent existing canonical path.
3. Keep old research/docs as archive/history; do not overwrite facts silently.
4. Root/index document defines source-of-truth order.
5. Ensure lockfile is present.
6. Normalize Docker reproducibility:
   - Dockerfile(s)
   - compose
   - .dockerignore
   - .env.example
7. README matches actual commands and main flow.
8. Add exact official-case compliance checklist.

Do not create ten long-lived Git branches. Use folders for research. One short-lived documentation/import branch is enough if normal team workflow requires a branch.

# Phase 2 — DATA / PROVIDER CORE

## 2.1 Run KudaGo gate
Use/adapt the existing runtime probe.
Persist:
- requests/parameters;
- sanitized raw responses or lawful hashes;
- timestamps;
- normalized outputs;
- 12-task results;
- false-PASS count.

No `City=active` and no KudaGo “approved” claim before gate closure.

## 2.2 Implement safe ingestion contract if missing
- provider sync run/checkpoint;
- incomplete run cannot delete/tombstone;
- source mappings;
- Event vs Occurrence;
- raw critical evidence/hash;
- provenance;
- price kind + conditional + raw text + evidence scope;
- strict PASS/FAIL/UNKNOWN hard filters.

## 2.3 Search
Use current PostgreSQL first.
Add FTS/pg_trgm only where needed.
PostGIS only if current P0/P1 geo actually uses it.
Benchmark representative queries before adding services.

# Phase 3 — MAX P0 E2E

Implement/verify:
1. bot + attached Mini App;
2. server validation of MAX launch data;
3. app session strategy;
4. current MAX API2/TLS path;
5. interest/conditions UI;
6. live feed/results;
7. occurrence detail;
8. price/UNKNOWN/source;
9. source opening;
10. save persistence;
11. loading/empty/error/source unavailable;
12. repeat login.

Runtime matrix:
- MAX mobile 360;
- 390;
- 430;
- MAX web.

`startapp`, share and Smart Povod do not block this phase.

# Phase 4 — SECURITY / FAILURE / SUBMISSION EVIDENCE

Tests:
- valid/tampered/stale launch data;
- object authorization;
- source URL handling;
- conditional/free/unknown prices;
- missing location/end time;
- provider malformed/429/timeout/partial response;
- duplicate imports;
- incomplete sync;
- DB failure/restart;
- queue duplicate/worker kill only if a queue is actually used;
- save repeat/idempotency.

Observability:
- structured redacted logs;
- request/correlation ID;
- health/readiness;
- bounded metrics using existing stack.

Submission:
- Docker clean build timing <= case requirement;
- one-command startup;
- HTTPS API if applicable;
- OpenAPI 3.0/3.1;
- DATA-API.yaml;
- test data;
- judge path;
- evidence manifest per SHA.

# Phase 5 — P1 ONLY IF P0 GREEN

Optional:
- artist/topic Follow;
- one Smart Povod flow:
  follow → real occurrence → bot message → runtime-verified exact-context open;
- delivery ledger/deduplication;
- map only if stable/useful.

No platform-bonus chasing before P0 evidence is green.

# Phase 6 — PRESENTATION / DESIGNER HANDOFF

Only after real runtime screenshots:
- update claim/evidence register;
- replace concept screens with runtime screens;
- prepare service slide exactly per case;
- finalize content deck;
- hand design blueprint + assets/tokens to designer;
- produce 90-second demo;
- create backup demo only with clearly labelled evidence/fallback semantics.

# Stop conditions

Stop and escalate instead of “solving around”:
- canonical scope conflict;
- provider rights unclear for needed behavior;
- MAX capability not supported on required client;
- queue migration would consume core schedule;
- external service added without measured need;
- false PASS in hard constraints.
