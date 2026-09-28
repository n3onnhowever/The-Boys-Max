# POVOD V2 systemic geometry pass — 2026-09-28

## Inputs and boundary

- Checkout: `D:\Dev\Codex\Worktrees\unified-runtime\The-Boys-Max`; starting and final HEAD `c0235a30195ced23b1cf9934dfe1bf09830e45b4`. Existing uncommitted V2 work was retained. No commit, push, deploy, data reset, backend, navigation, copy, color, font, or domain change.
- Authority: the approved `POVOD_best_visual_refs_2026-09-26.zip`, `docs/handoffs/UI_V2_REFERENCE_MAP.md`, and the current V2 components. Only the six mapped reference surfaces needed for geometry were opened. Runtime screenshots use owner preview data; fictional preview event facts were not treated as design requirements.
- Owner preview: `http://127.0.0.1:3000/?owner-preview=1`. Port 3000 returned HTTP 200 and served final `index-DNlLi2Su.js` / `index-De2ka6wG.css`.

## Compact spacing roles

The existing `--povod-space-1…9` scale remains 2, 4, 8, 12, 16, 20, 24, 32, 40px. Geometry uses these values rather than another token family.

| Role | Existing token/value | Application |
| --- | --- | --- |
| Page horizontal gutter | `--povod-screen-gutter = --povod-space-6` = 20px | Home, Search/results, V2 content, sheets, Filters |
| Compact vertical gap | `--povod-space-3` = 8px | Chips, field label, compact metadata |
| Normal vertical gap | `--povod-space-4` = 12px | Rows, action stacks, card-to-card, form fields |
| Section gap | `--povod-space-6` = 20px | Home sections and V2 content groups |
| Card internal padding | `--povod-space-5` = 16px | Plan, summary, shared content cards |
| Card-to-card gap | `--povod-space-4` = 12px | Plan list and compact event rail |
| Row height/padding | 60px minimum / `--povod-space-3` = 8px | Settings and Friend rows; Notifications grow naturally |
| Icon-to-label gap | `--povod-space-3` = 8px | PovodButton |
| Chip gap | `--povod-space-3` = 8px | Filter, selected and V2 chip groups |
| Field group gap | `--povod-space-4` = 12px | Plan Edit and shared label/input groups |
| Sheet section gap | `--povod-space-4` = 12px | Sheet heading, preview and action groups |
| Action-button stack gap | `--povod-space-4` = 12px | Shared action stacks and two-column rows |
| Safe bottom padding | `--povod-space-7` = 24px minimum | Above fixed bottom nav and within sheets; nested page 32px |

The existing 78px fixed nav height remains. Full-bleed hero/art rails and natural notification/card heights are intentional exceptions. Plan cancellation receives an additional 8px separation from ordinary actions. Filters retains a full-height sheet with a fixed footer; its bottom padding now respects at least 24px and the device inset.

## Changes

- Shared `--povod-screen-gutter` now aligns legacy Home/Search/Event cards with V2 20px content.
- V2 App/Back headers, shared buttons/chips, Settings rows, sheet sections, EmptyState, section/card/action/form groups use the existing scale. Top-level content retains 24px clearance before the fixed nav rather than reserving 105px.
- Plan cards, EventSummary, Friend/Notification rows, detail rows, two-column join actions and edit fields use shared gaps/padding. The Plan Detail cancellation control has deliberate separation.
- Legacy Home rails/sections, Search/Saved list dividers, Event Detail action clusters and Filters sheet/header/footer use the same geometry roles.
- No action handlers, form semantics, event facts, plan semantics, backend contracts, or navigation destinations changed.

## Representative visual evidence

Evidence root: `.run-evidence/povod-geometry/`. Each before/after pair is the same surface at 390×844, with comparable scroll position and content.

| Surface | Before | After | Observed correction |
| --- | --- | --- | --- |
| Home | `before-home-390.jpg` | `after-home-390.jpg` | Intro, search, chips, hero and sections share the 20px gutter. |
| Search | `before-search-390.jpg` | `after-search-390.jpg` | Header, filter controls and result cards align; list dividers follow artwork. |
| Event Detail | `before-event-detail-390.jpg` | `after-event-detail-390.jpg` | Primary/secondary action separation is 12px; same preview occurrence. |
| Plan Detail actions | `before-plan-actions-390.jpg` | `after-plan-actions-390.jpg` | CTA stack uses 12px, cancellation has extra separation. |
| Notifications | `before-notifications-390.jpg` | `after-notifications-390.jpg` | Row padding and icon/text alignment are consistent; actual context retained. |
| Profile | `before-profile-390.jpg` | `after-profile-390.jpg` | Preference rows align and last content has normal nav clearance. |

Additional sweeps: `sweep-filters-390.jpg`, `sweep-saved-390.jpg`, `sweep-radius-390.jpg`, `sweep-settings-390.jpg`, `sweep-friends-390.jpg`, `responsive-home-1440.jpg`. Best-reference paths are in `UI_V2_REFERENCE_MAP.md`.

## Verification

- Browser: 360×780, 390×844, 430×844, 1440×900. Home/Plans/Plan Detail headers remained at top after scroll with an opaque `#FFFDF8` surface; bottom nav remained fixed on top-level pages. Desktop shell remained centered at 428px. No positive horizontal overflow in inspected screens/sheets.
- Share sheet action center hit the intended MAX button at all four viewport sizes; Plan Edit Save center was reachable through internal sheet scroll at all three mobile sizes. New Plan Create center remained reachable and unobstructed at 360/390/430; its enabled state after acknowledgement was confirmed without submitting a plan. Filters fixed footer action center hit its button at 360×780. Sheet scrolling and background-nav separation stayed intact.
- Inspected Home, Search, Filters, Event Detail, Saved, My Plans, Plan Detail, Plan Edit, Share to MAX, Friends, Notifications, Profile, Settings, Interests, Budget, Time, Radius. Browser screenshots confirm no visible clipped labels, button collision, or abrupt large gap in the representative surfaces. The Filters sheet intentionally has open space below its short content.
- `npm run typecheck`: exit 0. `npm run typecheck:pure`: exit 0. `npm run test:unit`: exit 0, 285/285. `npm run build`: exit 0 after final CSS edit. Isolated `tests/integration/ui26.test.ts` on `max23_test`: exit 0, 7/7. `git diff --check`: exit 0 after final edit (line-ending warnings only). Targeted secret-signature scan of geometry files: no matches.
- Fingerprints: `tokens.css` SHA-256 `2F339244CF49E8877D7CA364168DBA4B687D2B9C98E36370D569769DC7E5262B`; `styles.css` `DE919FDE403431DB04D1C29F32F64C84FADAA0D6938B7D997530F1DF5F424522`; `povod-v2.css` `028668A5019A3AB7A921681EB83637AAE8F45AB1BE54B72D8976BF2C1FE59C44`; `v2-runtime.css` `7E0888F74E708153B2C769511218B69C52EB7A9F3CDFD46A599C52791DA958A0`; served CSS `FCBA60D5375405DCABCCBB80950C075973B657F7BF98893F1AADE2E04AFFAD8E`.

## Limits and next action

- NOT_RUN: real mobile keyboard/device safe-area measurement, native MAX handoff, independent Astra gate. Desktop browser viewport overrides establish responsive geometry only.
- Current data has prior audit-created plans/notifications; no data was created in shared owner preview during this pass. Integration tests used isolated test data.
- Next action: owner/independent Astra visual review on port 3000. This geometry pass alone does not claim production readiness.
