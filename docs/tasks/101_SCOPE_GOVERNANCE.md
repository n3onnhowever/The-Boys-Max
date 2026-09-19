# T101 — Reconcile scope and governance

Status: PASS. Evidence: docs/handoffs/T101_SCOPE_GOVERNANCE.md.
Owner: the single integration writer.

Inputs: root AGENTS.md; artifacts/preflight/{CURRENT_STATE_RECEIPT,IMPLEMENTATION_GAP_MATRIX,CONFLICTS,QUEUE_DECISION}.md; docs/current/POVOD_SOURCE_AUTHORITY.md and every canonical source linked there; accepted ADRs and synthesis; starting HEAD 4f9a198d4fa2b18686efa19a59b6ac78281d341d plus existing uncommitted preflight imports.

Scope: product Повод / team The Boys; frozen Moscow solo-first P0; repair active scope, paths and task pointers; preserve historical docs/imports. Queue BLOCKED, preserve BullMQ/Redis/outbox/governor pending T103. No UI branding or MAX nickname change.
No third-party tooling, MCP, hooks or second writer. Small local Skills are optional, not required.
Acceptance: no application behavior change; unambiguous P0 and queue policy; imports unchanged; history preserved; git diff --check passes; concise evidence/handoff.
On PASS, activate T102 only.
