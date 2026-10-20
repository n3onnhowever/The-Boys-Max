# Stable offline portfolio validation

This is the current acceptance reference for POVOD's first stable offline portfolio snapshot. Measurements below are historical and pinned to source revisions; they do not establish production readiness. The owner supplied independent audit verdict **READY_FOR_STABLE_FINALIZATION** for candidate `0c0c2a528e6daf523a74df0e3c5747482196b5c1` on 2026-10-20. Finalization requires fresh push and PR CI on the Vite-patched candidate and fresh CI on the exact integrated main commit before the annotated `povod-stable-v1` tag is created. No deployment or Docker publication is part of this checkpoint.

## Source references

| Reference | Immutable commit / tree |
| --- | --- |
| Historical main and `hackathon-final-2026-09-30` | `8f1348f0f009008d83830a4de3fd8835f5653a2c` |
| Stability 01, PR #3 | `dca0036bb3a39f7a099c923d7dfd32e03e891b00` |
| Correctness 02A, PR #4 | `d1185f047bef3e1998d4ff87a390214b72916a45` |
| Correctness 02B before portability repair | `ae05e8f88d937c6c96972b3619dff383de706a4a` |
| Audited candidate, PR #5 | `0c0c2a528e6daf523a74df0e3c5747482196b5c1` |
| Full audited candidate Git tree | `f462a7b6fd35c017d9adc364b794759de3c53eb8` |
| Documentation cleanup blocked by fresh Vite advisory | `3d54fecc84d03e1e148d5ef2736bd5a08a1d230a` |
| Vite 8.2.4 security patch | `9a603920eb2fa7e09ab721d8557baacbf078958a` |

All 15 accepted commits between historical main and the audited candidate must remain ancestors of integrated main. Use merge commits, without squash/rebase/history rewriting. The final main tree must equal the approved Vite-patched candidate tree. Relative to the documentation-cleanup tree, only Vite dependency metadata/lock resolution and necessary documentation updates are authorized; runtime/build/test sources and all migration SQL blobs remain identical to the audited candidate. The historical hackathon tag must stay at its original commit. The stable tag identifies the integrated offline source snapshot, not a production release. Repository license remains **OWNER_REQUIRED**.

The private complete-history backup was verified before finalization (139 refs; SHA-256 `23c9b65e17544502720578e13e1ba9fccaf1eb7d5c1a1dc1db31c20edc28e8fb`). It stays private and does not contain uncommitted, untracked or ignored files. The original dirty checkout is preserved separately and is not used for this work.

## Executed acceptance

Dates use Europe/Moscow. These runs are the evidence for the source in each row, with zero failed/skipped unit and integration tests:

| Measurement | Source | Unit | Integration | Hosted push / PR runs |
| --- | --- | --- | --- | --- |
| 2026-10-17, Stability 01 | `dca0036bb3a39f7a099c923d7dfd32e03e891b00` | 340 | 103 | [push](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/38985716207), [PR](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/38985723349) |
| 2026-10-19, Correctness 02A | `d1185f047bef3e1998d4ff87a390214b72916a45` | 359 | 119 | [push](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/39174983138), [PR](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/39174993392) |
| 2026-10-20, Correctness 02B + portability repair | `0c0c2a528e6daf523a74df0e3c5747482196b5c1` | **367** | **142** | [push](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/39483652475), [PR](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/39483658871) |

All three accepted heads passed clean install, both typechecks, full unit/integration suites, application build, local release Docker image build, isolated offline HTTP smoke, npm audit and the repository current/history secret/prohibited-file scan. The candidate's 142 integrations include the 133 pre-repair tests and nine migration portability scenarios. [CI](CI.md) describes the executed workflow and its limitations.

Candidate local checks on 2026-10-20 also passed the commands below, including a release image rebuilt with the exact candidate SHA. Earlier local results are preserved in the source-pinned historical records linked below. Local logs remain private/ignored; they are not shipped as source or uploaded by CI.

| Candidate command | Actual result at `0c0c2a528e6daf523a74df0e3c5747482196b5c1` |
| --- | --- |
| `npm ci` | exit 0; lockfile unchanged |
| `npm run typecheck` | exit 0 |
| `npm run typecheck:pure` | exit 0 |
| `npm run test:unit` | exit 0; 367 passed |
| `npm run test:integration:isolated` | exit 0; 142 passed |
| `npm run build` | exit 0 |
| `npm run demo:portfolio -- --smoke` | exit 0; offline HTTP journey |
| `npm audit` | exit 0; **0 application dependency vulnerabilities** |
| `npm run scan:secrets` | exit 0; no findings/prohibited paths/oversized blobs |
| `git diff --check` | exit 0 |
| `docker build --target release --build-arg SOURCE_SHA=0c0c2a528e6daf523a74df0e3c5747482196b5c1 -t povod:migration-portability-0c0c2a5 .` | exit 0; local release image only |

**Docker image scan: 27 previously reported high/critical advisories**, as recorded in the owner's 2026-10-20 independent audit context for the candidate. They require separate review before public hosting. This documentation cleanup does not rerun the image scan. Zero npm application dependency vulnerabilities does **not** mean the complete container image has zero vulnerabilities.

Real MAX is unavailable; live GigaChat was **NOT_TESTED**. No real provider calls, production database access, deployment or image publication were performed. Deterministic AI stubs, synthetic actors and TestTransport establish only their tested contracts.

## Vite security patch

On 2026-10-20, fresh `npm audit --json` at documentation cleanup source `3d54fecc84d03e1e148d5ef2736bd5a08a1d230a` reproduced one moderate finding: [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv). Vite 8.2.2 bundled launch-editor 2.14.1, whose Windows command escaping omitted `%`. `npm ls launch-editor` returned an empty tree because this code is bundled inside Vite, not separately resolved in the application lockfile. The official advisory identifies Vite 8.2.4 as patched in the 8.2 line.

Patch source `9a603920eb2fa7e09ab721d8557baacbf078958a` was produced with `npm install --save-dev --save-exact vite@8.2.4`. Only the root Vite pin and Vite's lockfile version/tarball/integrity changed; all other package entries and dependency edges are identical. Installed Vite 8.2.4 bundles launch-editor 2.14.2. No unrelated dependency, Node/npm version, audit setting or exception changed. Existing historical zero-finding audit measurements above remain pinned to their original revisions.

Fresh local results for that patch source:

| Command / check | Actual result |
| --- | --- |
| `npm ci` | exit 0; clean install; lockfile unchanged |
| `npm ls vite`, `npm ls --all` | exit 0; Vite 8.2.4; no dependency conflict |
| `npm run typecheck`, `npm run typecheck:pure` | both exit 0 |
| `npm run test:unit` | exit 0; 367 passed, zero failed/skipped |
| `npm run test:integration:isolated` | **exit 1; 141 passed, 1 failed, zero skipped (142 total)** |
| Cross-EOL migration regression (included in integration) | **8 passed, 1 failed**; isolated 0017 legacy CRLF → LF scenario failed its schema assertion |
| `npm run build` | exit 0; Vite 8.2.4 |
| `npm run demo:portfolio -- --smoke` | exit 0; offline HTTP journey PASS |
| `npm audit`, `npm audit --json` | exit 0; zero findings |
| `npm run scan:secrets`, `git diff --check` | both exit 0 |
| `docker build --target release --build-arg SOURCE_SHA=9a603920eb2fa7e09ab721d8557baacbf078958a -t povod:stable-v1-security-9a60392 .` | exit 0; local image only |

**BLOCKED_WITH_EXACT_REASON:** `tests/integration/migration-eol.test.ts:71` selects the first constraint whose definition contains `version` without an ordering or constraint-type filter. In the isolated 0017 scenario, PostgreSQL returned `NOT NULL version`; the assertion expected `/version >= 0/`. The test failed at its schema assertion, before that scenario's subsequent portability probes. Test source, migration runner and all 17 SQL blobs are unchanged by this patch. This observation does not establish a missing CHECK constraint or a runtime migration failure. No test was removed, skipped, weakened or repaired during this dependency-only task.

The Vite advisory is resolved locally, but the required integration gate is not green. No patched push/PR CI, ready/retarget/merge operation or stable tag was attempted. Finalization remains blocked pending separate authorization to address the existing test assertion and then rerun all required gates. The previously reported Debian/container findings remain deferred; no container vulnerability scan was rerun and this npm result does not establish an advisory-free OS image.

## Stability 01 contracts retained

- Dependency repair updated only the affected Fastify 5.12.5, shell-quote 1.11.0 and source-map-js 1.2.2 versions/integrities for [GHSA-4mh8-r7rc-xpvc](https://github.com/advisories/GHSA-4mh8-r7rc-xpvc), [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) and [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). Existing Drizzle declarations, Gel/MySQL peers and runtime pins were retained. The later finalization patch changes only Vite 8.2.2 to 8.2.4, as recorded below.
- K11: future discovery requires scheduled status, proven upcoming occurrence and observed listing. Past/unknown-end occurrences are excluded from future recommendations. Historical Saved/detail access remains; ended/cancelled detail offers no add-to-plan action. Saved keeps historical entries in «Остальные» with «Архив». UI layout/artwork remain as accepted.
- Historical fixture acceptance injects a catalog-only clock (`2026-09-30T00:30:00.000Z`); no production clock environment flag/global Date mock. Sessions, credentials, authorization, add/Plan operations and TTLs use real time. Tests preserve 167 LIVE + 48 DEMO stored occurrences and original 200-result ordering; separate present-day and 2030 expiry/rights tests exclude ineligible discovery while retaining historical Saved access. An expired real session still fails under the fixture catalog clock.
- The isolated harness uses fresh PostgreSQL 18.6/Redis 8.2.9, pinned images, random loopback ports, six migrated databases and checked-in imports. It cleans up only services it owns. No production data, provider transport or Windows-specific path is required.
- The offline demo builds the accepted UI, seeds 48 explicitly synthetic canonical/search scenarios with future dates relative to startup, and runs a loopback API plus the existing BullMQ worker/TestTransport. Local/test guards reject production, external origins/providers and owner preview; keys stay in child environments. Synthetic signed launch retains bootstrap/exchange/session checks. AI is disabled, MAX SDK is absent and the connect CSP is same-origin only. The v3 explanatory source-link allowlist remains restricted by origin/path.
- Local HTTP smoke and browser acceptance exercised Home, Search, Detail, Save/Saved, New Plan/Plan Detail, Friends and Profile; a solo Plan persisted. HTTP smoke also checked anonymous/CSRF/Origin guards, disabled AI, absent owner endpoint, source page, Redis PONG and worker registration. Browser acceptance was local; hosted CI runs HTTP smoke.

An auxiliary 2026-10-17 nested Docker Desktop Linux diagnostic was **BLOCKED_LINUX_NESTED_LOOPBACK** (sibling services published to random host loopback ports were unreachable inside the nested container). The unmodified harness passed on the Windows host and subsequently on Ubuntu hosted Actions. No networking/TLS workaround was added. Historical reproduction and diagnostic logs are described in the archived Stability handoff below; the auxiliary failure does not substitute for or negate the later hosted evidence.

## Correctness 02A / 02B contracts retained

K1 uses a bounded server-side Russian vocabulary in `modules/ai/smart-language.ts`. Recognized requested hard fields must equal proposed hard fields; missing/changed/invented constraints fail closed. Unsupported/unconsumed language yields clarification with an empty, non-applicable draft. Provider schema/version, configuration and review-before-apply remain unchanged. Supported combinations cover today/tomorrow/weekend or one ISO date in Europe/Moscow, morning/day/evening with a date, existing positive categories, free/integer ruble caps, Moscow and supported party sizes. Multi-person budgets still require total/per-person clarification. Negation/exclusions, alternatives/multiple dates, clock times/night, unsupported wording/currency/city and contradictory conditions cannot become unconstrained Search. The full vocabulary and examples remain in the archived 02A contract below. Stub tests traverse text → proposal → session-bound acceptance → UI draft → actual SearchIntent → factual eligibility; UNKNOWN price stays unknown.

K5 excludes RSVP NO during reminder creation, reconciliation, reservation and final pre-wire validation. Reconciliation cancels obsolete queued rows without deleting history. Shared Plan locks serialize scheduling/final delivery with RSVP, roster, cancellation and material changes; the final lock lasts through the existing bounded MAX transport call (8 seconds). Already-started uncertain delivery remains UNKNOWN and cannot become a safe retry after NO. Active organizer/YES/MAYBE/unanswered policies and stale-term reconfirmation remain separate; nonparticipating organizers get no participant reminder, and NO suppresses even for an active organizer. In-app list/count hide declined reminder rows while retaining storage/history. Tests cover races, enqueue/reservation/governor/pre-wire stages, stale versions, removals/material changes, organizer policy, foreign actors and in-flight UNKNOWN.

K7 preferences use PostgreSQL optimistic concurrency: GET returns `version`, PUT requires `expectedVersion`, and successful writes atomically increment version (including competing first writes). Stale writes return `409 / PREFERENCES_VERSION_CONFLICT`. Settings retain the draft and allow explicit reload/reapplication. Additive migration 0016 supplies default 0, NOT NULL and nonnegative constraint.

K6 notifications use bounded `limit`, validated opaque cursor and `nextCursor`, ordered by exact PostgreSQL `(created_at, id)` descending. All unread rows beyond the former first 100 are accessible. Ownership, hidden PLAN_CHAT/declined reminders and exact unread count remain enforced. Additive migration 0017 supplies the matching cursor index. Pre-repair 02B browser acceptance verified conflict/reload/reapply and notification pages; the portability repair did not change that UI.

## Reviewed migration checksum policy

The [deployment safety contract](DEPLOYMENT.md#migration-checksum-contract) is canonical. All 17 SQL Git blobs below are identical to the audited candidate and pre-repair 02B; original 0001–0015 also match historical main. Migrations 0016/0017 are accepted additive 02B migrations.

Root SQL checkouts are LF. The runner validates UTF-8/uniform EOL, executes canonical LF text and records LF SHA-256 for new ledger rows. `scripts/migration-fingerprint.ts` pins reviewed LF hashes and only the exact reproduced historical CRLF exceptions for **0001–0003 and 0007–0017**. 0004–0006 were LF-only and receive no unverified CRLF exception. Future migrations receive no legacy exception. No trimming or generic mismatch fallback; BOM, mixed/bare CR, invalid UTF-8, SQL/space/comment edits and unknown stored hashes fail with `MIGRATION_HASH_MISMATCH:<id>`.

Existing approved ledger hashes, full-precision timestamps and business data are never rewritten; applied SQL is not replayed when representation changes. **0010's first application deletes duplicate friendship pairs.** A populated production database without approved 0010 must STOP for a separate reviewed data-preserving plan. Canonical LF SHA-256 is `d9577cb554c383b7ada45c7ad4e5aded2a6a74ec882fb2af14a550b8df93db5e`; exact legacy CRLF SHA-256 is `896fffb4bf8826bbc7129ef1b8ec5be5cb1197128f09dae32dc9c7fde94e0d51`. Never clear or rewrite the migration ledger to fix a mismatch.

Nine PostgreSQL tests exercise fresh/repeat LF, reviewed CRLF → canonical ledger, LF ↔ legacy CRLF, authentic old-runner ledger → repaired LF, 0010 no-replay, populated 0015 upgrades through 0016/0017 and isolated 0016/0017. The actual pre-repair runner reproduces expected failures and creates authentic legacy ledger rows. Reruns and rejection probes compare exact ledger JSON and complete sorted business rows: actors, nonzero preference versions, notifications, Saves, Plan/slot, Friends, 48 catalog occurrences and UNKNOWN outbox. Only the expected additive preference version default is excluded from the 0015 upgrade comparison. No old test was removed/skipped.

| SQL file | Git blob SHA-1 |
| --- | --- |
| `0001_foundation.sql` | `9158edc6cdda1a89b687a318591dda83a76385d1` |
| `0002_integration.sql` | `df6b11354c825e15f5e6272050ca5ff40fb0532e` |
| `0003_ui_journal.sql` | `d3fc82f6405f3f0e4c27e8a82d520f7e643f13c4` |
| `0004_t105_catalog.sql` | `379b0e03038523c45728aece09bebad14ecaf1e6` |
| `0005_saved_occurrences.sql` | `99522320fa21d7817aaeea5c5a06262e2c11fd43` |
| `0006_max_destination_fencing.sql` | `767f42ea8a0d69e4f2fe36d1010c0e774481ff30` |
| `0007_owner_product.sql` | `2e4618e67d68bd2c48b3690ccea363b0fcabcb68` |
| `0008_povod_v2_ui.sql` | `b147c0ce81b10d728371b1e26146f3f85ce829a0` |
| `0009_povod_v2_corrections.sql` | `ff90eeba54b24e4311645b89d5e2e34d69ee8b16` |
| `0010_friendship_pair_unique.sql` | `a45f0b2d40b60bee87a2c3b04c1e553c0bf7f7e0` |
| `0011_friend_rejection_state.sql` | `74f36e4f4d910f160740b63c32a92ca0dacf4180` |
| `0012_plan_presentation_changes.sql` | `d5ab2f0c0138778eebeace828555892bb4bf3fd3` |
| `0013_max_destination_revocation.sql` | `22f1f69bbfef5ad17b290a88faf268af18ba5274` |
| `0014_max_event_launch_refs.sql` | `c8f2351e11fd3e2e0eaa34213833fe8d59ec1dae` |
| `0015_max_notification_outbox.sql` | `abb8976cda81c724828f0db9534829e946331a08` |
| `0016_preferences_version.sql` | `c8f6027f379cbe37b5b6b8277e71d46e097ca78d` |
| `0017_notification_pagination.sql` | `e20ad48e865a8d8430b2cce5f4aa07f19888858d` |

## Reproduction and deferred work

Use Node 24.20.0/npm 11.19.0 and Docker with the repository's pinned PostgreSQL/Redis images. Run `npm ci`, `npm run typecheck`, `npm run typecheck:pure`, `npm run test:unit`, `npm run test:integration:isolated`, `npm run build`, `npm run demo:portfolio -- --smoke`, `npm audit`, `npm run scan:secrets`, `git diff --check` and the release Docker build above. For an interactive local showing use [PORTFOLIO_DEMO](PORTFOLIO_DEMO.md). No MAX account, GigaChat key or pre-existing database is needed. CI uses the same checks; a new source revision needs new evidence.

Deferred K2: durable live AI proposal/quota state and spend limits. Deferred K4: historical MAX revocation ordering. Operational P2/P3: worker/queue readiness, container OS advisories, legacy chat/cache/fan-out cleanup, query performance and provenance maintenance. Telegram migration and portfolio visual design remain future roadmap work. Existing Redis/BullMQ/outbox/governor, historical MAX source, canonical catalog/provenance, product specifications, accepted ADRs, notices and tests are retained. These deferred items do not block the accepted offline snapshot; public hosting needs a separate review.

The secret scan is the existing blob/rule/line-specific pattern scanner over current files and HEAD-reachable history; compressed archive payloads are not unpacked. PASS is evidence of those checks, not recognition of every possible credential format. No new scanner exemption or dependency/tool collection was added.

Superseded sprint execution pointers and duplicate handoffs were removed after consolidating their current facts here. Original detail, vocabulary, command receipts and auxiliary reproduction remain immutable in Git history: [Stability 01](https://github.com/n3onnhowever/The-Boys-Max/blob/0c0c2a528e6daf523a74df0e3c5747482196b5c1/docs/handoffs/POVOD_POSTHACKATHON_STABILITY_01.md), [Correctness 02A](https://github.com/n3onnhowever/The-Boys-Max/blob/0c0c2a528e6daf523a74df0e3c5747482196b5c1/docs/handoffs/POVOD_CORRECTNESS_02A.md), [migration portability](https://github.com/n3onnhowever/The-Boys-Max/blob/0c0c2a528e6daf523a74df0e3c5747482196b5c1/docs/handoffs/POVOD_MIGRATION_CHECKSUM_PORTABILITY.md). Their old stop instructions describe historical checkpoints; the owner's stable finalization request supersedes them.
