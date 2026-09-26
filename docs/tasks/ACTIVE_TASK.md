# Active task

**Real Catalog Sprint is the sole active implementation ticket in `codex/data-real-catalog`.** Owner-authorized base: `1e6b3e20600d4a1f249003990f95b6213eb561fa`. See [Real Catalog Sprint handoff](../handoffs/REAL_CATALOG_SPRINT.md) and [hybrid policy](../current/REAL_CATALOG_HYBRID_POLICY.md). The prior P0 integration checkpoint remains documented at [P0 integration handoff](../handoffs/P0_INTEGRATION_CHECKPOINT.md).

- T103 queue decision: **KEEP_EXISTING_BULLMQ**.
- T105, durable Save, Catalog/422 and MAX destination fencing coexist in the isolated P0 integration branch. Migrations run through forward-only 0006.
- Moscow Gate v2: DATA_RUNTIME_GATE = FAIL, KudaGo NOT_APPROVED, Moscow NOT_ACTIVATED. No live ingestion is authorized by this checkpoint.
- One writer/integration owner. Historical prompts do not activate work.

The real catalog sprint may stage KudaGo and import reviewed first-party factual records only under its exact scoped policy. Provider-wide Gate v2 remains FAIL; KudaGo is NOT_APPROVED. PostgreSQL 18.6 integration is required before committing this ticket. Legacy MAX destination rows with unknown source time remain a separate follow-up.
