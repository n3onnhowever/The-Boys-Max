# Known gaps / gates

Current scope: [authority](POVOD_SOURCE_AUTHORITY.md). Execution: [active ticket](../tasks/ACTIVE_TASK.md). The preflight gap matrix is historical evidence, not permission to activate all proposed tickets.

- T102: PASS after T102.2 (115/115 unit; strict typecheck/build; clean Docker build 25.132 s; startup, host/internal health and restart). Local API loopback mapping fixed; PostgreSQL/Redis stay internal and unpublished. Declaration patch remains guarded technical debt. See [handoff](../handoffs/T102_2_NETWORK_MIGRATION_ACCEPTANCE.md).
- T103: PG/Redis/BullMQ/outbox/governor runtime verification; queue decision remains BLOCKED. Preserve all existing code.
- T104: KudaGo runtime + manual provider-use/rights gate; no approval or live importer currently established.
- T105: integration-owned safety mapping to Event/Occurrence and stable identifiers, conditional/unknown data.
- T106/T111: attached MAX Mini App, valid/repeat login and mobile/web/API2 runtime evidence.
- T107–T110: live ingestion, discovery, Save/basic profile persistence and frozen UI remain separate work. Existing UI says Афиша; branding changes are deferred to T110.
- T112: EventHive adapted paths/hashes referenced by licenses/module-22-NOTICES.md are absent (`analysis/REUSE_AND_LICENSES.csv`). Keep notices and unresolved provenance; do not invent missing evidence. Final HTTPS/OpenAPI/DATA-API, judge scenario remain submission gates. T102.2 clean Docker build meets <=5 minutes; local host access PASS. Public deployment remains a separate gate.
- T113: presentation and user-research claims must follow actual evidence. Historical module/donor checks are not current app acceptance.

No pending map/Follow/Smart/social work blocks frozen P0. No blanket merge of older result ZIPs. Prior gap text is preserved in artifacts/t101/BASELINE_DOCUMENTS.json.
