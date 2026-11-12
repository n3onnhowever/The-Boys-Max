# WP1B expired and revoked invitation privacy

Authorized scope: P20-F002 only. Base `7edde7ce53faf7a32b4ad82768f692d6a02e865d`,
tree `5c1a8f6528eba921cbe11035fed30a1960ebf69c`. Independent worktree:
`D:/Dev/Codex/Worktrees/povod-wp1b-invite/The-Boys-Max`, branch
`codex/povod-pretelegram-wp1b-invite-privacy`.

Inputs: owner's WP1B packet; P20 FINDINGS.json, REPAIR_ORDER.md and
FILE_OWNERSHIP.md; P04 authorization-poc.ts and its retained HTTP evidence;
current INVITE contracts/schema, Plan commands/domain access, sessions and
existing integration expectations; P21 runtime-slot contract; WP1A publication
and EOL-safe canonical verification. External inputs/evidence remain under
`D:/Dev/Codex/Evidence/povod-pretelegram-recovery` and
`D:/Dev/Codex/Evidence/povod-pretelegram-20261029`. ACTIVE_TASK and current
authority were read in the original checkout; neither file exists at this base.
The explicit WP1B packet is implementation authority.

Files: production change only in `packages/persistence/ui.ts`; 25 new tests in
`tests/integration/invite-privacy.test.ts`; this handoff. No existing test,
shared contract, route, session, command, dependency or migration changes.

## Reproduction and root cause

The INVITE query used invitation validity only to select its public state.
Every matching historical token still projected organizer name, Plan title,
event title, start time and venue. Authenticated outsiders received HTTP 200,
state EXPIRED, null activePlanId and no actions, but non-null private context,
including organizer/Plan names changed after expiry or revocation. Direct PLAN
reads and invalid-token join/neutral GET remained 404. Anonymous requests were
401. Original P04 evidence is preserved unchanged.

## Reviewed authorization contract

| Current authority | Context | State / Plan locator |
| --- | --- | --- |
| Valid token, no request | Existing preview | REQUESTABLE / none |
| Valid token, PENDING request | Existing preview | PENDING / none |
| Current organizer, including no participant slot | Existing preview | ACTIVE / authorized Plan |
| Current ACTIVE member | Existing preview | ACTIVE / authorized Plan |
| Expired/revoked token, outsider or pending applicant | null | EXPIRED / none |
| Cancelled/closed Plan, outsider | null | EXPIRED / none |
| Valid token, REJECTED or REMOVED request, no current authority | null | REJECTED / none |
| Historical APPROVED request without current membership | null | Existing REQUESTABLE state/action retained / none |
| Unknown token | null | EXPIRED / none |

Organizer/ACTIVE authority takes precedence even with an invalid historical
invitation or terminal Plan. An unknown token cannot identify an authorized
Plan. INVITE preview entitlement never grants ordinary PLAN access. Existing
requestJoin uses insert-on-conflict-do-nothing and returns the persisted state;
rejected/removed requests cannot regain permission by replaying a token.
Historical APPROVED alone is also not membership. Those business rules and
all status/action mappings remain unchanged. Existing nullable context schema
already permits this repair; no wire version change is needed.

## Minimal repair and concurrency

One PostgreSQL statement materializes invitation validity, current organizer/
ACTIVE membership and request state. The private Plan join requires that
authority or a valid token with absent/PENDING request. Organizer and presentation
joins use that authorized Plan row. SQL emits null context otherwise and emits
a Plan ID only for current organizer/ACTIVE membership; private fields are never
returned first for later client-side redaction. No ACL cache or migration.

Under the existing READ COMMITTED semantics, that statement's snapshot orders
the read against committed revocation/membership/metadata writes. An overlapping
uncommitted revocation may leave the preceding authorized snapshot visible;
a new statement after commit cannot use it. The validity clock is evaluated
once in the materialized CTE. This does not promise retroactive withdrawal of
responses already read or in network transit. The deterministic concurrency
test holds a real revocation transaction open, completes an HTTP read, commits,
renames private metadata, then verifies neutral subsequent reads. It uses no
sleep or timing assumption. A separate commit-first case preserves member access.

## Actual pre-freeze checks

Pinned Node 24.22.2/npm 11.19.1; shared P21 slot owned by WP1B; digest-pinned
PostgreSQL 18.6 and Redis 8.2.9 on fresh disposable services; synthetic signed
sessions/data, external AI/maps disabled. Exact logs and resource receipts are
outside Git in `D:/Dev/Codex/Evidence/povod-pretelegram-recovery/WP1B`.

- Locked `npm ci`: exit 0.
- `node focused-run.mjs baseline-red tests/integration/invite-privacy.test.ts`:
  unchanged WP1A implementation, 25 tests, 11 pass / 14 fail, exit 1 (expected
  defect reproduction). All 14 failures are non-null private-context assertions.
- `node focused-run.mjs repaired tests/integration/invite-privacy.test.ts
  tests/integration/miniapp-auth.test.ts tests/integration/backend-hardening.test.ts`:
  45/45 pass, exit 0 (25 new plus 20 existing tests).
- `npm run typecheck`: exit 0; `git diff --check`: exit 0.

Exact synthetic HTTP/VisualPort responses and durable Plan/invite/slot/request
state are logged before teardown, including on failed assertions. Both focused
runs verified owned containers and volumes absent afterward. Coverage includes
all requested 16 scenarios, five private fields, Plan locator/navigation,
session denial, terminal requests, current member/organizer controls, pending
expiry, historical approval without membership and both revocation orderings.
Full-suite expectation is 372 existing units and 186 integrations (161 inherited
plus 25 new), each complete integration execution counted independently.

## Frozen acceptance and next action

This pre-freeze handoff is not a final acceptance claim. The exact committed
source/tree, commands/exits/log hashes, two independent complete integration runs,
build, browser/offline, Docker, package, cross-EOL, audit, secret scan, canonical
blob preservation, cleanup, publication and hosted CI are recorded externally
in `WP1B/FINAL_REPORT.md` and `WP1B/docs/handoffs/WP1B.md`. This keeps the candidate
immutable during acceptance. An unexpected failed gate blocks publication.

Next: complete frozen-source acceptance, then only if all gates pass push
normally and create a Draft PR stacked on unchanged WP1A. Preserve foundation,
WP1A, P15-P19, original dirty checkout and historical refs. No merge, deployment,
new stable tag, WP1C/WP2/WP3/WP4 or Telegram work. Other P20 findings, including
F003/F005/F006/F016/F017/F018/F028/F029/F030/F032/F059 and historical IT-08, remain
outside this repair; WP1A F001/F004 results remain inherited evidence.
