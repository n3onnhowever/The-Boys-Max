# POVOD V2 R3 targeted correction and component polish — 2026-09-28

Follow-on micro-polish resolved the asset gap and native validation popup; see `UI_POVOD_V2_MAX_FORM_MICRO_POLISH.md`. The `ASSET_MISSING_MAX` entries below describe the state at this handoff's original checkpoint.

## Inputs, baseline and preview

- Exact checkout: `D:\Dev\Codex\Worktrees\unified-runtime\The-Boys-Max`; HEAD before and after: `c0235a30195ced23b1cf9934dfe1bf09830e45b4`. Existing dirty V2 work was preserved. No snapshot restore, reseed, commit, push or deployment.
- Authority for this pass: `POVOD_R3_targeted_correction_bundle.zip` (`README`, `01_FIX_BRIEF.md`, Astra R3 audit), reattached `POVOD_best_visual_refs_2026-09-26.zip`, `docs/handoffs/UI_V2_REFERENCE_MAP.md`, current implementation/handoffs. Only the mapped reference images listed below were extracted and reviewed.
- Preview: `http://127.0.0.1:3000/?owner-preview=1`; alternate local persona: `?owner-preview=friend`. Listener PID 14808 runs `node dist/apps/api/main.js` from this worktree's owner-preview session. No live MAX mode. Final HTTP 200 HTML equals `dist/miniapp/index.html` (SHA-256 `3F20A3486B3DA3107A34E7013E6E22272833085F2067F1B2CABF7945BB6B794B`), referencing `index-Bo3izNKW.js` and `index-DW1tkc-G.css` from the final build.

## Closure table

| ID / finding | Fix or retained pass | Verification and evidence | Remaining limit |
| --- | --- | --- | --- |
| R3-01 / exact-event Plan blocked by unrelated Search filters, rejection replaced valid detail | PERSONAL exact-occurrence eligibility uses a neutral intent; PLAN_PRIVATE retains explicit filters. Command errors remain in New Plan; draft and Event Detail stay mounted. Required acknowledgements, source/lifecycle/access checks and idempotency retained. | Isolated UI integration 7/7, including new incompatible-filter exact-add APPLIED/REPLAYED regression. Browser rejected late-deadline command kept all draft fields and canonical detail: `final-rejected-draft-390.png`. | Genuine unavailable occurrence still needs a dedicated safe browser fixture. |
| VR3-A / sticky content bled through header | Existing scroll-container fix retained; shared sticky headers now have opaque `#FFFDF8` surface and stacking above content. | Actual Home, Plans and Event scroll at 390: header top 0, opaque, hit-test on header; `after-home-sticky-390.png`, `after-plans-sticky-390.png`, `after-event-sticky-390.png`. | Real device browser chrome/safe area not tested. |
| VR3-B / dark area below light Event | Removed arbitrary Event minimum height and kept the Event surface light through natural content height. | `final-event-detail-390.png` and scroll state `after-event-sticky-390.png`; no dark footer visible. | Owner visual judgment pending. |
| VR3-C / unavailable Event had competing actions | One Back/title/action hierarchy; nested hero actions suppressed. Genuine fallback status belongs inside Detail and unavailable actions are not rendered as enabled controls. | Source review plus normal canonical Detail and cancelled-plan event browser path: `final-event-detail-390.png`, `final-cancelled-original-event-390.png`. | Genuine fallback browser state NOT_RUN without a safe unavailable fixture. |
| POL-01 / icon and action alignment | Existing icon family extended for Copy/Edit; shared hit areas, Invite/Calendar/Save/Back/Close action semantics, direct Copy with “Ссылка скопирована”. MAX remains explicitly labelled. | Pointer click on plan Copy closed sheet with exact success feedback; organizer actions `final-plan-detail-390.png`, share `final-plan-share-390.png`. | **ASSET_MISSING_MAX:** no verified official MAX logo in project or supplied assets. Native MAX destination NOT_RUN. |
| POL-02 / nested red date focus rings | Removed wrapper focus ring and input shadow; one focus outline, neutral pointer border, separate invalid border/message, disabled state. Applied common field family to dates, text, textarea, numeric and editors. | Before `before-date-focus-390.png`; after `final-date-focus-390.png`, invalid/keyboard field `final-date-invalid-390.png`. Real pointer invalid CTA and native date segment selection tested. | Desktop viewport does not verify mobile keyboard. |
| POL-03 / excessive gaps, clipping and single-result grid | Removed Event fixed height; one Home sparse card uses intended card width; Search/Saved results use natural height and wrapping Russian metadata; plan metadata wraps; stepper spacing normalized. | Sparse Home `final-home-sparse-390.png`; one Search result `final-search-result-390.png` (full title, 0 horizontal overflow); plan detail `final-plan-detail-390.png`. 0/1/several states covered by safe preview states and existing tests. | Content scarcity remains truthful; no filler was fabricated. |
| POL-04 / divergent component states | Reused header, button, icon, field, card and sheet families; Filter date input uses shared field class; plan/edit/social actions align with same icon/text rules. | Browser Home/Search/Plan/Edit/Profile/Interests: `final-plan-edit-390.png`, `final-profile-390.png`, `final-interests-editor-390.png`. Typecheck and build pass. | Owner visual acceptance pending. |
| POL-05 / reference composition and artwork | Added real Event preview to share sheet and real plan people context; category artwork follows the same category across card, Saved and Detail. Search results show full metadata; sparse Home remains editorial. | Reference/runtime pairs below; `final-home-sparse-390.png`, `final-search-result-390.png`, `final-plan-share-390.png`. | No event photography, popularity or people invented where source data lacks them. |
| POL-06 / action and scroll quality | Retained contextual navigation, sticky surface, fixed top-level nav and sheet stack. Plan creation errors stay in sheet; direct Copy gives feedback. | Real pointer clicks on New Plan invalid CTA at 360×780, 390×844, 430×844, 1440×900: CTA center hit and footer reachable (`final-date-invalid-*.png`). Search query/filter → Event → Back retained query and chips. | Native MAX handoff, actual mobile keyboard/device safe area NOT_RUN. |

## Representative reference/runtime evidence

Evidence root: `.run-evidence/povod-r3-polish/` (ignored local files; no fabricated product data).

| Surface | Approved reference | Runtime |
| --- | --- | --- |
| Sparse Home and Nearby | `reference/01_home_search_location/01_home_personalized.png`, `03_home_location_denied.png` | `final-home-sparse-390.png`, `after-home-sticky-390.png` |
| Search result and Save | `reference/01_home_search_location/05_search_results_canonical.png` | `final-search-result-390.png` |
| Event Detail | `reference/02_event_saved/01_event_detail_normal.png` | `final-event-detail-390.png`, `after-event-sticky-390.png` |
| Organizer Plan actions | `reference/03_plans/02_plan_detail_organizer_final.png` | `final-plan-detail-390.png` |
| MAX share sheet | `reference/03_plans/12_share_plan_to_MAX.png` | `final-plan-share-390.png` (official MAX icon absent) |
| New Plan date focus/invalid | `reference/03_plans/06_edit_plan_final.png` (field family) | `before-date-focus-390.png`, `final-date-focus-390.png`, `final-date-invalid-390.png` |
| Profile and preferences | `reference/04_social_profile/03_profile_reference.png` | `final-profile-390.png`, `final-interests-editor-390.png` |

## Functional acceptance checks

- `npm.cmd run typecheck`: exit 0. `npm.cmd run typecheck:pure`: exit 0. `npm.cmd run test:unit`: exit 0, 285/285. `npm.cmd run build`: exit 0.
- `RUN_MAX23_INTEGRATION=1 node --experimental-strip-types --test tests/integration/ui26.test.ts` against isolated `max23_test`: exit 0, 7/7. `P0_SAVE_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55489/povod_save_fresh node --experimental-strip-types --test tests/integration/p0-save.test.ts`: exit 0, 3/3. Test-generated changes stayed in isolated databases.
- `git diff --check`: exit 0 (line-ending notices only). Changed/untracked path scan: 69 paths, no prohibited `.env`/key/build/evidence paths; targeted private-key/token pattern scan: no matches. Final `git status --short` remains dirty by design.
- Browser: Home, Search query/chips/back, Event, Saved source path, Plans, organizer/participant views, profile/preferences, Notifications, Friends, cancelled-plan original Event, New Plan rejected draft, plan Copy. Previous passing role/RSVP/Save/friendship checks are retained by the current suites and correction handoffs.

## Visual acceptance and limits

- 390×844 is the primary comparison. Stress checks for New Plan CTA at 360×780, 430×844, 1440×900 confirm pointer center hit, internal sheet scroll and no background navigation interception. Home/Plans/Event scroll and sticky/header hit tests were performed at 390×844. Prior correction handoff records full-screen responsive checks at all four sizes; this pass changed shared surface/focus/card rules and repeated critical sheet checks.
- **Owner visual acceptance remains pending.** These checks establish local functional and visual evidence, not production readiness.
- NOT_RUN: genuine unavailable Event in browser (no safe fixture), native MAX share destination, real mobile keyboard/device safe area, location permission grant, production/live MAX, independent Astra rerun, deploy.
- Known gaps: verified official MAX icon missing (`ASSET_MISSING_MAX`); genuine fallback is code-reviewed but not browser exercised; source events without images use intentional category artwork. Map and additional coverage/sorting remain outside this pass.

## Source fingerprints, changed areas and next action

- SHA-256: `packages/persistence/catalog.ts` `7DAF94E0…9FBC8D`; `apps/miniapp/src/App.tsx` `8134B743…E627B6`; `EventDetail.tsx` `9F559A56…53089711`; `povod-v2.css` `C04CE52D…2B49337`; `V2RuntimePages.tsx` `4AE780F4…9E847BBF`; `styles.css` `554DED5C…16D6D959`; `tests/integration/ui26.test.ts` `7FE35EF6…277EC6F33`.
- This pass changed `packages/persistence/catalog.ts`, `tests/integration/ui26.test.ts`, `apps/miniapp/src/App.tsx`, `components/{EventDetail,DetailScreen,EventHero,DetailActionBar,HomeScreen,FilterSheet,Icon,V2RuntimePages,povod-v2.css,v2-runtime.css}`, `apps/miniapp/src/{styles.css,view-model/saved-runtime.ts}` and this handoff. Earlier dirty V2 files remain intact.
- No new provider, infrastructure, live MAX or backend domain contract. Next action: owner reviews the preview and local evidence; supply a licensed official MAX asset if icon parity is required. Keep work uncommitted until approval.
