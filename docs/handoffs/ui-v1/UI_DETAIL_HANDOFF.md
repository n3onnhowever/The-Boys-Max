# POVOD UI v1 — Event / Occurrence Detail handoff

## Revisions

- Base SHA: `84ca97d41dd16991359ccdcf39f7c068cfd566b5`
- Result SHA: the `feat(ui): implement Povod event detail` commit containing this handoff. A Git commit cannot embed its own hash; the exact immutable SHA is recorded in the review package `result-sha.txt` and in the task final response.
- Branch: `codex/ui-v1-detail`

## Scope and safety

- Implemented only the Event / Occurrence Detail presentation and deterministic design routes.
- Runtime mapping preserves supplied labels and explicit unknowns. It does not infer an end time, venue, price, coordinates, availability, cancellation, source URL, or event artwork.
- Runtime source links are exposed only after the existing HTTPS origin allowlist accepts them.
- Attendance and interactive Save/Share behavior are present only in the synthetic design fixture. Runtime attendance is absent and unsupported runtime actions remain disabled.
- No provider ingestion, Moscow activation, backend architecture, MAX auth, PostgreSQL, Redis, BullMQ, or `.secrets/` changes.

## Changed files

- `apps/miniapp/src/App.tsx`
- `apps/miniapp/src/main.tsx`
- `apps/miniapp/src/styles.css`
- `apps/miniapp/src/view-model/detail.ts`
- `apps/miniapp/src/design-data/detail.ts`
- `apps/miniapp/src/components/EventDetail.tsx`
- `apps/miniapp/src/components/DetailScreen.tsx`
- `apps/miniapp/src/components/EventHero.tsx`
- `apps/miniapp/src/components/EventDetailSurface.tsx`
- `apps/miniapp/src/components/OccurrenceTimeRow.tsx`
- `apps/miniapp/src/components/VenueRow.tsx`
- `apps/miniapp/src/components/PriceRow.tsx`
- `apps/miniapp/src/components/SourceRow.tsx`
- `apps/miniapp/src/components/DetailActionBar.tsx`
- `apps/miniapp/src/components/AvatarStack.tsx`
- `apps/miniapp/src/components/Icon.tsx`
- `scripts/capture-povod-home.mjs`
- `package.json`
- `tests/unit/detail-view-model.test.ts`
- `docs/handoffs/ui-v1/UI_DETAIL_HANDOFF.md`

## Components added

- `EventHero`
- `EventDetailSurface`
- `OccurrenceTimeRow`
- `VenueRow`
- `PriceRow`
- `SourceRow`
- `DetailActionBar`
- `AvatarStack`
- `DetailScreen` composition shell

## Deterministic routes

- `?design=detail`
- `?design=detail-price-unknown`
- `?design=detail-venue-unknown`
- `?design=detail-source-unavailable`

## Verification

- Focused Detail tests: `node --experimental-strip-types --test tests/unit/detail-view-model.test.ts` — PASS, 6/6.
- Full unit suite: `npm run test:unit` — PASS, 131/131.
- Typecheck: `npm run typecheck` — PASS.
- Production build: `npm run build` — PASS, 174 modules transformed.
- Final screenshots: PASS, six deterministic PNG captures at 844 px viewport height.
- Visual refinement: two inspect/adjust passes completed after the initial implementation.
- `git diff --check`, prohibited-path scan, secret-name scan, and final status are recorded in the packaged `verification.txt` after staging.

## Visual evidence

- `artifacts/ui-povod-v1/detail/360.png`
- `artifacts/ui-povod-v1/detail/390.png`
- `artifacts/ui-povod-v1/detail/430.png`
- `artifacts/ui-povod-v1/detail/390-price-unknown.png`
- `artifacts/ui-povod-v1/detail/390-venue-unknown.png`
- `artifacts/ui-povod-v1/detail/390-source-unavailable.png`
- `artifacts/ui-povod-v1/detail/parity-comparison.png`

## Remaining parity gaps

- The approved composite supplies a different performer photo. The implementation reuses the repository-approved POVOD concert artwork rather than introducing an unlicensed asset.
- Attendance uses synthetic initial avatars, not photographed people, and is visibly marked `Дизайн-пример`.
- The fixture uses the future date 12 April 2027 instead of reproducing the ended 2025 date.
- The required provenance row is explicit; this makes the light surface slightly denser than screen #3.
- No map link appears because the supplied detail state has no validated coordinates or navigation URL.
- Runtime Save/Share and attendance stay capability-disabled until their owning contracts exist; no UI-only persistence or social truth is invented.
