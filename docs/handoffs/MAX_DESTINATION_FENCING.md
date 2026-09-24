# MAX destination fencing

## Scope and inputs

- Base: `fd03d3a15157fcaa59e5574619725f366fd6185d`; branch `codex/max-destination-fencing`; isolated worktree `D:/Dev/Repos/The-Boys-Max-destination-fencing`. Starting worktree was clean.
- Read only product trunk state, MAX runtime integrated handoff, the exact RT-09 / delayed-destination finding, and the current ingress, parser, schema, and focused tests. `docs/tasks/ACTIVE_TASK.md` in the shared checkout says no implementation ticket active; this explicit user ticket authorizes this isolated change. Shared checkout changes were preserved.
- MAX [Update object](https://dev.max.ru/docs-api/objects/Update) calls `timestamp` the event occurrence time in Unix milliseconds. The existing parser already required a positive lossless int64 update timestamp. Neither the API documentation nor this change assumes unique timestamps or ordered webhook delivery.

## Reproduction and cause

`tests/integration/max-bot.test.ts` first gained a real PostgreSQL/Fastify scenario that commits a newer `bot_started`, then sends an unseen older one with a different chat. Before the fix, the test failed: the older chat replaced the newer destination (focused run 7/8 passing, exit 1). See `artifacts/max-destination-fencing/repro-before.txt`.

The inbox key included event identity but the destination UPSERT unconditionally replaced `chat_id` and set `verified_at=clock_timestamp()` for every newly accepted webhook. Commit time described local arrival, not MAX event order. The stale event also created a welcome intent.

## Rule and change

- Persist the lossless top-level MAX update timestamp in `inbox.source_timestamp_ms` and `destinations.source_timestamp_ms` via migration `0004`. It is an event-time ordering value, not a receipt timestamp.
- In one PostgreSQL transaction, a candidate replaces a source-stamped destination only if its source timestamp is strictly greater. For a legacy NULL row, a different chat replaces it only if the MAX event time is after the existing row's local `verified_at` receipt time. Earlier evidence cannot be ordered against that legacy row and is quarantined for reconciliation. The unique actor row plus `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE` serializes competing writers and rechecks the predicate after conflict locking. No application-memory precheck or serializable transaction retry is needed under the current read-committed transaction helper.
- Equal source times for different chats have no evidenced order: first committed state remains canonical, the conflicting payload is quarantined, and no welcome is queued for that chat. An older conflicting chat is acknowledged/processed without changing the destination or queuing a misleading welcome. An event for the current chat still gets its existing Bot reply. Exact webhook duplicates still return through the existing inbox dedupe path.
- `inbox`, destination CAS, collision quarantine, outbox, and `processed` update commit together before HTTP 200. Redis/BullMQ, governor, delivery UNKNOWN behavior, commands, authentication, and routes are unchanged.

Existing destination rows have no recoverable source event timestamp. Migration leaves their source timestamp NULL. `verified_at` provides a conservative legacy receipt boundary: only an event timestamp later than that receipt can replace a different chat; an earlier event is ambiguous and held. The first post-boundary event establishes the event-time fence. The change does not label `verified_at` or `source_digest` as MAX event time. Clock skew or delayed legitimate events may leave a legacy row held for explicit re-verification/reconciliation.

## Files and source hashes

| File | SHA-256 at final verification |
|---|---|
| `packages/platform/bot.ts` | `ca230eb49bb4dceef9b085e69d854be2227279b8a09406794428c830c146ddac` |
| `packages/platform/ingress.ts` | `12faf1eaa466946f1c1488c4588a9776d4040e5d54be629667221b74db913ce6` |
| `migrations/0004_destination_fencing.sql` | `75769aec2b34f4e937aa9cdab3b177a3177c0ebbdb530a9fec8de66fa899d8fc` |
| `tests/integration/max-bot.test.ts` | `2f042e8c934834f390f187cd656bdbc988d5e1662c2559c8a1adacce47f215ef` |
| `tests/unit/max-bot.test.ts` | `49904a52c1e97b428d9c9ac46f7384f9fe73f669fd797c5766e53b4cb591f9b1` |

## Executed checks

All Docker commands used isolated Compose project `max-destination-fencing`, real PostgreSQL 18.6, Redis 8.2.9, and synthetic MAX transport. No live MAX I/O occurred.

| Command | Exit / result | Log |
|---|---|---|
| `docker compose -p max-destination-fencing -f compose.yaml run --build --rm checks node --experimental-strip-types --test tests/integration/max-bot.test.ts` before fix | 1; expected stale overwrite reproduced, 7/8 pass | `repro-before.txt` |
| `docker compose -p max-destination-fencing -f compose.yaml run --build --rm migrate npm run migrate` | 0; migration 0004 applied | `migrate-after.txt` |
| Same focused `checks` command after fix | 0; 12/12 pass | `focused-pg.txt` |
| `docker compose -p max-destination-fencing -f compose.yaml run --build --rm checks sh -c 'npm run test:integration && npm run test:unit && npm run typecheck && npm run build'` on final source | 0; PostgreSQL integration 41/41, unit 244/244, typecheck 0, build 0 | `final-verification.txt` |

The focused cases cover new→old, old→new, duplicates, eight concurrent competing updates, equal-time conflict, legacy ambiguity, and existing Bot delivery/dedupe/UNKNOWN behavior. Transaction retry is not part of this read-committed UPSERT path. The final existing suite also exercises durable ACK and PostgreSQL/Redis failure paths.

`git diff --cached --check` passed after preserving log content with only trailing whitespace normalized. A scoped private-key/credential-pattern and prohibited-path scan of all changed source, handoff, and log files found 0 content hits and 0 prohibited paths (`artifacts/max-destination-fencing/final-scan.txt`).

## Contract, limits, next action

Schema delta: nullable positive `source_timestamp_ms bigint` on `inbox` and `destinations`; no external route or Bot command delta. Real MAX Web/mobile delivery was NOT_RUN. Distinct events can share a millisecond; an equal-time conflict is quarantined because MAX provides no finer ordering evidence. Operator reconciliation of historical NULL rows is the next deployment decision. Stop at this ticket boundary.
