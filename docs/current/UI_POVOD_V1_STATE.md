# UI POVOD V1 state

- Task: production-grade UI foundation and Home / Personal Discovery.
- Baseline SHA: 1e4a7a2b454bed87bdcb40559773143c2fc38c9b.
- Resulting SHA: this parity-hardening handoff is part of the task commit; resolve as Git HEAD (the exact hash is reported in the final task response).
- Branch / worktree: codex/ui-povod-v1 / D:\Dev\Repos\The-Boys-Max-ui.
- Visual references: input/design/povod-master-ui-v1/01_povod_ui_pack_core_4screens.png through 07_povod_icon_circle_black_red.png.
- Design tokens: warm background/surface, text/muted/border, action red, social violet, dark surface; spacing 2–40; radii 8–999; typography, borders, shadow, controls, icons and safe areas.
- Shared components: AppViewport, Screen, BrandHeader, SearchBar, FilterChip, CategoryChip, SectionHeader, HeroEventCard, EventCardCompact, SaveAction, BottomNav and Skeleton primitives.
- Home parity: hardened against the normalized Master UI Home reference with a red-slice temporary wordmark, measured control/card geometry, corrected rail insets and responsive 360/390/430 captures; no provider, auth, database, queue or domain contract changes.
- Screenshots: artifacts/ui-povod-v1/home/360.png, 390.png, 430.png and parity-comparison.png.
- Verification: focused Home tests 3/3 PASS; repository unit suite 118/118 PASS; TypeScript typecheck PASS; production build PASS. Exact logs are under artifacts/ui-povod-v1/logs/.
- Remaining parity gaps: the geometry-preserving temporary raster wordmark is 21 px narrower and 3 px taller optically than the normalized reference; compact cards remain 4 px taller; generated local event photography differs in subject; system status chrome is intentionally absent per task scope.
- Next recommended slice: Search / structured filters.
