# Current project state — 2026-09-19

**Повод**, team **The Boys**: a personal event guide inside MAX. [Authority and frozen scope](POVOD_SOURCE_AUTHORITY.md) govern implementation. Solo value does not require a group.

P0: Moscow, MAX identity, live events, structured filters, Occurrence detail, price/UNKNOWN/source, Save and basic «Мой Повод», mobile + web. P1: Follow/Smart Povod/map. Stretch: second city/social.

Code baseline: main, `4f9a198d4fa2b18686efa19a59b6ac78281d341d`, extracted result-26 implementation. The completed T070 imports/evidence were uncommitted when T101 started; this pass preserves them. [Preflight receipt](../../artifacts/preflight/CURRENT_STATE_RECEIPT.md) records 105/105 unit tests, missing root lock/tsc and unavailable Docker at that time, not current build acceptance.

Execution: follow [ACTIVE_TASK](../tasks/ACTIVE_TASK.md). Only T101 then T102 are authorized now; stop for human review afterward. T103 owns existing queue runtime verification; classification remains BLOCKED. No blanket merge of result archives or new broad research.

History: «Есть планы», «Договорились», «Туда» and other names were candidates; TBD was the old status. Result 27/29/30 module test counts are historical local evidence, not tests of this tree. Previous project-state text and work order are preserved in artifacts/t101/BASELINE_DOCUMENTS.json.

T101 PASS. T102 PASS after T102.2: reproducible install, metadata, syntax, unit 115/115, strict typecheck/build; clean Docker build 25.132 s, startup, internal and host health, stop/restart pass. PostgreSQL/Redis remain internal and unpublished. Migration 0002 classified SAFE_PRE_RELEASE_EDIT on available repository evidence. See [current handoff](../handoffs/T102_2_NETWORK_MIGRATION_ACCEPTANCE.md). T103 prerequisites from T102 cleared; queue decision remains BLOCKED pending T103. No next ticket active.
