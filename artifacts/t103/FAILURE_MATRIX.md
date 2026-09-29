# T103 failure matrix

Baseline `5e4973f24fb74489387b3c29313cfcd1e8401ca7`; branch `codex/t103-bullmq-runtime`. Final run: 17/17 PASS with PostgreSQL18.6, Redis8.2.9, BullMQ6.3.4, ioredis5.11.1. All transport effects are SYNTHETIC.

| Scenario | Result | Seconds | Actual proof | Receipt |
|---|---|---:|---|---|
| normal-job | PASS | 0.546 | Production worker reconciles one durable effect, one receipt. | [JSON](logs/normal-job.txt) |
| duplicate | PASS | 0.220 | Sequential webhook replay and distinct Bull jobs: one attempt/receipt. | [JSON](logs/duplicate.txt) |
| concurrent-duplicate | PASS | 0.128 | 8 simultaneous webhook duplicates and 8 Bull jobs: one attempt/receipt; IT-14 additionally covers SELECT command replay. | [JSON](logs/concurrent-duplicate.txt) |
| worker-before | PASS | 92.220 | SIGKILL at active Bull job before deliver; stalled retry/reconciliation -> one successful effect. | [JSON](logs/worker-before.txt) |
| worker-during | PASS | 92.378 | SIGKILL after transport receipt but before final DB commit -> UNKNOWN, one receipt, no resend. | [JSON](logs/worker-during.txt) |
| worker-after-db-before-ack | PASS | 92.191 | SIGKILL after SUCCEEDED commit while Bull job still active -> stalled job completes with no second attempt/receipt. | [JSON](logs/worker-after-db-before-ack.txt) |
| worker-restart | PASS | 2.661 | Durable QUEUED effect consumed after worker start; second restart does not resend. | [JSON](logs/worker-restart.txt) |
| poison-job | PASS | 5.451 | Safe retry transport yields 5 attempts, real >=1000ms gaps, DEAD/RETRY_BUDGET_EXHAUSTED; no sixth attempt. | [JSON](logs/poison-job.txt) |
| malformed-job | PASS | 2.023 | Production processor rejects invalid outboxId; Bull attemptsMade=1, retained failed job, no infinite retry. | [JSON](logs/malformed-job.txt) |
| redis-loss | PASS | 33.522 | Real Redis stop; API commits intent, governor fails closed; existing worker reconnects and PG reconciles one delivery. | [JSON](logs/redis-loss.txt) |
| redis-restart | PASS | 41.242 | Scoped queue/key deletion + real Redis SIGKILL/start; PG survives, no silent send, explicit existing re-arm script installs fresh epoch/10s hold, restarted worker recovers. | [JSON](logs/redis-restart.txt) |
| pg-failure | PASS | 5.890 | PG stop: webhook503, worker startup exits1. PG/start + worker restart recovers pending intent. | [JSON](logs/pg-failure.txt) |
| pg-active-failure | PASS | 30.823 | PG outage combined with kill during possible submission -> UNKNOWN, one receipt. | [JSON](logs/pg-active-failure.txt) |
| pg-live-failure | PASS | 7.573 | Running production worker stays alive across PG outage and resumes delivery after PG recovery. | [JSON](logs/pg-live-failure.txt) |
| pg-final-commit-failure | PASS | 31.488 | Transport receipt persisted; actual PG stop prevents final commit; failed Bull job recovers durable RUNNING to UNKNOWN without resend. | [JSON](logs/pg-final-commit-failure.txt) |
| graceful-shutdown | PASS | 1.351 | SIGTERM during actual blocked receipt INSERT: worker waits, completes after lock release, exits0. | [JSON](logs/graceful-shutdown.txt) |
| governor | PASS | 6.803 | Actual Redis8.2.9 Lua: measured destination/global gaps, restart persistence, missing epoch HOLD, no unlimited fallback. | [JSON](logs/governor.txt) |

Historical failures: initial integration 11/14 due to Drizzle raw invite timestamp mapping (IT-13 before FAIL, after PASS); initial runtime14/15 due to an abandoned waiter in the new governor test (corrected test, production Lua unchanged). Full initial/final logs and source hashes are retained. Final integration16/16 includes 8-way duplicate SELECT receipt/outbox/delivery proof.

Limits: Redis data loss is scoped queue/key removal plus real container crash, not destruction of a disk/volume. Live MAX sends, actual delivered-to-user status, disk corruption, sustained load and arbitrary partitions are unproven. UNKNOWN is a correct conservative terminal result, not successful delivery. Queue contents alone are never the business correctness boundary. PG-only health readiness remains200 during Redis outage.
