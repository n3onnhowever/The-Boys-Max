# CODEX MASTER PROMPT — RESEARCH IMPORT + REPOSITORY PREFLIGHT
Use this prompt FIRST. Do not begin feature implementation in this pass.

You are continuing the existing hackathon project «Повод» by team The Boys.

A synthesis handoff package is provided. It contains:
- canonical product/scope files;
- central synthesis;
- accepted ADRs;
- 10 immutable research archives;
- implementation plan.

## Hard rule
FIRST PASS IS READ-ONLY FOR APPLICATION CODE.

You may create documentation/evidence files required by this prompt, but do not refactor, migrate queues, change database schema, change MAX auth, or implement product features in this pass.

## Source-of-truth order
1. exact official hackathon case available in project inputs/repository;
2. `POVOD_FINAL_SCOPE_FREEZE_MVP.md`;
3. Product Spec + Data Safety Patch;
4. Product Contract;
5. accepted synthesis ADRs;
6. runtime evidence from current repo/build;
7. research archives.

If research conflicts with canonical scope, write:
`CONFLICT WITH CURRENT SOURCE OF TRUTH`
Do not silently change scope.

## Task A — Current repository receipt
Record:
- absolute repo path;
- current branch;
- HEAD SHA;
- `git status --short`;
- remotes;
- Node version;
- package manager/version;
- dependency lockfiles;
- PostgreSQL version/config/extensions where inspectable;
- Redis/Valkey/BullMQ/pg-boss dependencies and compose/runtime use;
- Dockerfiles/compose files;
- current worker/scheduler paths;
- current provider paths;
- current MAX auth/Bridge/Bot/API paths;
- current test/lint/typecheck/build commands;
- current CI;
- current deployment/env documentation;
- existing AGENTS.md / Skills / hooks / MCP config.

Write:
- `artifacts/preflight/CURRENT_STATE_RECEIPT.md`
- `artifacts/preflight/CURRENT_STATE_RECEIPT.json`

Do not expose secrets.

## Task B — Re-open authority
Locate/read/hash:
- exact official case PDF;
- scope freeze;
- Product Spec;
- Data Safety Patch;
- Product Contract.

Write hashes and paths to the current-state receipt.

If the repository contains stale “Есть планы”, 2–3-city MVP, group-first or conflicting current docs, list them; do not delete them yet.

## Task C — Import research safely
Place the 10 supplied research archives/extracted content under:
`docs/research/2026-09-18/raw/<topic>/`

Preserve original archive SHA-256.

Do not promote each report to source of truth.

Copy the supplied synthesis/ADR documents into the project’s appropriate docs structure, adapting only filenames/paths to existing conventions.

Create:
`docs/research/2026-09-18/INDEX.md`

For each topic include:
- archive SHA;
- status;
- one-line verdict;
- open blockers;
- canonical impact.

## Task D — Reconcile synthesis with current HEAD
Compare actual code/repo state against:
- `DECISION_REGISTER.md`
- `IMPLEMENTATION_PLAN.md`
- ADRs.

Produce:
`artifacts/preflight/IMPLEMENTATION_GAP_MATRIX.md`

Columns:
- requirement/decision;
- actual file/component;
- current state;
- evidence;
- gap;
- severity;
- proposed task;
- no-change-needed.

Do not implement the proposed tasks yet.

## Task E — Queue decision gate
Based on actual repo only, classify:
- `NO_QUEUE_NEEDED`
- `KEEP_EXISTING_BULLMQ`
- `EVALUATE_PG_BOSS`
- `BLOCKED`

Do not migrate in this pass.

Record actual evidence:
dependencies, services, worker path, runtime/test status.

## Task F — Codex workflow audit
Inspect current AGENTS/Skills.

Recommend a minimal staged setup but do not install third-party skill collections automatically.

Initial preferred custom skills, only if absent and useful:
- scope-guard
- test-and-verify
- runtime-evidence

Later candidates:
- provider-adapter
- max-integration
- data-safety

External skills require licence/security/manual review.

## Task G — Final report
Return:
1. current HEAD;
2. current architecture found;
3. conflicts with synthesis;
4. blocking gaps;
5. queue classification;
6. exact ordered implementation tickets;
7. files created;
8. files intentionally not changed;
9. commands run;
10. evidence paths.

## Stop condition
STOP after preflight/import/gap analysis.

Do not begin Phase 2 implementation until the human reviews this result.
