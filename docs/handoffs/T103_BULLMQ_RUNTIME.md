# T103 — BullMQ runtime verification

**PASS; QUEUE_DECISION = KEEP_EXISTING_BULLMQ. Stop after this ticket for human review.**

Inputs/revision: user-authorized isolated worktree D:/Dev/Repos/The-Boys-Max-t103, branch codex/t103-bullmq-runtime, clean starting SHA 5e4973f24fb74489387b3c29313cfcd1e8401ca7. Read AGENTS, ACTIVE_TASK, BASELINE_PARALLEL, T102.2 acceptance, preflight queue/gap matrix, current authority, ADR-003 and FINAL SCOPE FREEZE. Historical T102 stop text is superseded only by this explicit T103 activation. No main/parallel worktree changes, global Git changes, push or merge.

Existing architecture remains PostgreSQL outbox/delivery ledger + BullMQ max-effects (concurrency4) + Redis governor. No queue migration or new infrastructure. Runtime confirms PG guards survive duplicate queue jobs and the critical final-DB-commit-before-ACK crash. Ambiguous external submission stays UNKNOWN with no blind resend.

Initial integration11/14 failed at raw Drizzle invite timestamps. Added failing IT-13 before minimal correction; raw expires_at string now becomes Date before getTime/toISOString. Added IT-14 concurrent/sequential semantic SELECT replay. Final integration16/16. A separate 17-scenario runtime harness exercises real isolated dependencies and exact crash barriers; all17 PASS. The first harness governor failure was its own abandoned waiter, corrected with request-ID reuse and measured interval assertions. No assertions or production limits weakened.

Actual checks:
- verify-dependencies: exit 0, 7.137s; artifacts/t103/logs/verify-dependencies.txt
- patch-guards: exit 0, 0.602s; artifacts/t103/logs/patch-guards.txt
- syntax-final: exit 0, 1.376s; artifacts/t103/logs/syntax-final.txt
- unit: exit 0, 4.850s; artifacts/t103/logs/unit.txt
- typecheck: exit 0, 4.814s; artifacts/t103/logs/typecheck.txt
- build: exit 0, 6.004s; artifacts/t103/logs/build.txt
- docker-final-build: exit 0, 14.682s; artifacts/t103/logs/docker-final-build.txt
- runtime-final: exit 0, 448.462s; artifacts/t103/logs/runtime-final.txt
- integration-final: exit 0, 46.328s; artifacts/t103/logs/integration-final.txt
- staged-diff-final: exit 0, 0.533s; artifacts/t103/logs/staged-diff-final.txt
- secret-prohibited-final: exit 0, 0.727s; artifacts/t103/logs/secret-prohibited-final.txt

Final whitespace/secret/prohibited checks are recorded in artifacts/t103/COMMAND_RESULTS.json and SECRET_SCAN.json. Complete files: artifacts/t103/FILES_CHANGED.md. Exact source hashes, all failed/passing logs, Docker commands and outcomes are in artifacts/t103/. Literal resulting commit and clean state are recorded post-commit in ignored .run-evidence/t103-final-commit.json; resolve the tracked evidence commit using git log -1 --format=%H -- artifacts/t103/FINAL_VERIFICATION.json.

Contract deltas: none. Invite expiry serialization now honors its existing ISO contract. Queue, delivery ledger, governor, retry/concurrency, migrations, dependencies, MAX auth, provider and UI code unchanged.

NOT_RUN: real MAX submission/delivery, provider rights/ingestion, actual MAX mobile/web, release deployment, disk loss/corruption, broad partition/load/soak testing. Risks: UNKNOWN may conservatively drop an unsent message; governor key loss needs explicit new epoch/10s warm hold/worker restart; safe retries terminate at5; stalled-job recovery observed62–93s; startup while PG is absent exits1 and needs restart/supervision; health/ready does not detect Redis-only outage. Running worker PG recovery and graceful active shutdown are proven.

T107: no queue blocker from T103; other tickets/gates are not certified here. Next action: human review and integration owner decision; STOP.
