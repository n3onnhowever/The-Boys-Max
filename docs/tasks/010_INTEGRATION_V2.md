# T010 — Integration v2

> Historical task; inactive. Follow [ACTIVE_TASK](ACTIVE_TASK.md). The T101/T102 authorization supersedes this old work order.

Recommended: GPT-5.3-Codex / high

Goal
Make the current repository the single integrated source candidate by merging only valid deltas from results 27, 29 and 30 and re-running result-28 regressions.

Inputs
- current root tree = result 26 source baseline
- input/results/MAX_RESULT_27_FRONTEND_2026-09-16_v1.zip
- input/results/MAX_RESULT_28_ACCEPTANCE_2026-09-16_v1.zip
- input/results/MAX_RESULT_29_AI_EVAL_2026-09-16_v1.zip
- input/results/MAX_RESULT_30_EVENTS_MAP_2026-09-16_v1.zip
- docs/current/*
- docs/TARGET_ARCHITECTURE.md

Do
1. Inspect only manifests/deltas/changed code needed for the merge.
2. Preserve one canonical model for price, geo, eligibility, auth/session and API routes.
3. Merge the valid frontend, AI-adapter and events/maps changes; do not copy whole trees blindly.
4. Regress: finished-event filtering, unknown fees, geo projection, cancellation expiry, UI↔API adapter.
5. Resolve the root dependency graph and create/update the real lockfile without `--force`/unsafe overrides.
6. Run clean install if appropriate, typecheck, unit tests, build, and `git diff --check`.
7. If Docker daemon is running, execute disposable PostgreSQL/Redis/BullMQ integration checks required by the repo. Otherwise mark them NOT_RUN.
8. Update current-state docs only for facts that changed.

Do not
- create a parallel app/repo;
- replace BullMQ/PostgreSQL architecture;
- select an AI provider without live admissible evidence;
- claim MAX/live-provider success without execution.

Acceptance
One root tree builds/tests as far as the environment permits, with no duplicate contract engines and a fresh handoff at `docs/handoffs/T010_INTEGRATION_V2.md`.
