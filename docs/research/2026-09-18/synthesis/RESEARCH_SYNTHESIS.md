# ПОВОД — CENTRAL RESEARCH SYNTHESIS
**Date:** 2026-09-19  
**Team:** The Boys  
**Inputs:** 10 verified research archives + canonical Povod documents + exact 22-page official case  
**Status:** CANONICAL SYNTHESIS v1 — implementation decisions still require repository/runtime receipts where stated

# 1. Executive verdict

The research wave is complete enough to stop broad technology/product exploration and begin implementation.

The ten archives are unusually consistent on the most important conclusion:

> **Do not expand P0. Build and prove the frozen solo-first flow.**

The largest remaining risks are not missing ideas. They are:
1. current repository/runtime state is not yet centrally receipted;
2. KudaGo is still **CONDITIONAL / NOT APPROVED** until runtime + legal gates close;
3. MAX mobile/web/auth/API2 runtime is not proven on the release build;
4. reproducible Docker/API/submission evidence is not yet green;
5. actual user usability/PMF has not been measured.

# 2. Source-of-truth precedence

From now on, use this precedence:

1. **Official hackathon case** (mandatory submission/evaluation requirements)
2. `POVOD_FINAL_SCOPE_FREEZE_MVP.md`
3. `POVOD_PRODUCT_SPEC_V1.md` + `POVOD_PRODUCT_SPEC_V1_1_DATA_SAFETY_PATCH.md`
4. `POVOD_PRODUCT_CONTRACT_V1.json`
5. accepted ADRs in this synthesis package
6. runtime evidence from one identified Git SHA/build
7. research archives as evidence/background

Research archives are **not** canonical product specs and must never overwrite frozen P0 silently.

# 3. Resolved research contradictions

## 3.1 Official-case availability — RESOLVED
Several research archives could not directly reopen the case and therefore left compliance as an open blocker.

During synthesis the original 22-page `official_case.pdf` from the project package was reopened and inspected.

SHA-256:
`638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a`

Therefore:
- the case-availability blocker is removed;
- exact requirements are captured in `CASE_COMPLIANCE_MATRIX.md`;
- Codex must still hash/read the repository copy or input copy before submission to guarantee it is the same revision.

## 3.2 Queue architecture
There is no justification for Kafka/Redpanda/Temporal in hackathon P0.

Canonical rule:
1. inspect current repository first;
2. if P0 can run with one scheduled idempotent sync, use **no generic queue**;
3. if current BullMQ is already implemented and runtime-green, **keep it** rather than migrate;
4. otherwise `pg-boss` is the conditional candidate if runtime prerequisites fit;
5. do not add Redis/Valkey solely to obtain a queue.

Business idempotency and partial-sync safety are mandatory regardless of queue choice.

## 3.3 Data/search architecture
Canonical P0:
- PostgreSQL is source of truth;
- use stable PostGIS only if geo is implemented;
- PostgreSQL FTS + GIN + `pg_trgm` are the first search tools;
- benchmark before adding an external search service;
- no Meilisearch/Typesense/Elastic/OpenSearch in P0;
- no vector DB/LLM parser/ranker.

Do **not** force an upgrade to a version merely because research listed the latest patch. Codex must first inspect the current supported runtime and hosting constraints.

## 3.4 KudaGo
Canonical status:
**CONDITIONAL_PRIMARY / NOT APPROVED.**

Technical fit is high, but release depends on both:
- exact frozen runtime data-gate receipt;
- legal/manual clarification for MAX Mini App attribution/indexability, advertising materials, cache/storage/history/images as used by our implementation.

No production-approved fallback currently exists.

## 3.5 MAX
Canonical direction:
- Mini App is the primary Povod UI;
- per official case, the Mini App must be connected to a chatbot and is not an isolated service;
- validate MAX launch identity server-side;
- never trust `initDataUnsafe` or `startapp` as authorization;
- keep product state on backend;
- current MAX API transport must use the current documented API2 endpoint/certificate path;
- bot notifications/Smart Povod are P1, not required P0;
- no architecture based on programmatic group-member addition;
- MAX UI adoption is optional/conditional, not a reason to migrate frontend stack;
- share/deep-link/open-app exact client behavior remains a runtime test.

## 3.6 UX
Keep:
- «Повод»;
- solo-first;
- Moscow-first P0;
- Poster Pop brand + calmer working UI;
- `Для тебя / Поиск / Сохранённые`;
- Event != Occurrence;
- explicit UNKNOWN;
- source/provenance;
- Save separate from Follow and Going/commitment.

Change/clarify:
- never show “checked today” unless timestamp semantics support it;
- map does not block P0;
- social does not block P0;
- no AI match percentages;
- material-change UI is shown only when the data model can prove a change.

## 3.7 User validation
The final user-validation archive contains **desk/public evidence**, not completed interviews or usability sessions.

Therefore presentation language must not say:
- “users proved…”
- “6/8 interviewees…”
- “usability test showed…”

unless we actually run those sessions later.

This does not block P0 development. A small real usability pass remains high-value after a stable build exists.

# 4. Canonical P0 technical direction

## Application
- MAX-connected Mini App
- solo-first core
- Moscow live data
- structured filters
- occurrence detail
- explicit price/UNKNOWN/source
- optional save
- basic profile

## Persistence
PostgreSQL-centered.

Mandatory domain safety:
- Event != Occurrence
- provider-source mapping separate from canonical IDs
- sync-run ledger/checkpoint
- incomplete sync cannot infer deletion
- raw critical source evidence/hash
- `price_kind` includes conditional/unknown
- add price evidence scope (`EVENT | OCCURRENCE | UNKNOWN`) if not already represented equivalently
- no fake coordinates, midnight, end-time or zero-price defaults

## Search
Start with PostgreSQL FTS/GIN + pg_trgm.
PostGIS only where useful.
Measure before adding services.

## Async
Repository-gated:
- no queue, OR
- keep already green BullMQ, OR
- pg-boss after prerequisites/runtime verification.

No Kafka/Redpanda/workflow engine in P0.

## Security/reliability
Minimum required:
- server-side MAX launch validation
- object-level authorization
- startapp context != authorization
- bounded retry/timeout
- duplicate-safe writes
- redacted structured logs
- correlation/request IDs
- health/readiness
- secrets outside repo
- failure tests for provider/DB/worker paths
- minimum account/data deletion mechanism if required for public placement

Do not self-host a full observability platform just for the hackathon unless already available.

# 5. Main blockers ordered by execution priority

## B0 — Current repository receipt
Before architecture changes:
- HEAD/branch/dirty state;
- Node/package manager/lockfile;
- DB version/extensions;
- current Redis/BullMQ/worker usage;
- current MAX/auth implementation;
- Docker state;
- tests/build commands;
- current provider code.

## B1 — Provider gate
- run exact current KudaGo runtime probe;
- preserve sanitized raw receipts/hashes;
- close 12-task matrix;
- prove zero critical false PASS;
- obtain/record legal/manual provider decisions.

## B2 — MAX runtime
- valid/tampered/stale identity tests;
- current API2/TLS call from release image;
- real MAX mobile;
- real MAX web;
- source opening;
- repeat login/session;
- only later P1 bot/deep-link flow.

## B3 — Submission reproducibility
- lockfile;
- Dockerfile/compose/.dockerignore/.env.example;
- clean one-command startup;
- Docker build <= 5 minutes excluding initial base-image download;
- README exact scenario;
- API HTTPS/OpenAPI/DATA-API/test data if own API remains part of solution.

## B4 — Evidence
One release SHA must have:
- build/start logs;
- runtime screenshots;
- provider receipt;
- MAX mobile/web proof;
- happy + empty + error + UNKNOWN + conditional price;
- save/repeat-login;
- evidence manifest.

# 6. Things explicitly rejected for P0

- Kafka
- Redpanda
- Temporal
- Trigger.dev/Inngest as P0 dependency
- new Redis solely for queue/cache
- Elasticsearch/OpenSearch/Meilisearch/Typesense
- vector DB
- LLM price parser/dedup/ranking
- multi-provider engine
- whole-Russia launch claim
- 2–3-city MVP claim
- mandatory social/group flow
- programmatic MAX group-member add dependency
- ticket purchase/payment/live seats
- full organizer CRM
- fake freshness/coordinates/time/price
- provider images/content reuse before rights are clear
- broad skill marketplaces / dozens of Codex skills
- many overlapping writer agents

# 7. Things deferred

## P1 after P0 green
- artist/topic Follow
- one Smart Povod closed loop
- map if core is stable and coordinates are good
- notification delivery ledger/idempotency

## Stretch
- second city after independent data gate
- optional shared plan
- richer subscriptions
- additional providers after separate approval

# 8. Research wave status

The research itself is no longer the project bottleneck.

The next project state should be:

`RESEARCH COMPLETE → REPOSITORY PREFLIGHT → IMPLEMENT → RUNTIME VERIFY → EVIDENCE → PRESENT`

Do not open another broad “which technology should we use?” round unless the preflight exposes a concrete blocker not covered here.
