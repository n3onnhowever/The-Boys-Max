# UI POVOD V1 state

- Task: production-grade UI foundation and Home / Personal Discovery.
- Baseline SHA: 1e4a7a2b454bed87bdcb40559773143c2fc38c9b.
- Resulting SHA: this Search / Filter Sheet handoff is part of the task commit; resolve as Git HEAD (the exact hash is reported in the final task response).
- Branch / worktree: codex/ui-povod-v1 / D:\Dev\Repos\The-Boys-Max-ui.
- Visual references: input/design/povod-master-ui-v1/01_povod_ui_pack_core_4screens.png through 07_povod_icon_circle_black_red.png.
- Design tokens: warm background/surface, text/muted/border, action red, social violet, dark surface; spacing 2–40; radii 8–999; typography, borders, shadow, controls, icons and safe areas.
- Shared components: AppViewport, Screen, BrandHeader, SearchBar, FilterChip, CategoryChip, SectionHeader, HeroEventCard, EventCardCompact, SaveAction, BottomNav, Skeleton primitives, SelectedFilterChip, FilterControl, SortTabs, EventCardList, FilterSection and FilterSheet.
- Home parity: hardened against the normalized Master UI Home reference with a red-slice temporary wordmark, measured control/card geometry, corrected rail insets and responsive 360/390/430 captures; no provider, auth, database, queue or domain contract changes.
- Search: implemented with deterministic `?design=search` data, removable applied filters, four structured controls, three sort modes, design-only map affordance, dense saved-event rows and active Search navigation; the server adapter keeps map affordance hidden and does not execute provider queries.
- Filter Sheet: implemented as a full-height reusable overlay with shared filter state, select/deselect, reset, apply, close, subtle motion and a non-functional P1 map toggle; available at `?design=filters` for deterministic capture.
- Screenshots: Home: artifacts/ui-povod-v1/home/360.png, 390.png, 430.png and parity-comparison.png; Search: artifacts/ui-povod-v1/search/360.png, 390.png, 430.png and parity-comparison.png; Filter Sheet: artifacts/ui-povod-v1/filters/390.png and parity-comparison.png.
- Verification: focused Home tests 3/3 PASS; focused Search/filter tests 7/7 PASS; repository unit suite 125/125 PASS; TypeScript typecheck PASS; production build PASS. Exact logs are under artifacts/ui-povod-v1/logs/.
- Remaining parity gaps: the Home temporary wordmark remains 21 px narrower and 3 px taller optically; local event artwork preserves the black/red concert hierarchy but differs in subjects/crops; normalized Search/Filter comparisons omit phone/status/Dynamic Island chrome, and the Filter Sheet's exposed top underlay therefore shows web app content.
- Next recommended slice: Event / Occurrence detail.
