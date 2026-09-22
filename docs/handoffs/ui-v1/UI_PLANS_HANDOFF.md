# POVOD UI v1 — Plans pack handoff

## Result

Implemented the approved frontend-only POVOD Plans pack:

- `?design=my-plans` — nearest plan, other plans, existing event artwork, dates/times, venues, participant previews, RSVP pills, and active Plans `BottomNav`.
- `?design=plan-detail` — event summary, personal plan, participant statuses, invite affordance, lightweight discussion/composer, and active Plans `BottomNav`.
- Deterministic `DESIGN_FIXTURE` data covers a solo plan, a four-participant plan, `HOST` / `GOING` / `THINKING` participant states, `GOING` / `THINKING` / `SOLO` RSVP states, and populated/empty discussion states.

No backend, MAX auth, database, queue, provider, migration, or frozen-scope contract was changed. Invite and discussion behavior is local preview UI only; no chat or social runtime was added. The existing solo-first runtime journey remains unchanged and does not depend on these screens.

## Inputs and revision

- Worktree: `D:\Dev\Repos\The-Boys-Max-ui-plans`
- Branch: `codex/ui-v1-plans`
- Starting revision: `84ca97d41dd16991359ccdcf39f7c068cfd566b5`
- My Plans reference: `input/design/povod-master-ui-v1/02_povod_ui_pack_secondary_4screens.png`, screen 2 (read-only from the supplied sibling workspace copy).
- Plan Detail reference: `input/design/povod-master-ui-v1/01_povod_ui_pack_core_4screens.png`, screen 4 (read-only from the supplied sibling workspace copy).
- Final commit: recorded in the delivery archive `result-sha.txt` and final response after commit creation.

## Implementation notes

- Reused the existing POVOD shell, token file, `BottomNav`, local event artwork, Onest/IBM Plex Mono fonts, and mobile viewport conventions.
- Red is limited to actions/active navigation. Violet is limited to participant/social state indicators. Going remains green; solo remains neutral.
- Status chips and action affordances use short token-driven transitions. The existing global `prefers-reduced-motion: reduce` rule collapses all animations/transitions.
- Participant portraits use deterministic initial avatars because this revision contains no licensed participant portrait asset set.
- The discussion composer only appends to local component state in the design preview. It performs no delivery, persistence, membership, or authorization work.

## Visual evidence

- `artifacts/ui-povod-v1/plans/my-plans-360.png`
- `artifacts/ui-povod-v1/plans/my-plans-390.png`
- `artifacts/ui-povod-v1/plans/my-plans-430.png`
- `artifacts/ui-povod-v1/plans/plan-detail-360.png`
- `artifacts/ui-povod-v1/plans/plan-detail-390.png`
- `artifacts/ui-povod-v1/plans/plan-detail-430.png`
- `artifacts/ui-povod-v1/plans/my-plans-comparison.png`
- `artifacts/ui-povod-v1/plans/plan-detail-comparison.png`

Four parity passes were completed:

1. Initial 390px structure pass established hierarchy, card layout, statuses, discussion, and fixed navigation.
2. 360/390/430 pass restored the missing Plan Detail event border and changed add-plan to the action token.
3. Density pass enlarged secondary-plan thumbnails/cards and discussion rows to track the references without navigation overlap.
4. Final pass regenerated all requested widths and comparisons from the verified production build after enforcing violet-only-for-social-state styling.

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Targeted Plans UI | `node --experimental-strip-types --test tests/unit/plans-ui.test.ts` | PASS, 5/5 |
| Full unit suite | `npm run test:unit` | PASS, 130/130 |
| Typecheck | `npm run typecheck` | PASS |
| Production build | `npm run build` | PASS, Vite 170 modules |
| Browser captures | `node scripts/capture-povod-home.mjs` for both routes at `360,390,430` | PASS, 6 screenshots |
| Comparisons | local `System.Drawing` reference-crop composition | PASS, 2 PNGs |
| Whitespace | `git diff --check` | PASS |
| Protected-path scan | changed-path allowlist excluding backend/auth/DB/queue/`.secrets` | PASS |
| Secret heuristic | added-text scan for private keys and common live-token formats | PASS |

Exact command output is stored under `artifacts/ui-povod-v1/plans/verification/`.

Docker, PostgreSQL, Redis, MAX, provider, and live social delivery checks were **NOT_RUN** because this is a frontend design-preview ticket and none of those systems changed. Headless Chromium browser rendering was executed for every requested capture width.

## Contract deltas

None. No HTTP contract, persistence schema, migration, queue, auth/session behavior, domain rule, dependency, or runtime route was changed. The two preview routes are selected only by the existing `?design=` mechanism.

## Parity gaps and risks

- Reference portraits are represented by deterministic initial avatars; adding photographic portraits requires an approved/licensed asset source.
- Comparison crops normalize away the iOS status bar, Dynamic Island, and device frame; implementation captures are the actual 390 × 844 application viewport.
- Some event-image crops differ because implementation deliberately reuses the repository's approved event artwork rather than extracting pixels from the visual references.
- All people, messages, RSVPs, dates, and venues in these two previews are synthetic design data and must not be treated as membership, attendance, availability, or delivery truth.

## Next action

Integration owner can review the committed screenshots and comparison PNGs, then merge the isolated UI commit if accepted. Do not infer backend social requirements from this pack, and do not update `docs/current/UI_POVOD_V1_STATE.md` from this parallel wave.
