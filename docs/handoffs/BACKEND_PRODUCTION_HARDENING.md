# POVOD backend production hardening — review handoff

## Input and boundary

- Accepted base: `7ae18e69d9dcdd912faddd02b202d2289cadcd38`, `Complete accepted unified POVOD V2 runtime`.
- Dedicated branch/worktree: `codex/backend-production-hardening` at `D:\Dev\Codex\Worktrees\backend-production-hardening\The-Boys-Max`. Starting HEAD matched the accepted base and status was clean. The accepted UI worktree was not edited.
- Starting map: read-only **POVOD | Contract | UI ↔ Backend Wiring Audit** (thread `01a0df6e-6a3c-7d23-8907-20fd0e4432ca`), then accepted V2 and unified-runtime handoffs, active task, relevant domain files, migrations and tests. Audit findings were rechecked against accepted base before implementation.
- No commit, push, merge, provider activation or external delivery was performed.

## Verified contracts and changes

| Area | Accepted-base finding | Review result |
| --- | --- | --- |
| Text Search | Nonempty `SearchDraft.text` rejected. | Literal catalog matching is enabled. NFKC, Russian lowercase, `ё`→`е`, punctuation→spaces; all words must occur across admitted title, canonical category text or venue address. Empty/punctuation-only query has no text filter. Maximum 120 characters/12 words. No SQL interpolation, synonyms or AI expansion. Existing hard fields require verified PASS before the 100-result cap. Exact Event Detail still ignores unrelated Search filters. |
| Home recommendations | Client interest-only ranking could reorder demo above real; budget/time preferences were ignored. | Pure ranking contract: +4 for literal title or explicit category-interest match, +2 only for source-backed all-in known per-person RUB total within budget, +1 only for exact Moscow local preferred-time match. Real records always precede demo; ties use observation ID. Missing/conflicting preferences yield zero or only supported reasons. API cards include score/reasons/matched interest; Home consumes server order. Eligibility and UNKNOWN remain unchanged. |
| Friendship | Migration 0010 had already closed unordered-pair duplication. Request notification was separate from relation insert; accept/reject retries failed. | Transaction ties first relation insert to one notification, preserving reverse-race uniqueness. Accepted state stays accepted. Durable `REJECTED` state makes rejection idempotent; repeated request returns stored state. Friends list hides rejected relations and friend-link UI describes rejection accurately. |
| Plan invitations/joins | Per-click random invite key and separate notification could create several active invites; core plan ACL existed. | Friend invite uses existing `invites` in a plan-row transaction, deterministic initial actor/plan key, participant guard, persisted pending state and one notification. Concurrent retries converge. An expired/revoked invite no longer appears pending; retry creates one new live token and refreshes the same notification identity. Join request and organizer notification are atomic; repeat does not re-notify. Approval notifications are in the ROSTER transaction, and identical roster approval converges even with a new key. Rejection is idempotent and transactional. No second invitation subsystem. |
| Notifications | Durable read state existed; list cap was 100 and badge counted that list. Actor/object context was partial. | Actor-scoped `/api/v1/me/notifications/count` returns exact unread count, excluding obsolete internal-chat rows. List also carries `unreadCount`, actor ID, plan/invite context and typed `target`. Missing historical context yields `UNAVAILABLE`/null. The bell reads count endpoint; read is durable and idempotent. |
| RSVP/plan changes | Migration 0009 already introduced `reconfirm_version` and invalidated stale YES. Latest-only changed fields, optional answered version and separate write calls still left gaps. | Material meeting time/point increments existing reconfirm version; YES binds to required expected version. RSVP response includes answered/current version and `responseRequired`. Per-version field history accumulates unseen changes; seen acknowledgement requires observed version. Nonmaterial edits preserve YES. Presentation, history and notifications commit in one PostgreSQL transaction. Forced notification failure rolled back metadata in integration. |
| Event identity | Exact occurrence Detail, Saved canonical IDs and cancelled-plan source snapshot were already present in accepted V2. | Retained. Regression verifies Search-filter-independent exact Detail after cancelling a plan; Save integration verifies canonical occurrence ID and current UNKNOWN/source facts. No title/date/place reconstruction. |
| City/Nearby | UI already showed unsupported city and browser-location states. API catalog could still return Moscow events with another preferred city. | Preference response reports `catalogCoverage: SUPPORTED/UNSUPPORTED`; unsupported preferred city returns no discovery events. Explicit known Event locators remain resolvable. Radius stays a client calculation from actual client location and source-backed coordinates. Server radius filtering is deferred. |

## Migrations

- `0011_friend_rejection_state.sql`: append-only extension of friendship state check to preserve a rejected pair and idempotent rejection. Existing 0010 unordered-pair unique index remains authoritative. SHA-256 `1F908FBCCB1C40231443837F88D90B9D6C298537C6A43FE301C7905DF8C0DD33`.
- `0012_plan_presentation_changes.sql`: append-only per-version presentation field history; backfills accepted schema's latest known diff without inventing older revisions. Old rows with unavailable earlier history report `changeHistoryComplete:false`. SHA-256 `90635B9554EEF2E740272D73C46D2F8071F44432B4490B1D79C8578762560890`.
- Historical migrations and canonical event/occurrence IDs were not changed. PostgreSQL `18.6` fresh `0001`–`0012` passed. Upgrade from `0010` with an existing version-3 plan presentation and participant seen version passed: 12 ledger rows, version 3 preserved, latest note preserved, older history honestly incomplete. Accepted-schema `0010`→`0011`→`0012` also passed in the main isolated test database.

## Actual validation

All commands ran in this worktree. Logs and test-only runtime settings are under ignored `.run-evidence/backend-hardening/`. Representative SHA-256 source fingerprints: `catalog.ts` `01ABCFC678B68EF1442BB7A75A6263F7D73A4C63E996827F9DD28807AE8B3CCB`; `ui.ts` `7C731734BFF3C8E74320B9E8B4E6F378EB99D9C413794562448F4E9324CDD661`; `social.ts` `31E68D1608A27DFA46378C26F911CDED4B8E3F17220F6D2697ADEC405B7C1A0D`; `plans.ts` `C49BFB36771147D7EC7072354EDF6F737600DA698F430ADAE45E88FA284B241F`; hardening integration test `A62864A9A56CA0CE3EA7A100BC54D7597DC935A44E96B68E9EA3695295C2F6F6`.

| Command/check | Result | Evidence |
| --- | --- | --- |
| `npm.cmd ci --ignore-scripts` | Exit 0 | Console; pinned dependencies installed locally. |
| `npm.cmd run migrate` on fresh isolated PostgreSQL 18.6 databases | Exit 0; 12 migrations | `migrate-povod_hardening_fresh.log` and named suite migration logs. |
| `npm.cmd run migrate` on accepted 0010 schema, including populated upgrade probe | Exit 0; 0011–0012 | `migrate-upgrade.log`, `migrate-upgrade-0012.log`, `migrate-upgrade-data.log`, `upgrade-probe-verify.log`. |
| `npm.cmd run test:unit` | Exit 0; 289/289 | `unit-final.log`. |
| `npm.cmd run test:integration` with `RUN_MAX23_INTEGRATION=1` and each suite's required isolated database URL | Exit 0; 71/71 | `integration-final.log`. Includes real catalog, Save, UI/backend and six new hardening integrations. |
| `npm.cmd run typecheck` and `npm.cmd run typecheck:pure` | Exit 0 / 0 | `typecheck-final.log`, `typecheck-pure-final.log`. |
| `npm.cmd run build` | Exit 0; 202 Vite modules | `build-final.log`. |
| Separate owner preview at `127.0.0.1:3001` with curated Moscow and labeled demo data | Health 200, page 200, dev owner session 200; server stopped after check | `preview-seed.log`, `preview-import.log`, `preview-http.log`. |
| `git diff --check` | Exit 0; only LF/CRLF notices | Final command output. |
| High-confidence private-key/token scan of changed source; prohibited-path review | No secret signatures or new prohibited files | Final command output and `git status --short`. Existing checked-in research ZIPs and safe `.env.example` templates are unchanged. |

## Limits and next action

- No live MAX auth/delivery, native MAX share, LLM/Smart Occasion, map, Follow, second city, provider onboarding, server geospatial filtering or production deploy was run or implemented. Existing BullMQ/Redis/outbox and Moscow source-admission gate remain intact. `PLAN_CHAT` legacy rows/routes remain unused.
- Rejected friendship is terminal for this sprint. Reopening a rejected relation requires an explicit future product decision. Earlier presentation revisions absent from accepted rows cannot be reconstructed; the API marks their history incomplete.
- Browser/device geolocation permission grant and real MAX client checks were **NOT_RUN**. Preview startup was verified over HTTP; no broad visual review was performed or required.
- The accepted UI component layout is unchanged. UI edits only consume server ranking/unread count, send observed plan versions and display durable rejected-friend state.
- Owner reviews this uncommitted diff and handoff. Do not commit, push or merge until requested.
