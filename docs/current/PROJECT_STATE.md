# Current project state — 2026-09-22

**Повод**, team **The Boys**: a solo-first personal event guide inside MAX. [Authority and frozen scope](POVOD_SOURCE_AUTHORITY.md) govern implementation.

P0 remains Moscow, MAX identity, live events, structured filters, Occurrence detail, price/UNKNOWN/source, Save and basic «Мой Повод», mobile + web. P1 remains Follow/Smart Povod/map. Stretch remains second city/social.

T101 and T102 are PASS. T103 is PASS and accepted: the canonical queue decision is **KEEP_EXISTING_BULLMQ**; the existing PostgreSQL durable ledger, BullMQ, Redis and governor remain. The P0 queue comparison is closed. [T103 handoff](../handoffs/T103_BULLMQ_RUNTIME.md).

T104 is accepted as a failed provider runtime gate, not as provider approval: `DATA_RUNTIME_GATE = FAIL`, `LEGAL_MANUAL_GATE = OPEN`, KudaGo `CONDITIONAL_PRIMARY / NOT APPROVED`, Moscow **NOT ACTIVATED**. Frozen Gate v1 remains historical evidence. [T104 handoff](../handoffs/T104_KUDAGO_RUNTIME_GATE.md).

The next data path is T105 data-safety/normalizer work, followed by a fresh future-dated Moscow Data Gate v2 under [current methodology](PROVIDER_DATA_GATE_GOVERNANCE.md). Only a later passing runtime gate plus legal/manual clearance can support provider/live-ingestion and Moscow activation decisions. T107 is blocked until that readiness exists.

The [product trunk](PRODUCT_TRUNK_STATE.md) integrates the accepted cleanroom, MAX runtime, UI v1 and UI quality source. No T105/T107 implementation ticket is active. Follow [ACTIVE_TASK](../tasks/ACTIVE_TASK.md).

Historical baseline and prior state text remain preserved in repository evidence. Runtime claims require evidence tied to identified source revisions; code presence or old module tests are not acceptance.
