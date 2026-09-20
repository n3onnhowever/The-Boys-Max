# UI POVOD V1 state

- Task: production-grade UI foundation and Home / Personal Discovery.
- Baseline SHA: 1e4a7a2b454bed87bdcb40559773143c2fc38c9b.
- Resulting SHA: this file is part of the task commit; resolve as Git HEAD (the exact hash is reported in the final task response).
- Branch / worktree: codex/ui-povod-v1 / D:\Dev\Repos\The-Boys-Max-ui.
- Visual references: input/design/povod-master-ui-v1/01_povod_ui_pack_core_4screens.png through 07_povod_icon_circle_black_red.png.
- Design tokens: warm background/surface, text/muted/border, action red, social violet, dark surface; spacing 2–40; radii 8–999; typography, borders, shadow, controls, icons and safe areas.
- Shared components: AppViewport, Screen, BrandHeader, SearchBar, FilterChip, CategoryChip, SectionHeader, HeroEventCard, EventCardCompact, SaveAction, BottomNav and Skeleton primitives.
- Home: implemented with a server CatalogView adapter plus explicit deterministic DESIGN_FIXTURE preview data; no provider, auth, database, queue or domain contract changes.
- Screenshots: artifacts/ui-povod-v1/home/360.png, 390.png, 430.png and parity-comparison.png.
- Verification: focused Home tests 3/3 PASS; repository unit suite 118/118 PASS; TypeScript typecheck PASS; production build PASS. Exact logs are under artifacts/ui-povod-v1/logs/.
- Remaining parity gaps: supplied raster wordmark has a dark slice while the master screen shows red; generated local event photography matches composition/palette but not the exact reference subjects; system status chrome is intentionally absent per task scope.
- Next recommended slice: Search / structured filters from the second screen in the core reference pack.
