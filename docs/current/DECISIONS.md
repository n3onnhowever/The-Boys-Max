# Accepted current decisions

Authority: [POVOD_SOURCE_AUTHORITY](POVOD_SOURCE_AUTHORITY.md), including explicit overrides of immutable imported specs.

- Product **Повод**; team **The Boys**. MAX bot nickname is unchanged; UI branding is T110.
- Frozen P0: Moscow; solo-first MAX identity, live events, structured filters, Occurrence detail, price/UNKNOWN/source, Save, basic «Мой Повод», MAX mobile + web.
- P1: Follow, Smart Povod, map. Stretch: second city and Shared Plan/social. No group prerequisite.
- TypeScript/Fastify modular monolith, separate API/worker, React/Vite Mini App, PostgreSQL durable truth.
- Queue gate **BLOCKED** pending T103: keep existing Redis/BullMQ/outbox/governor. No migration or new queue architecture.
- Unknown fees/prices stay unknown; conditional price and provenance follow Data Safety Patch. AI is optional advice, never authorization or hard facts.
- KudaGo remains conditional / NOT APPROVED; no live ingestion or provider gate in T101/T102.
- One active implementation ticket; one integration owner for shared contracts/routes/migrations/dependencies/auth/session. Stop after T102 for human review.
- No new spend, third-party tooling, MCP or hooks in this pass.

Earlier decisions (including TBD and the old work order) are preserved in artifacts/t101/BASELINE_DOCUMENTS.json. Imported ADRs remain unchanged.
