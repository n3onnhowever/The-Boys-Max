# Amvera hackathon fixes — 2026-09-29

## Inputs and revision

- Source: local extracted `The-Boys-Max-main` under `D:\coal-tuapse\amvera-ready`; this is not a Git checkout, so no starting SHA or Git diff is available.
- Baseline package: `The-Boys-Max-amvera-afisha-max-fix.zip` (full app including curated catalog and MAX launch fix).
- User reports: interests save shows an error, calendar click has no visible effect, second plan participant is shown as “Участник 2”.

## Changes

- Preferences PUT now selects the writable keys and omits GET-only `catalogCoverage`.
- Calendar action opens a Google Calendar event URL through the existing MAX Bridge link wrapper; date, title, place and note are included. A missing end time uses a one-hour draft event, without changing source data.
- Authorized plan presentation now returns display names of active members; the plan UI prefers these to slot labels.
- No schema migration, secret or external AI call was added.

## Verification

- Red tests: missing preferences/calendar helper and absent participant name observed before implementation.
- `npm run typecheck`: PASS.
- `npm run test:unit`: PASS, 312/312.
- `npm run build`: PASS.
- ZIP entries and the four changed source files compared byte-for-byte against the source tree: PASS.
- Live Amvera/MAX behavior: NOT_RUN; requires uploading the new ZIP, a new Amvera build, and testing in the user's account.
- PostgreSQL/Redis integration suite: NOT_RUN; no local test database/Redis was provisioned for this update.

## Contract and next action

- `/api/v1/plans/:planId/presentation` adds `participantNames`, a map from active member actor ID to display name, only after existing plan access checks.
- The calendar action opens Google Calendar; the user must confirm adding the draft event there.
- Upload `The-Boys-Max-amvera-fixes.zip` over the existing code, click **Собрать**, then test the three flows in MAX.
- GigaChat remains disabled in this package. The current runtime rejects `AI_EXTERNAL_ENABLED=true`; connecting a provider needs a separate backend adapter and a renewable authorization credential.
