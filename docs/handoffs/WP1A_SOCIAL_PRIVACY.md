# WP1A social privacy and membership races

Authorized scope: P20-F001 and P20-F004 only. Base commit
`c9fb4d9edd9af3dafff6f1f82baee8a0e5fb0468`, tree
`fa1a38e1415ccbd328e405181a574e9bc33abb95`. Branch:
`codex/povod-pretelegram-wp1a-social-privacy`.

Inputs: the owner's WP1A packet; P20 FINDINGS.json/FINDINGS.md and
FILE_OWNERSHIP.md; P01 REPORT.md and notification counterexample; P04
authorization-poc.ts and retained authorization-poc.log; P21 runtime-slot
contract; accepted P22D foundation receipts. These external inputs live under
`D:/Dev/Codex/Evidence/povod-pretelegram-recovery` and
`D:/Dev/Codex/Evidence/povod-pretelegram-20261029`. Foundation has no ACTIVE_TASK
or AGENTS file; the explicit WP1A packet is the current implementation authority.

Changed source: `packages/persistence/social.ts`. New regression:
`tests/integration/social-privacy.test.ts` (14 tests). No plans.ts change is
necessary: Plan commands already lock the Plan row FOR UPDATE before replacing
the slots. No routes, shared contracts, dependencies, UI, schema or historical
migrations changed.

P20-F001: notification ownership previously joined current Plan/presentation
without current read authority. The SQL now gates the Plan join on organizer or
ACTIVE slot authority, joins presentation through that authorized row, and
redacts Plan ID/title, event title and Plan actor context when unauthorized.
The original notification ID, kind, historical title, timestamps, read state,
visibility predicate, cursor and unread counting remain. No unauthorized PLAN
target is emitted. Invite locators retain their separate INVITE flow; its
expired/revoked preview defect P20-F002 is expressly deferred.

Notification concurrency contract: metadata and ACL are evaluated in one
PostgreSQL statement snapshot. A read overlapping an uncommitted removal may
observe the preceding authorized state. A read after removal commit cannot
enrich from the removed Plan, including metadata changed after that commit.

P20-F004: chat now runs in the existing transaction helper. Lock order is Plan
FOR SHARE, a fresh READ COMMITTED membership query, message read/insert,
notification insert, commit. The separate post-lock ACL statement is essential:
the snapshot of an EXISTS in the locking statement could predate a lock wait.
Roster FOR UPDATE and chat FOR SHARE serialize on the same row. If removal is
first, chat waits and then denies. If chat is admitted first, removal waits for
chat commit/rollback. Concurrent admitted readers remain compatible. Responses
may arrive over the network after removal; their business read was ordered
before it. No claim of network delivery revocation is made. Message and notice
writes commit or roll back together; recipient selection occurs while the same
Plan lock protects membership. Later organizer sends exclude removed members.

Actual pre-freeze checks (Node 24.22.2, npm 11.19.1, disposable digest-pinned
PostgreSQL 18.6 and Redis 8.2.9, synthetic actors, no external delivery):

- Locked `npm ci`: exit 0.
- `node focused-run.mjs baseline-confirmed tests/integration/social-privacy.test.ts`:
  13 tests, 5 pass / 8 fail on unchanged base implementation; exit 1, expected RED.
- Final test file replayed against a fresh exact-base Git archive and locked
  install: 14 tests, 5 pass / 9 fail; exit 1, expected RED. Both notification
  leakage and committed-revocation read/write races are captured, as is a
  persisted message after failed notification insert.
- `node focused-run.mjs repaired-1 tests/integration/social-privacy.test.ts tests/integration/notification-pagination.test.ts`:
  19/19, exit 0 (earlier 13-test version).
- `node focused-run.mjs repaired-2 tests/integration/social-privacy.test.ts tests/integration/notification-pagination.test.ts tests/integration/miniapp-auth.test.ts`:
  34/34, exit 0, including final 14 WP1A tests.
- `npm run typecheck`: final development attempt exit 0.
- `git diff --check`: exit 0.

Every focused execution used fresh services and independently verified container
and volume absence. Barriers observe actual PostgreSQL lock wait relationships;
there are no timing sleeps to resolve races. Tests log synthetic durable state
before teardown, including failed assertions. Historical P04 evidence is untouched.

Failed development attempts remain retained: initial baseline-red was 4 pass /
9 fail, including three incorrectly matched barrier queries and two assertions
expecting HTTP 500 instead of the established 503 DB error response. After fixing
the harness, baseline-confirmed still failed the actual privacy/order/atomicity
assertions. Initial development typecheck exited 2 because afterEach's context
union did not expose diagnostic(); replacing diagnostic output with console.log
fixed the test-only typing error. These attempts are not represented as PASS.

Acceptance is NOT established by this pre-freeze handoff. The final exact-SHA
gate ledger, two independent complete integration runs, packaging, browser,
Docker, audit, secret scan, protected-ref and cleanup receipts, publication and
hosted CI verdict are recorded outside tracked source under
`D:/Dev/Codex/Evidence/povod-pretelegram-recovery/WP1A/FINAL_REPORT.md` and
`docs/handoffs/WP1A.md` there. This separation keeps the candidate immutable
through final acceptance. Any final gate failure blocks push.

Deferred: P20-F002/F003/F005/F006/F016/F017/F018/F028/F029/F030/F032/F059;
historical IT-08 remains unresolved. No Telegram, live AI/source activation,
main merge, deployment or tag. P15-P19 and the dirty checkout are preserved.
Next action is the exact-SHA acceptance and, only if all required gates pass,
a draft PR stacked on the unchanged foundation branch; no retargeting to main.
