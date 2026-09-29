# ADR-003 — Queue decision is repository-gated
Status: ACCEPTED

Decision order:
1. No generic queue if one scheduled idempotent sync is sufficient.
2. If BullMQ is already implemented and runtime-green, keep it.
3. Otherwise evaluate pg-boss only after Node/PostgreSQL/migration runtime prerequisites are confirmed.

Rejected for P0:
Kafka, Redpanda, Temporal, Trigger.dev, Inngest, custom general-purpose SKIP LOCKED queue, new Redis solely for queueing.

Invariant:
Business idempotency/partial-sync safety cannot depend on queue semantics.
