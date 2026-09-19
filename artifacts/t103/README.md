# T103 evidence and reproduction

Worktree: D:/Dev/Repos/The-Boys-Max-t103. Branch: codex/t103-bullmq-runtime. Starting gate observed clean at 5e4973f24fb74489387b3c29313cfcd1e8401ca7. User explicitly activated this ticket in an isolated parallel worktree; historical T102 stop instructions are not a blocker for this authorized ticket.

## Reproduction

Run only from this worktree, with no other process using Docker project povod-t103. No live credentials or MAX transport are used.

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
npm ci --ignore-scripts
npm run verify:dependencies
npm run typecheck
docker compose -p povod-t103 --profile checks up --build -d postgres redis prepare checks
docker wait povod-t103-checks-1
docker compose -p povod-t103 logs --no-color checks
node artifacts/t103/run-runtime.mjs
```

For a targeted rerun, pass a comma-separated scenario list, for example `node artifacts/t103/run-runtime.mjs governor,pg-live-failure,pg-final-commit-failure`. A targeted run is not a full-matrix PASS. The host coordinator accepts only redis/postgres stop/start/kill under the fixed povod-t103 project, checks container project labels, and never deletes volumes. Existing prepare creates synthetic identities/secrets internally; runtime configuration is never printed. Tests run in checks with source packages/tests mounted read-only. Main worker is forked from the unchanged apps/worker/main.ts where applicable. Exact before/during/after crash barriers live only in a test helper using the real deliver function and production concurrency/lock/stall settings. No shortened leases or modified retry policy.

The first integration run was executed before any test edits: 14 tests, 11 passed, 3 failed; no skips. It found the raw Drizzle invite timestamp mapping defect. The targeted invite regression failed before the minimal code fix and passed after it. The first failure matrix had 14 PASS/1 FAIL; its governor test accidentally left an abandoned waiter and expected a later request to bypass it. The test was corrected to reuse its request ID and assert measured destination/global intervals. Production governor code was unchanged. Historical failed logs remain intact.

Runtime does not erase shared state: project-specific test database/queue only. To isolate scenario fixtures between complete runs, the harness cancels pending synthetic outbox rows created by previous runs of this project's suite, and clears only max-effects in this project's Redis. It never deletes PG business/audit rows. Queue loss is explicit scoped queue obliteration plus governor-key loss; Redis container SIGKILL/restart is independently real. This simulates Redis data loss without deleting a volume. Restart uses the existing explicit test arm script, a fresh epoch, the real 10-second warm hold and worker restart.

## Evidence interpretation

COMMAND_RESULTS.json binds exact commands, exits, UTC starts, durations, branch, HEAD, source hash manifests and log hashes. The initial integration container reports its actual suite duration in integration.txt; the host docker-wait command duration is only the remaining wait. Per-scenario *.txt files are extracted JSON receipts from the full runtime log. DOCKER_FAULT_ACTIONS.json records actual container commands/exits/durations; first-run actions are retained separately. runtime-final-source.json includes new test helpers. The first runtime source manifest contained tracked sources; unit-source.json captured the then-unchanged new helpers during that run and supplies their initial hashes.

The tracked verification file cannot contain the SHA of its own containing commit. Resolve that commit with `git log -1 --format=%H -- artifacts/t103/FINAL_VERIFICATION.json`. After commit, the local ignored `.run-evidence/t103-final-commit.json` stores the literal resulting SHA and final clean status; the final report also provides it. No push or merge.

Limits: TestTransport proves database/queue submission control, not real MAX delivery; no provider, UI, auth integration changes or T107 implementation. PostgreSQL durability itself depends on its volume/backup policy. AOF everysec is not zero-loss Redis durability. UNKNOWN is deliberately terminal without blind resend; governor-state loss requires an explicit operator recovery. Startup while PG is absent exits nonzero; the running worker catches reconciliation failures and is tested separately for recovery. Health/ready is PG-only and can remain 200 during Redis outage.

New T103 command logs initially contained Docker progress trailing spaces and npm blank EOF lines. Staged whitespace check caught them (staged-diff-before). Text copies were normalized only for LF/trailing horizontal whitespace/blank EOF lines; `RAW_LOGS.json.gz` preserves each original byte stream as base64 keyed by log path. COMMAND_RESULTS records both raw and normalized SHA256; LOG_NORMALIZATION.json hashes the archive. No exit, assertion or substantive output was altered. Imported/baseline evidence was not changed.
