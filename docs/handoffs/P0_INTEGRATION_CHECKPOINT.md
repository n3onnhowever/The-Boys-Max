# P0 integration checkpoint

- Accepted inputs: T105 + PostgreSQL 18.6 78d68e4fc40f708e45fe0f6baf1b833040d4744f; Save cb084fca7c24b80eefc03081a864771ce6033827; Catalog/422 e2d6acc2f56d3381d4a68cb3d1170d8e50154a15; MAX fencing c801aa9565fb8878f60e0169e13a7dfe8c91c03c.
- Isolated worktree: D:/Dev/Repos/The-Boys-Max-p0-integrated, branch codex/p0-integration-checkpoint, clean starting SHA cb084fca7c24b80eefc03081a864771ce6033827. Verified code result SHA: 071af4dcace6b55c5b955a914e7bd966341fa06c. The four accepted SHAs were verified as commits before edits. The shared checkout was untouched.
- Catalog/422 commits were cherry-picked after diff review. MAX fencing was applied from its accepted commit without retaining its conflicting 0004 filename. Source file overlap was absent; the migration-number conflict was resolved explicitly.

## Migrations and contracts

- Forward chain: 0001_foundation → 0002_integration → 0003_ui_journal → 0004_t105_catalog → 0005_saved_occurrences → 0006_max_destination_fencing.
- 0006 has the accepted fencing DDL unchanged in substance: nullable positive source_timestamp_ms bigint on inbox and destinations. Its SHA-256 is 75769aec2b34f4e937aa9cdab3b177a3177c0ebbdb530a9fec8de66fa899d8fc. Historical migrations were not edited.
- Windows checkout converted accepted 0005 LF bytes to CRLF, which would reject an accepted migration ledger. .gitattributes now pins LF for 0005 and 0006; accepted 0004/0005 hashes remain d14cef7b400fc9eb78fac5f81a2cef8e78519afd448160ec8c0d8e6865cb829e / d8ee7951ff03e719e06516fe43e992d9141b962897ba1b601b565acd700cc337.
- On PostgreSQL **18.6**, fresh 0001–0006, T105 0004 → 0005/0006, and Save 0005 → 0006 all passed. Each path recorded exactly one row per migration ID and an immediate rerun applied zero. scripts/p0-integration-migrations.mjs checks exact accepted hashes, schema columns, ledger hashes and counts; receipt: artifacts/p0-integration/migrations-accept.log.
- No external route or product capability was added. Save remains actor-owned and occurrence-scoped; MAX ingress still commits inbox, destination decision, quarantine, outbox and processed marker before HTTP 200.

## Integrated invariants and checks

| Check on integrated source | Exit / result | Evidence |
|---|---:|---|
| Focused T105, Save, 422 and MAX unit files | 0; 51/51 | artifacts/p0-integration/focused-unit.log |
| Focused T105, Save, UI, MAX and auth PostgreSQL files | 0; 42/42 | artifacts/p0-integration/focused-pg.log |
| npm run test:integration on isolated PostgreSQL 18.6 and Redis | 0; 56/56 | artifacts/p0-integration/integration-accept.log |
| npm run test:unit after final ambiguity regression | 0; 269/269 | artifacts/p0-integration/unit-final.log |
| npm run typecheck; npm run typecheck:pure; npm run build | 0 each | artifacts/p0-integration/typecheck-final.log, typecheck-pure-final.log, build-final.log |
| Authenticated production-build browser Save → Saved → unsave/resave → reload → rejected mutation | 0; PASS | artifacts/p0-integration/browser-save-final.log |
| git diff --cached --check; staged prohibited-path and high-confidence secret scan | 0; 0 prohibited, 0 hits | artifacts/p0-integration/final-scan.txt |

The PostgreSQL commands used docker compose -p p0-integration-accept -f compose.yaml run --build --rm checks node --experimental-strip-types scripts/p0-integration-migrations.mjs, then checks npm run test:integration with T105_TEST_DATABASE_URL and P0_SAVE_TEST_DATABASE_URL pointing to matrix-created isolated databases. The browser used node scripts/p0-save-browser.mjs with P0_SAVE_TEST_DATABASE_URL pointing to povod_save_browser; artifacts/p0-integration/browser-ports.yaml exposed only localhost test ports. migrate-browser.log records 0001–0006 there. No live MAX or provider mutations occurred.

T105 Event/Occurrence separation, UNKNOWN/CONDITIONAL price, provenance and sync fencing; Save ownership, idempotency, uniqueness, persistence and current canonical facts; Catalog late match/deterministic order/exact Detail; definitive 422 recovery versus uncertain transport; MAX delayed/duplicate/equal-time ordering and durable ACK are covered by these combined suites. Catalog stops at 100 eligible choices. The UI26 plan regression now opens its known fixture through exact Detail because earlier suites may fill those 100 slots; its price, auth, plan and replay assertions remain.

## Boundary and next action

DATA_RUNTIME_GATE = FAIL; KudaGo NOT_APPROVED; Moscow NOT_ACTIVATED. The remaining P0 blocker is the absence of approved live Moscow provider/data readiness. No live ingestion was implemented. Historical destination rows with NULL source time retain the accepted conservative rule; operator reconciliation is a follow-up, not a P0 blocker for current authenticated delivery. Real MAX delivery was NOT_RUN. Stop at this integration checkpoint.
