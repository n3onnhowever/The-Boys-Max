# Accepted current decisions

Authority: [POVOD_SOURCE_AUTHORITY](POVOD_SOURCE_AUTHORITY.md), including explicit overrides of immutable imported specs and ADR wording.

- Product **Повод**; team **The Boys**. MAX bot nickname is unchanged; UI branding is T110.
- Frozen P0: Moscow; solo-first MAX identity, live events, structured filters, Occurrence detail, price/UNKNOWN/source, Save, basic «Мой Повод», MAX mobile + web.
- P1: Follow, Smart Povod, map. Stretch: second city and Shared Plan/social. No group prerequisite.
- TypeScript/Fastify modular monolith, separate API/worker, React/Vite Mini App, PostgreSQL durable truth.
- Queue: **KEEP_EXISTING_BULLMQ**. T103 PASS verified BullMQ 6.3.4, Redis 8.2.9 and PostgreSQL 18.6 durable-ledger behavior, including duplicates, crashes, dependency outages, retry/poison handling, graceful shutdown and governor behavior. The P0 queue comparison is closed.
- Accepted T103 residual risks are not automatic blockers: conservative `UNKNOWN` may suppress an unsent message; governor-state recovery needs controlled epoch/warm hold; stalled recovery was observed around 62–93 seconds; API readiness may remain green during Redis-only outage.
- KudaGo remains **CONDITIONAL_PRIMARY / NOT APPROVED**. T104 `DATA_RUNTIME_GATE = FAIL`; `LEGAL_MANUAL_GATE = OPEN`; Moscow is **NOT ACTIVATED**.
- Frozen Moscow Data Gate v1 remains the historical failed run. Its historical dates do not prove permanent lack of coverage and do not permit retroactive reinterpretation.
- Next data sequence: T105 data-safety/normalizer work, then a newly frozen future-dated **Moscow Data Gate v2**, then and only then a provider/live-ingestion decision. T107 is blocked by provider/data readiness.
- Unknown fees/prices stay unknown; conditional price and provenance follow Data Safety Patch. AI is optional advice, never authorization or hard facts.
- The [product trunk](PRODUCT_TRUNK_STATE.md) integrates accepted T106 MAX runtime and UI v1/quality work. No T105 or T107 implementation is active.
- No new spend, third-party tooling, MCP or hooks in this pass.

Gate v2 methodology is canonical in [PROVIDER_DATA_GATE_GOVERNANCE](PROVIDER_DATA_GATE_GOVERNANCE.md). Earlier decisions and immutable imported ADRs remain preserved as historical authority inputs.
