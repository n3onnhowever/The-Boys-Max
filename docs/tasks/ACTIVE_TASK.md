# Active task

**Unified POVOD hackathon runtime** is the sole active integration workstream in the managed `unified-runtime` worktree. Owner authorization: 2026-09-26 request to port the accepted UI, connect completed backend/data work, add minimal persistent accepted features, and provide a development-only local owner preview. Starting revision: `c0235a30195ced23b1cf9934dfe1bf09830e45b4`. Integration owner/writer: this task.

- T103 queue decision: **KEEP_EXISTING_BULLMQ**.
- T105, durable Save, Catalog/422 and MAX destination fencing coexist in the isolated P0 integration branch. Migrations run through forward-only 0006.
- Moscow Gate v2: DATA_RUNTIME_GATE = FAIL, KudaGo NOT_APPROVED, Moscow NOT_ACTIVATED. No live ingestion is authorized by this checkpoint.
- One writer/integration owner. Historical prompts do not activate work.

The scoped real catalog policy remains in [REAL_CATALOG_HYBRID_POLICY](../current/REAL_CATALOG_HYBRID_POLICY.md). Provider-wide Gate v2 remains FAIL; KudaGo is NOT_APPROVED. This integration does not activate new sources. Do not commit or push before the owner personally inspects the unified local preview. Current work and validation are recorded in [UNIFIED_POVOD_RUNTIME](../handoffs/UNIFIED_POVOD_RUNTIME.md).
