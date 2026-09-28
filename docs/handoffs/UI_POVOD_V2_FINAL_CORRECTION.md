# POVOD V2 final UI correction — 2026-09-27

## Inputs and revision

- Exact worktree: `D:\Dev\Codex\Worktrees\unified-runtime\The-Boys-Max`. Starting and ending HEAD: `c0235a30195ced23b1cf9934dfe1bf09830e45b4`. Existing uncommitted V2 work was retained; nothing was committed or pushed.
- Authority: latest rerun in the Codex task **POVOD | V2 | Astra Visual & UX Quality Gate** (thread `01a0dfb0-eb11-78a0-8e2f-1da0b224f522`), plus the approved reference map `docs/handoffs/UI_V2_REFERENCE_MAP.md`. The rerun closed earlier P0 and most P1, and identified sticky headers, cancelled-plan event detail, duplicate friendship state, Friends navigation, and focused presentation partials.
- Port 3000 owner preview was verified against this worktree. The served `index.html` matched `dist/miniapp/index.html` after the final build. Migration 0010 was applied to owner preview and isolated integration databases.

## Changes

- Replaced scroll-container-forming viewport/screen overflow with `clip` so existing sticky headers bind to window scroll. Event Detail now also keeps Share and Save in its compact sticky Back header. The New Plan sheet retains internal scrolling and its separate overlay stack.
- Direct Event Detail for an exact source occurrence no longer inherits the current Search filters. The cancelled plan retains its source reference and opens the canonical occurrence; Search list filtering is unchanged.
- Migration 0010 removes bidirectional friendship duplicates, preferring accepted state, and enforces a unique unordered actor pair. Friend-link and request reads prefer accepted state; the concurrent request path returns the persisted state. Friends UI deduplicates defensively, and the Friends bottom tab renders a top-level heading and bottom navigation.
- Home shows an introduction and interest-match reason only when supported by stored interests and actual catalog titles/categories. Search removes empty filter space and labels its sort limitation honestly. Plan cards show actual event, date, role, meeting time, and participant initials when available. Notification rows separate actor/action, plan/event, and relative time. Radius shows browser permission state and a manual city path. Help/About/Account/Privacy now explain existing behavior.
- Added integration regressions for exact occurrence detail behind incompatible Search filters and one friendship state per unordered pair. The Event facts, source, prices, backend API adapters, Save, RSVP and plan edit ownership remain intact.

## Checks actually run

- `npm.cmd run typecheck`: exit 0. `npm.cmd run typecheck:pure`: exit 0. `npm.cmd run test:unit`: exit 0, 285/285. `npm.cmd run build`: exit 0. `git diff --check`: exit 0 (only Git line-ending notices). Targeted private-key/token pattern scan: no matches. Final `git status --short`: previous changes and this correction remain uncommitted.
- `RUN_MAX23_INTEGRATION=1 node --experimental-strip-types --test tests/integration/ui26.test.ts`: exit 0, 6/6 against isolated `max23_test` after migration 0010. `node --experimental-strip-types --test tests/integration/p0-save.test.ts` with `P0_SAVE_TEST_DATABASE_URL`: exit 0, 3/3 against isolated `povod_save_fresh` after migration 0010.
- Browser owner preview at 360×780, 390×844, 430×844 and 1440×900: Home, Plans and Event Detail header top remained 0 px after actual scroll; top-level bottom nav bottom equalled viewport height; no horizontal overflow; desktop viewport width 430 px centered. At 360×780, New Plan CTA occupied y710–756, was the element at its pointer center, and a real pointer click created a plan.
- Browser: Friends bottom tab active with bottom nav and no Back; accepted preview friend appears once with no pending action. Owner-preview DB contains one accepted friendship row and the unique-pair index. Cancelled “Вместе на Медвежий праздник” → “Открыть событие” loaded canonical “Медвежий праздник”, 9 October 11:30, official source and source-controlled facts despite the active Кино Search filter. Event header stayed visible after scroll. Search, Home, Notifications, Radius/manual city, and Help were reviewed in the rebuilt preview. No duplicate React-key errors appeared in browser logs.

## Contract delta, limits, next action

- Additive migration 0010 changes friendship pair uniqueness and cleans preexisting contradictory rows. Event Detail read behavior changes only for an explicit canonical occurrence reference; ordinary Search remains filtered. No provider, live MAX, LLM, hosting, or infrastructure changes.
- NOT_RUN: production browser, live MAX integration, deploy, provider ingestion, location permission grant, and an independent third Astra rerun. The previous P0 sheet pointer checks at 390×844 and 430×844 remain valid; this pass repeated the real CTA click at 360×780 after the overflow correction.
- Known scope limits: Map, unsupported cities, additional sort orders and native MAX handoff remain labelled as future. Real events without source images use category artwork. The owner should review `http://127.0.0.1:3000/?owner-preview=1` and alternate `?owner-preview=friend` before acceptance. Keep the checkout uncommitted.
