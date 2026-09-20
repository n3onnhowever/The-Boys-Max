# POVOD UI v1 — integrated state

- Status: **PASS — parallel UI wave integration and visual regression** (2026-09-20).
- Branch: `codex/ui-v1-integrated`; worktree: `D:\Dev\Repos\The-Boys-Max-ui-integrated`.
- Integration base: `84ca97d41dd16991359ccdcf39f7c068cfd566b5`.
- Final integrated implementation SHA: `14528e10a9a855fab661bdef23228b1c69903354`. The following delivery commit contains only canonical documentation and evidence; its immutable HEAD is recorded in the package `RESULT_SHA.txt` and final response.

| Source | Accepted SHA |
|---|---|
| Detail | `a6f8cc4c259bab62937e260ac4f68a0b8534b4a9` |
| Saved | `fa27796e9d79ad2fd207e96f5d68f44246d9c10a` |
| Profile | `ba184df44aa3beefc9722f5c3cb7d8bc1b1a2f71` |
| Plans | `cb278a70cd66c7e4c3e810dd57733e41510aeecc` |
| States | `b5b1c423f5ce18290ba927cefa1146b8e9a417a6` |

- Screens: Home, Search, Filter Sheet, Event Detail (including price UNKNOWN, venue UNKNOWN and source unavailable), Saved, Profile / Preferences, My Plans, Plan Detail, Loading, Empty, Error, Offline. Solo and empty-discussion Plan Detail states are also explicitly routable.
- Shared system: unchanged `design/tokens.css`, one 28-glyph Icon, capability-aware BottomNav, AppViewport/Screen, EventCardList/SaveAction, Detail primitives, participant primitives, one scoped stylesheet and one CDP capture helper. No dependencies or lockfile changes.
- Routing: exact `?design=` allowlist in `view-model/design-preview.ts` dynamically loads `DesignPreview.tsx`; unknown/missing values enter normal runtime. Preview transitions preserve selected event/plan identity.
- Profile: **Связанные сервисы**, fixture set **VK + monochrome OK + add**. All three controls are disabled placeholders; no OAuth/linking/Telegram integration. Runtime shows a service only for an explicitly supplied `SERVER_ADAPTER / CONNECTED` record.
- Navigation: Saved remains a Profile subsection; its active Profile state is preserved. A bookmark in the existing left Profile header slot opens Saved in preview. Detail inherits Home/Search/Profile/Plan from its origin. Friends remains unavailable; Plans is enabled only by the preview navigation capability.
- Fixture boundary: all people, prices, dates, attendance, RSVP/discussion, avatar and service placeholders stay within explicit previews; local actions never call the API or imply persistence. No fixture URL is opened. Normal runtime never loads the DesignPreview data chunk; three browser negative controls pass. Runtime Detail keeps unknowns and allowlisted source URLs; Offline accepts only supplied cached records.
- Visual authority: the three approved Master UI packs, unchanged. Evidence: `artifacts/ui-povod-v1/integrated/{390,360,430}/`, `POVOD_UI_V1_FULL_MONTAGE.png`, `POVOD_UI_V1_MASTER_COMPARISON.png`. 37 PNGs: 32 required captures plus three Detail and two Plan Detail variants.
- Regression: 20/32 primary PNGs exactly match accepted slice evidence. Remaining differences are Profile/OK/navigation affordance, Detail active Home, normalized plus glyph and 92/26 changed Home pixels at 360/430; no layout regression. Both branded state PNGs retain their original hashes and paths.
- Checks: focused **39/39**, full unit **154/154**, typecheck **PASS**, pure typecheck **PASS**, production build **PASS** (193 modules), diff check **PASS**. Eight browser interaction groups, three fixture negative controls, 360/390/430 layout checks and reduced motion **PASS**. Final build matches all six captured build-file hashes. Exact commands/receipts: `artifacts/ui-povod-v1/integrated/VERIFICATION_SUMMARY.json`.
- Concrete remaining gaps: reference artwork/portraits still differ where accepted slices use existing artwork or initials; the temporary wordmark and raster state assets retain their previously accepted optical differences. Persisted Save/Saved, real profile preferences and social delivery are not newly wired by this UI wave; unavailable runtime capabilities remain disabled.
- Next integration slice: connect the existing persisted Save/Saved P0 contract to the accepted Saved/Detail presentation, with authenticated data and source-opening checks.

[Integration handoff](../handoffs/UI_POVOD_V1_INTEGRATED.md)
