# Targeted migration checksum portability repair — 2026-10-20

## Authority and boundary

Owner-authorized P1 repair on clean `codex/posthackathon-correctness-02b`, starting local and remote SHA `ae05e8f88d937c6c96972b3619dff383de706a4a`. Read the full independent `FINAL_AUDIT.txt`, `migration-eol-result.json` and `SAFE_FUTURE_MERGE.txt` at `D:/Dev/Audits/povod-independent-ae05e8f-20261020/`. Reproduction evidence governs legacy compatibility. The stale ACTIVE_TASK 02A checkpoint is superseded by this explicit request. Its linked current-authority path and a checkout AGENTS.md are absent at this base; the owner's supplied repository instructions apply. One writer/integration owner; original dirty checkout untouched.

## Change and contract

- `.gitattributes`: root `/migrations/*.sql text eol=lf`; imported specification/ADR rules preserved.
- `scripts/migration-fingerprint.ts`: exact accepted-base LF manifest for 0001–0017, exact audit-reproduced CRLF exceptions for 0001–0003 and 0007–0017. 0004–0006 already had LF policy and receive no unverified CRLF exception. All manifest hashes were derived from accepted Git bytes; the fourteen CRLF hashes agree with the independent JSON evidence.
- `scripts/migrate.ts`: fatal UTF-8 validation, uniform EOL validation and canonical LF fingerprint; new rows store LF SHA-256. Existing approved LF or historical CRLF rows are only read, never updated or replayed. Future migrations have canonical hashes and no legacy ledger exception. Transaction, ordering and advisory lock are unchanged.
- BOM, mixed/bare CR, invalid UTF-8, arbitrary stored hashes, real SQL token edits, whitespace and added comments fail with `MIGRATION_HASH_MISMATCH:<id>`. No trimming or generic mismatch fallback.
- `docs/DEPLOYMENT.md`: corrected LF/CRLF 0010 fingerprints and retained destructive-first-application warning and populated-production STOP gate. 0010 is unchanged and is never replayed for an approved existing ledger entry.
- `tests/integration/migration-eol.test.ts`: nine real-runner PostgreSQL scenarios, explicitly materialized LF/legacy CRLF files even on Ubuntu. Old runner is loaded from the accepted Git revision and actually reproduces 0001, isolated 0016 and isolated 0017 failures. It also creates authentic legacy ledger entries. Disposable databases only; owned databases and temp directories are removed.
- Existing CI acceptance runs this test via the unchanged integration glob/harness; the step explicitly identifies cross-EOL acceptance. No old test was removed or skipped.

Historical migration Git blobs are unchanged (all seventeen); working files now match the approved LF bytes. Verified with per-file byte comparisons, `git diff --exit-code <base> -- migrations`, `git ls-files --eol migrations` (`i/lf w/lf` for all), and `git check-attr text eol` for every tracked migration.

## Executed local acceptance

All commands below exited **0** against the implementation files in this commit; local logs are ignored under `.run-evidence/migration-portability/` and `.run-evidence/stability-01/`. Final exact commit and hosted run evidence are recorded in the PR/report, avoiding a self-referential commit hash here.

| Command | Actual result |
| --- | --- |
| `npm ci` | 136 packages installed; lockfile unchanged |
| `npm run typecheck` | PASS, including final test source |
| `npm run typecheck:pure` | PASS |
| `npm run test:unit` | 367 passed, 0 failed/skipped |
| `npm run test:integration:isolated` | 142 passed, 0 failed/skipped (133 existing + 9 new) |
| `npm run build` | PASS |
| `npm run demo:portfolio -- --smoke` | Offline HTTP journey PASS, isolated services cleaned up |
| `npm audit` | 0 vulnerabilities |
| `npm run scan:secrets` | PASS; no findings/prohibited paths/oversized blobs |
| `git diff --check` | PASS |
| `docker build --target release --build-arg SOURCE_SHA=ae05e8f88d937c6c96972b3619dff383de706a4a-worktree -t povod:migration-portability-local .` | PASS, preliminary local worktree build; final exact-SHA build is a separate report gate |

Docker Desktop was initially stopped and was started locally; no infrastructure gate remained blocked. PostgreSQL 18.6 and Redis 8.2.9 pinned harness images were used. The full suites include catalog lifecycle, K1 AI, K5 RSVP/reminders, K6 notification pagination and K7 preference concurrency regressions. No live providers were called.

## Cross-EOL and preservation evidence

PASS: fresh LF; repeat LF; fresh reviewed CRLF writes canonical LF ledger; LF → reviewed CRLF; actual legacy CRLF ledger → LF; approved legacy 0010 without replay; populated 0015 LF/CRLF → canonical 0016/0017; populated LF 0015 → actual base-written CRLF 0016/0017 → LF; independently isolated 0016 and 0017. Baseline runner fails the expected cross-representation cases; repaired runner succeeds.

Every rerun/failing probe compares exact JSON ledger rows (`id`, `sha256`, full PostgreSQL `applied_at` precision) before/after, plus complete sorted business rows. Fixtures include two actors, preference budget/radius/notification values and versions (including nonzero 7), read/unread notifications, three Saves, a Plan and active slot, accepted Friends, 48 catalog occurrences, and an UNKNOWN outbox row. Existing data and ledger remain identical. On the 0015 upgrade only the expected additive preference `version=0` is removed for before/after comparison; old ledger rows remain identical. 0016 default/NOT NULL/nonnegative constraint and 0017 exact cursor index are asserted.

PASS (expected rejection): SQL token change, added space, added comment, unknown SHA, BOM, mixed EOL, bare CR, invalid UTF-8 and unreviewed 0004 CRLF. Failed runs preserve ledger and business data.

## Risks, exclusions and next action

No business/API, UI, adapters, queue/outbox semantics, dependencies, environment configuration or historical SQL changes. No production database access, merge, tag, deploy or history rewrite. Main and historical `hackathon-final-2026-09-30` were verified at `8f1348f0f009008d83830a4de3fd8835f5653a2c` before publication.

This repair addresses the independently reproduced P1 only. No remaining P0 observed in the accepted audit. Deferred P2/P3 remain: image maintenance advisories, dormant K4 ordering, readiness, legacy chat/cache/fan-out/UI/provenance cleanup, K2 durable AI/spend state and future Telegram work. The secret scanner is pattern-based and does not unpack archive payloads; this task does not re-audit deferred findings.

Next: normal fast-forward push to the existing branch, update draft PR #5, require fresh exact-head hosted acceptance, then independent re-audit. Stop there; no merge or stable tag is authorized.
