# Known gaps / gates

Current scope: [authority](POVOD_SOURCE_AUTHORITY.md). Execution: [active ticket](../tasks/ACTIVE_TASK.md).

- T103: PASS; no queue blocker. Keep existing BullMQ/Redis/outbox/governor. Residual delivery/readiness/recovery risks are recorded in the T103 handoff and do not reopen the P0 queue comparison.
- T104: `DATA_RUNTIME_GATE = FAIL`; `LEGAL_MANUAL_GATE = OPEN`; KudaGo remains conditional and not approved; Moscow is not activated.
- T105: not started. It must decide safe Event/Occurrence, price, place, transport, sync/reconciliation and provenance behavior using [accepted T104 inputs](../handoffs/T105_INPUTS_FROM_T104.md).
- Moscow Data Gate v2: not run. It must use fixed archetypes, preselected future dates and a timestamped/hashed frozen matrix before any provider request; no post-result task/date edits.
- T107: blocked by provider/data readiness. No live ingestion, fallback provider, Timepad or multi-provider implementation is authorized.
- T106: accepted MAX runtime source is integrated in the product trunk. T111 and real MAX Web/Android/iOS acceptance remain separate.
- UI v1 and quality source are integrated. Durable solo Save and basic «Мой Повод» remain unimplemented P0 work; UI screens alone do not close them. Branding work remains governed by T110.
- Integrated runtime defects still open: catalog LIMIT-before-filter, controller 422 pending-state and destination overwrite race. Production hosting is not done.
- T112: unresolved donor provenance and final HTTPS/OpenAPI/DATA-API/judge evidence remain submission gates.
- T113: presentation and user-research claims must follow actual evidence.

No pending map/Follow/Smart/social work blocks frozen P0. Do not manufacture coverage, facts, prices, coordinates, end time, cancellation or provider approval.
