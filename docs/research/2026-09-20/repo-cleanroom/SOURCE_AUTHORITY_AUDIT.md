# Source authority audit

Base: `1e4a7a2b454bed87bdcb40559773143c2fc38c9b`. Final safe cleanup code: `991b3cdf9e8081cf9648faa4746243e4e5dfcb3b`. Date: 2026-09-20. Branch: `codex/repo-cleanroom`. No feature merges, source deletions, archive moves, or branch/worktree deletions.

Retain the existing hierarchy: official case → final scope freeze → Product Spec + Data Safety Patch → Product Contract → accepted ADR → revision-bound runtime evidence → research. docs/current/POVOD_SOURCE_AUTHORITY.md governs precedence; docs/tasks/ACTIVE_TASK.md is the execution pointer. This user-authorized audit does not activate a feature ticket.

| Issue | Evidence | Smallest proposal |
|---|---|---|
| Obsolete current checkpoint | README.md:5,17,114,123 | Replace current-facing T102.2/T103 BLOCKED summaries with accepted-checkpoint links |
| Obsolete queue gate | docs/TARGET_ARCHITECTURE.md:3 | Link KEEP_EXISTING_BULLMQ and accepted T103 receipt |
| Official original absent from Git checkout | docs/current/POVOD_SOURCE_AUTHORITY.md:6 | Make submission inclusion/acquisition explicit |
| Branch-local work outside baseline | UI/MAX branch map | Keep revision-scoped acceptance; no integrated-release claim |
| Repeated status summaries can drift | PROJECT_STATE, DECISIONS, KNOWN_GAPS, README | Cross-link the authority and concise supporting views |

The five baseline docs/current documents agree on T103 PASS, KEEP_EXISTING_BULLMQ, T104 FAIL/legal gate OPEN and no active implementation ticket. Contradictory current-facing statements are in older entry points. Imported Product Spec/Contract differences are already resolved by explicit overrides; preserve imported bytes.

The local official PDF is 1,889,618 bytes, SHA-256 `638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a`, matching authority. It is ignored and missing from clean checkout. The tracked extraction at artifacts/preflight/OFFICIAL_CASE_TEXT.md remains. Selected links in README, all five current documents and research INDEX were checked; this was the only missing selected target. This is not a recursive full-doc link audit.

| Directory | Canonical role |
|---|---|
| docs/current/ | Accepted revision-scoped state and precedence |
| docs/handoffs/ | Checkpoint results, source hashes, actual checks and limits |
| docs/research/date/topic/ | Research with provenance; immutable originals remain indexed |
| input/ | Supplied originals/design references with explicit availability |
| artifacts/task/ | Reproducible evidence and individually classified generated outputs |
| apps/ | API, worker and miniapp source |
| packages/ | Shared domain/infrastructure source and ports |
| scripts/ | Maintained development, migration and verification tools |

Product specs and ADRs retain their current paths. No mass move or new authority tree is needed. Historical task files 010/030/040/050/060 are explicitly inactive; the research INDEX demotes imported kickoff prompts and links the relocation manifest. Keep them.

Expanded consolidated sources/verification copies are archive candidates only after reference and master-archive validation. Equal screenshots may still be required checkpoint evidence.

Future integration note: codex/max-token-tls requires certs/russian-trusted-root-ca.crt; root certs is absent from this baseline allowlist. Reconcile that specific reviewed input during separately authorized integration.

All editorial corrections remain proposals. Evidence: [selected source lines and hashes](../../../../artifacts/repo-cleanroom/authority-evidence.json), [anchors](../../../../artifacts/repo-cleanroom/source-anchors.json), [branch map](WORKTREE_BRANCH_MAP.md).
