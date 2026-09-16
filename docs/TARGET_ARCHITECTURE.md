# Target architecture

```text
MAX bot ───────────────┐
                      │
MAX mini-app (React) ─┼─> API (TypeScript) ─> PostgreSQL
                      │          │
                      │          ├─> durable inbox/outbox
                      │          └─> Redis/BullMQ ─> worker
                      │                              ├─> MAX Bot API
                      │                              ├─> EventProvider(s)
                      │                              └─> optional AiProvider
                      │
                      └─> MAX Bridge (client platform context)
```

Principles:
- PostgreSQL owns durable business truth.
- BullMQ executes async work; it is not the system of record.
- Webhook ingestion is durable/idempotent before acknowledging work that must survive process failure.
- Unknown external delivery outcome is distinct from success/failure.
- Provider-specific payloads stop at adapters; core search/price/plan contracts stay canonical.
- Search discovery is accessible without a group.
