# Active task

**P0 integration checkpoint complete; no implementation ticket active.** Verified code baseline: 071af4dcace6b55c5b955a914e7bd966341fa06c. See [P0 integration handoff](../handoffs/P0_INTEGRATION_CHECKPOINT.md).

- T103 queue decision: **KEEP_EXISTING_BULLMQ**.
- T105, durable Save, Catalog/422 and MAX destination fencing coexist in the isolated P0 integration branch. Migrations run through forward-only 0006.
- Moscow Gate v2: DATA_RUNTIME_GATE = FAIL, KudaGo NOT_APPROVED, Moscow NOT_ACTIVATED. No live ingestion is authorized by this checkpoint.
- One writer/integration owner. Historical prompts do not activate work.

Next action requires a separate provider/data readiness decision. Legacy MAX destination rows with unknown source time need an explicit reconciliation policy; current authenticated delivery does not depend on that follow-up.
