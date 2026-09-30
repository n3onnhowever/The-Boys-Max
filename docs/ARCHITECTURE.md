# Architecture

Повод runs as a TypeScript modular monolith. `apps/api` is the Fastify HTTP boundary, `apps/worker` processes outbound jobs, and `apps/miniapp` is a React/Vite MAX Mini App. `modules/` contains search, integration, and AI policy; `packages/` contains domain, persistence, platform, demo, and curated catalog code.

PostgreSQL is durable business truth for catalog, actor/session, Save, Plan/RSVP, Friends, Notifications, MAX destinations, and outbound state. Redis/BullMQ schedules work; the outbox and delivery ledger prevent a queue entry from being treated as the source of truth. Existing governor and explicit delivery outcomes remain in use. API and worker are separate roles even when Amvera supervises both in one container.

An Event is a conceptual listing; an Occurrence is an exact dated session. Search and Save use admitted canonical occurrences. Save, Follow, suitability, votes, and commitment are distinct states. Material Plan terms require explicit reconfirmation. A source URL, timestamp, rights/review state, and uncertainty accompany live facts. Unknown price or fees remain unknown.

MAX Bot API and GigaChat calls are server-side. The MAX Bridge and native share adapter are client-side. Session exchange, webhook ingress, idempotency, destination fencing, and outbox delivery preserve the external boundary. The Smart Occasion provider proposes structured filters only; deterministic application logic evaluates hard conditions and the user accepts the proposal.

The schema still contains `plan_messages` and the API still exposes plan message routes, with `PLAN_CHAT` rows filtered from notification lists. This is inherited legacy structure. No production migration is rewritten or reversed in this cleanup. Internal chat is outside the accepted product flow and should not be advertised as a supported feature.

For approved scope and data semantics, see `docs/product/` and `docs/architecture/adr/`. Operational instructions are in [deployment](DEPLOYMENT.md), [catalog](CATALOG.md), and [AI](AI.md).
