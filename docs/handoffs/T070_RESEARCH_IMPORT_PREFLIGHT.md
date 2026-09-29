# T070 handoff — research import and repository preflight

Status: DOCUMENTATION PREFLIGHT COMPLETE; Phase 2 NOT STARTED. Human review is the explicit next gate.

Source: D:/Dev/Repos/The-Boys-Max, main, HEAD 4f9a198d4fa2b18686efa19a59b6ac78281d341d; initial Git status clean; no remotes. ZIP SHA-256 eb06177c37aaadddcce3f0aeeb6f98406c6ec9d10a7a8f254fa15dd171614aa0. Exact official PDF SHA-256 638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a, 22 pages, matching synthesis. All five authority paths/hashes are in CURRENT_STATE_RECEIPT.json.

Changed: only docs/tasks/ACTIVE_TASK.md among pre-existing tracked files; new task T070, current authority overlay, immutable product/ADR/synthesis/research import, research INDEX, this handoff and artifacts/preflight evidence. Full imported-file mapping: IMPORT_MANIFEST.json. Full created/changed inventory: FILES_CREATED.json.

Preserved: apps/, packages/, modules/, migrations/, tests/, scripts/, package.json, dependency state, Docker/compose, MAX auth/Bridge/Bot transport, AGENTS.md, old current/product/design documents, team brand assets, supplied ZIP bytes. No commit, migration, deployment, provider request, bot action, skill installation or global config change.

Executed: unit PASS 105/105; typecheck/build BLOCKED_DEPENDENCIES (tsc unavailable); Docker info BLOCKED_DOCKER_DAEMON; archive CRC 10/10 PASS; 39/39 supplied manifest entries match plus manifest itself independently hashed; exact official case hash matches and page 10 visually checked; final git diff --check, JSON validation, code-preservation comparison and heuristic secret/prohibited-file scan recorded in FINAL_VERIFICATION.json/SECRET_SCAN.json. All command details: COMMANDS_RUN.md and COMMAND_RESULTS.json.

NOT_RUN: real PG/Redis/BullMQ integration, Docker build/start/timing, MAX/mobile/web/API2 runtime, provider runtime/legal approval, browser screenshots, lint (not configured). psql unavailable. No passing unit test is represented as runtime acceptance.

Architecture: TypeScript/Fastify + React/Vite modular monolith, PostgreSQL durable state, separate API/worker, implemented Redis/BullMQ outbox delivery. Queue classification BLOCKED because ADR-003 requires runtime evidence not available here; preserve existing path pending T103. No queue migration.

Contract deltas: NONE to executable interfaces, schema or auth. Documentation precedence now explicitly points to supplied Scope Freeze and safety patch. Record conflicts rather than editing imported sources: stale TBD; old 2–3-city/map/Follow/Smart/social P0; omitted conditional price fields; old fixed BullMQ rule versus repository-gated ADR; optional-save wording versus required capability. CONFLICTS.md lists exact locations.

Residual risks: no lock/dependencies/reproducible build; daemon unavailable; KudaGo NOT APPROVED; stable occurrence identity/sync ledger missing; favorites/preferences/new navigation missing; live MAX and submission evidence absent. Source helper/adapters are not live integrations. Existing donor notice references missing copied-path evidence. No usable deployment URL or CI is verified.

Next action: human reviews CURRENT_STATE_RECEIPT.md, IMPLEMENTATION_GAP_MATRIX.md and ORDERED_IMPLEMENTATION_TICKETS.md. If accepted, start only T101, then T102 dependency/build baseline. T103 verifies existing queue; T104 and T106 carry external provider/MAX gates. Detailed ordered T101–T113 acceptance criteria are proposed, not executed.
