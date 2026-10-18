# Correctness 02A engineering handoff

Input: owner's K1/K5 request, 2026-10-19. Accepted base: `dca0036bb3a39f7a099c923d7dfd32e03e891b00` (Stability 01 / PR #3). Executable source revision: `1294c1b6f9643c512589e26dc2b968f63cd3c85f`; subsequent checkpoint documentation does not change executable source. Worktree: `D:\Dev\Codex\Worktrees\povod-correctness-02a\The-Boys-Max`, branch `codex/posthackathon-correctness-02a`.

## K1 language and acceptance contract

The old evidence checks were one-directional: proposed constraints needed matching substrings, but requested constraints could disappear. Substrings also confused negation and `послезавтра` with `завтра`.

`modules/ai/smart-language.ts` now recognizes a bounded vocabulary, then `smart-occasion.ts` requires equality between requested and proposed hard fields. Missing/changed/invented constraints fail closed. Unconsumed expressions produce an explicit clarification with an empty, non-applicable draft. The provider schema/version, configuration and review-before-apply flow remain unchanged; the GigaChat prompt reinforces these rules.

Supported combinations:

- `сегодня`, `завтра`, `на выходных` / `выходные`, or one explicit ISO date; resolved from the injected proposal clock in Europe/Moscow. Weekend means Saturday–Sunday, or Sunday only when today is Sunday.
- `утром`, `днем` / `днём`, `вечером` with a date.
- Positive category vocabulary for the existing categories: кино/фильм, театр/спектакль, концерт/музыка, выставка/музей, спорт/матч, прогулка/парк, волонтёр, другое. A category cannot silently become only a soft interest.
- `бесплатно` / `бесплатн…` / `даром`; or `до`, `не дороже`, `не больше`, `максимум`, `бюджет` plus an integer ruble cap (optional руб/рубля/рублей/₽).
- Москва/Moscow; `вдвоём`, `на/для двоих`, `на/для троих`, `на/для N человек(а)`. Multi-person budgets retain the existing mandatory total/per-person clarification.

Exclusions, negated free/date conditions, weekday phrases, `послезавтра`, alternatives, multiple dates, clock times, unknown wording/currencies/cities and contradictory conditions cannot become unconstrained Search. Night requests also clarify: the current UI draft cannot round-trip a midnight-crossing window. SearchIntent already supports manual category exclusion; SmartIntent v1 has no exclusion field, so this sprint does not expand the provider schema. Санкт-Петербург gets the existing unsupported-city clarification.

Tests cover every supplied phrase, omission/mutation/invention, negated categories/free, token boundaries, Moscow midnight/weekends and ISO dates. The deterministic stub-provider contract test traverses text → proposal validation → session-bound acceptance → UI draft → actual SearchIntent → factual eligibility. Wrong city/date/price fail; UNKNOWN price remains UNKNOWN. Synthetic data only; no external AI calls.

## K5 reminder eligibility and concurrency

The old reminder path equated an ACTIVE slot with eligibility and ignored `plan_rsvps.state='NO'`.

`packages/persistence/delivery.ts` excludes NO at creation, reconciliation, reservation and final pre-wire validation. Declines remain effective across presentation revisions. Reconciliation cancels obsolete queued rows without deleting them. Existing deduplication keys, attempts, outbox recovery and UNKNOWN handling remain in use.

`social.ts` serializes RSVP writes using the existing Plan row. Scheduling acquires a shared Plan lock and reads eligibility in a fresh statement. Final reminder validation holds a shared Plan lock through the transport call, ordering it against RSVP/roster/cancellation/material edits. MAX transport already has an 8-second deadline; an affected Plan edit can wait for that bounded call. An uncertain submission already started stays UNKNOWN and is never converted to safe retry by a later NO.

Existing policy is preserved: active-slot organizer, YES, MAYBE and unanswered participants remain eligible subject to the existing lifecycle/version/preference checks; a nonparticipating organizer gets no participant reminder. NO suppresses even for an active organizer. A stale YES still uses the separate existing reconfirmation flow; a reminder does not confirm attendance or semantic terms.

Known-declined actors receive no new in-app reminder. Existing reminder rows remain stored but are excluded from their notification list and unread count. Membership, Plan state/history and other notifications remain intact. Foreign-actor and stale-version guards are unchanged. No migration or new RSVP state.

The PostgreSQL/Redis tests cover NO before scheduling, YES→NO after enqueue, independent reservation/pre-wire checks, repeated reconciliation, stale RSVP versions, meeting edits, cancellation/removal before and during governor wait, organizer/participant policy, scheduling concurrent with decline, and an in-flight UNKNOWN outcome concurrent with RSVP.

## Local verification

All commands executed on Windows with Node 24.20.0/npm 11.19.0; PostgreSQL 18.6 and Redis 8.2.9 use the existing isolated, pinned-image harness. Docker Desktop was started locally. Logs, exact exits, source fingerprints and log hashes are private local evidence outside tracked source.

| Command/check | Actual result |
| --- | --- |
| `npm ci` | exit 0, clean lockfile install |
| `npm run typecheck` / `npm run typecheck:pure` | exit 0 / 0 |
| `npm run test:unit` | exit 0; 359 passed, 0 failed/skipped |
| `npm run test:integration:isolated` | exit 0; 119 passed, 0 failed/skipped |
| Historical catalog + present-day expiry/rights | PASS in the complete integration suite; original 167 LIVE + 48 DEMO records preserved |
| `npm run build` | exit 0 |
| `npm run demo:portfolio -- --smoke` | exit 0; isolated offline HTTP journey, synthetic actors/TestTransport |
| `npm audit` | exit 0; 0 vulnerabilities |
| `npm run scan:secrets` | exit 0; current files + reachable history, no findings/prohibited paths |
| `git diff --check` | exit 0 |
| `docker build --target release --build-arg SOURCE_SHA=1294c1b6f9643c512589e26dc2b968f63cd3c85f -t povod:posthackathon-correctness-02a .` | exit 0; local release image only |

No required local check is blocked or skipped. Real MAX/GigaChat/provider calls and deployment are intentionally NOT_RUN. Hosted CI is a separate publication gate; this local handoff does not claim a hosted result.

Protected source/data/UI/dependency/deployment paths have no diff from the accepted base. Original checkout status and tracked-diff hash match the starting record; Stability worktree remains clean at the base SHA. Main, historical tag and the existing private bundle are unchanged.

Remaining limits: bounded AI language rather than a general Russian parser; short Plan lock during reminder transport; the existing process-local AI proposal/quota state. Deferred: K2, K4, K6, K7 and the owner's listed integrations/refactors/hosting work. Next action: draft PR stacked on Stability 01, exact-head hosted CI verification, then stop before 02B; no merge/tag/deploy.
