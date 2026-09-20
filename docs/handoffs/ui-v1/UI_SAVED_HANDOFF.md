# POVOD UI v1 — Saved handoff

## Revision and inputs

- Worktree: `D:\Dev\Repos\The-Boys-Max-ui-saved`
- Branch: `codex/ui-v1-saved`
- Starting SHA / expected base: `84ca97d41dd16991359ccdcf39f7c068cfd566b5`
- Visual authority: `input/design/povod-master-ui-v1/02_povod_ui_pack_secondary_4screens.png`, screen #1 only.
- The design input is intentionally absent from this clean worktree and was read-only from the main checkout at the same repository-relative path.
- No `.secrets/` content was read. `docs/current/UI_POVOD_V1_STATE.md` was not changed.

## Result

- Added the responsive Saved / `Сохранённое` screen at deterministic preview URL `/?design=saved`.
- Added the centered title, notification control, `Ближайшие` / `Позже` segmented control, dense saved-event rows, red saved hearts, empty state, undo re-save affordance, and persistent BottomNav with the Profile destination active as shown in the approved source.
- Reused `SearchEventViewModel`, `EventCardList`, `SaveAction`, `BottomNav`, current tokens, Onest/IBM Plex typography, and tracked event artwork.
- Added optional event-open and accessible-list-label inputs to `EventCardList`; Search keeps its existing default label, geometry, and non-clickable behavior.
- Added only fast heart press and segmented selection feedback. The existing global `prefers-reduced-motion` override reduces both.

## Files

- `apps/miniapp/src/components/SavedScreen.tsx`
- `apps/miniapp/src/design-data/saved.ts`
- `apps/miniapp/src/view-model/saved.ts`
- `apps/miniapp/src/components/EventCardList.tsx`
- `apps/miniapp/src/components/BottomNav.tsx`
- `apps/miniapp/src/main.tsx`
- `apps/miniapp/src/styles.css`
- `scripts/verify-povod-saved.mjs`
- `tests/unit/saved-ui-state.test.ts`
- `package.json`
- `artifacts/ui-povod-v1/saved/360.png`
- `artifacts/ui-povod-v1/saved/390.png`
- `artifacts/ui-povod-v1/saved/430.png`
- `artifacts/ui-povod-v1/saved/parity-comparison.png`

## Contract and data boundary

- Backend route, schema, MAX auth/session, providers, durable save model, and persistence contracts: **no change**.
- `SavedViewModel` is presentation-only and directly reuses the current `SearchEventViewModel` event projection.
- Deterministic preview content is marked `DESIGN_FIXTURE` and synthetic; it is not provider, price, availability, or future-event truth.
- The design preview exposes selected-event navigation through `onEventOpen`; its local proof updates `#event=<fixture-id>`. The integration owner can bind the same callback to the existing Event route after parallel UI branches are reconciled.
- Remove/re-save behavior is local only in DesignData. Production persistence remains owned by the frozen P0 save semantics and was not redefined here.
- No new palette, dependencies, infrastructure, event providers, or third-party assets were introduced. Existing tracked artwork is reused with Saved-only CSS tonal treatment.

## Parity passes

1. Pass 1 captured 360 / 390 / 430 from the production build into the task visualization area. It established the 65 px header, 40 px segmented control, six 108 px dense rows, saved-heart state, and fixed BottomNav.
2. Pass 2 corrected the screen-source venue spelling and shifted the fourth existing thumbnail treatment from teal toward the approved deep blue, rebuilt, then captured the final required files under `artifacts/ui-povod-v1/saved/`.
3. `parity-comparison.png` uses a normalized content crop of screen #1 beside the final 390 × 844 implementation, matching the established 800 × 884 comparison format.

## Verification

All listed commands exited 0 unless noted.

- Focused tests: bundled Node `--experimental-strip-types --test tests/unit/saved-ui-state.test.ts` — 4 passed.
- Full unit suite: bundled Node `--experimental-strip-types --test <all 9 tests/unit/*.test.ts files>` — 129 passed, 0 failed.
- Typecheck equivalent to the repository script: `node scripts/patch-drizzle-declarations.mjs` then `node node_modules/typescript/bin/tsc --noEmit` — 15 pinned Drizzle corrections verified; PASS.
- Build equivalent to the repository script: declaration verification, `tsc -p tsconfig.build.json`, `node scripts/copy-assets.mjs`, then `vite build apps/miniapp` — 166 modules transformed; PASS.
- Browser interaction smoke: `POVOD_SAVED_VERIFY_URL=http://127.0.0.1:<preview-port> node scripts/verify-povod-saved.mjs` — initial 6, later 2, remove 1, undo 2, event hash `#event=design%3Asaved%3Abikini-kill`; PASS with reduced-motion emulation.
- Capture pass 1: `node scripts/capture-povod-home.mjs --design=saved --output=<task-visualization>/saved-pass-1 --widths=360,390,430` — PASS.
- Capture pass 2: `node scripts/capture-povod-home.mjs --design=saved --output=artifacts/ui-povod-v1/saved --widths=360,390,430` — PASS.
- Home/Search regression guard: rebuilt 390 px captures have exact SHA-256 matches with `artifacts/ui-povod-v1/home/390.png` and `artifacts/ui-povod-v1/search/390.png`; no visual change.
- Final `git diff --check`, prohibited-file scan, secret-pattern scan, and status are recorded in the delivery archive's `verification.txt`.

The worktree had no local `node_modules`. For offline checks, an ignored temporary junction pointed to the main checkout's installed tree only after comparing all 167 package-lock entries and confirming zero resolved-version differences. Remove the junction before delivery.

## NOT_RUN / unavailable dependencies

- Docker, PostgreSQL, Redis/BullMQ, MAX, live provider, and authenticated API checks: **NOT_RUN_NOT_REQUIRED** for this presentation-only screen.
- Native computer-use browser helper: **BLOCKED_HELPER**, failing before launch with `windows sandbox failed: helper_unknown_error: setup refresh had errors`; the existing headless Chrome/CDP path completed equivalent built-page interaction verification.

## Known parity gaps and risks

- Browser captures intentionally omit the reference device frame/status bar; the comparison normalizes the source to the content viewport.
- The approved source contains distinct performer photos that are not tracked as standalone licensed assets. To avoid importing screenshot crops or third-party media, the screen reuses the current approved concert artwork, so thumbnail subjects differ while size, crop rhythm, and red/mono/blue tonal sequence remain close.
- Minor font rasterization, venue-icon shape, nav height, and row spacing differences remain between the photographed device mockup and Chromium at 390 × 844.
- Production Saved data and event-detail navigation still require integration with the existing persistence/detail owners; this branch deliberately does not invent a parallel save contract or synthetic runtime success.

## Next action

Integration owner: merge the parallel UI branches, bind `SavedScreen` to the existing persisted saves and Event route, retain the supplied `SearchEventViewModel` projection/callback boundary, then rerun the Saved unit, interaction, capture, typecheck, and build checks without altering `docs/current/UI_POVOD_V1_STATE.md` in this wave.
