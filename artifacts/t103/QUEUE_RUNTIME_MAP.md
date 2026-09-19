# T103 queue runtime map (before implementation/test changes)

Baseline: 5e4973f24fb74489387b3c29313cfcd1e8401ca7; branch codex/t103-bullmq-runtime. Explicit user activation supersedes historical T102 stop pointer, only in this worktree.

Producer: authenticated planService.command transaction locks plan, verifies ACL before replay, persists command receipt/audit/business state plus outbox (unique command_id, actor_id, kind). Webhook ingress persists inbox event_key and BOT_WELCOME (unique inbox_id, actor_id). PostgreSQL is the correctness boundary.

Worker main reconciles immediately then every 1000ms (busy guard). reconcile expires deadlines and recovers expired 30s DB leases: wire fence present => UNKNOWN, otherwise READY/EXPIRED. Due READY/RETRY_WAIT or QUEUED older than 30s become QUEUED with incremented queue_generation, before Redis publication. Queue max-effects; job name deliver; ID <outbox UUID>-<generation>; attempts=1; no BullMQ backoff; retain last 1000 complete/failed jobs. Failed publication leaves durable QUEUED for recovery. No generic DB executor.

Worker concurrency=4, Bull lock=30000ms, maxStalledCount=1. deliver atomically claims eligible state with attempt_count<5, inserts delivery_attempt, checks destination/ACL/revisions/deadline, and commits wire_started_at fence BEFORE governor. Terminal state or another RUNNING owner cannot claim again. Transport then yields SUCCEEDED/RETRY_WAIT/DEAD/UNKNOWN. Fenced completion requires same lease owner and RUNNING state. SUCCEEDED means provider API acceptance, not delivery. A retry after committed completion is a no-op. Crash after possible submission becomes UNKNOWN and is never blindly resent; this deliberately trades availability for duplicate avoidance.

Retries: safe provider 429 has retryAfter>=1000ms; governor failure before invocation uses 1000ms; PostgreSQL not_before enforces delay and reconcile creates a new generation. Fifth retry outcome becomes DEAD/RETRY_BUDGET_EXHAUSTED. Unexpected processor exceptions use Bull attempts=1; reconciliation repairs eligible durable state. External 5xx/network/undecodable response are UNKNOWN. Deadline prevents endless pending effects.

Redis governor: separate fail-fast connection (maxRetriesPerRequest=1, enableOfflineQueue=false) from worker reconnect connection (null retries). Lua atomic per credential digest state; Redis TIME; 50ms global gap, 600ms per destination, bounded waiters (1024 total/64 per destination), 2:1 class preference, cooldown and epoch/clock fences. Permit consumed even when late; >5ms local guard burns permit. start waits at most about 5s. Missing/stale epoch holds, no unlimited fallback. Explicit test arm installs fresh epoch and 10s warm hold; worker must restart to read epoch. API persists actions independently of Redis; health/ready checks PG and outbound hold, not Redis health.

Shutdown: SIGTERM/SIGINT stops reconciliation timer, worker.close waits active work, waits busy reconciliation, closes queue/three Redis clients/pool. Runtime tests must verify this path. TestTransport inserts receipt keyed by attempt_id (NOT unique outbox_id), so duplicate-send assertions can detect multiple attempts; no real MAX calls.

Not yet verified: all runtime scenarios. Existing tests first without edits, isolated Docker project povod-t103; no API host port, no foreign containers/volumes.
