# UI delivery completion

Base: `797fef47a054164fc395705a57a322a0f00d5062`. Isolated worktree: `D:\Dev\Repos\The-Boys-Max-ui-delivery`, branch `codex/delivery-ui-completion`. The source checkout was dirty at start and was left untouched. Inputs: `AGENTS.md`, `docs/tasks/ACTIVE_TASK.md`, `docs/handoffs/P0_INTEGRATION_CHECKPOINT.md`, `docs/handoffs/UI_POVOD_V1_INTEGRATED.md`, `docs/current/UI_POVOD_V1_STATE.md`, current controller/routes/view models and the existing CDP scripts.

## Controls and states

- Home search opens the runtime Search screen. Its text field is read-only because the current API rejects word searches; the screen says so. Category chips continue to issue real server searches.
- Search exposes only supported date and category fields. Apply/reset use the existing `SEARCH` command and server-owned query; reopening the sheet restores server-confirmed filters. Search cards open exact Detail, Back returns to Search, and the active navigation marker follows the origin. Filter failure stays on Search with retry and editable fields.
- Detail Save remains disabled until occurrence resolution confirms its target. Save/unsave changes the icon only after the mutation response. Source links use the existing allowlist; missing links remain unavailable. Runtime long titles expand the hero without covering Back/Save. No-image keeps the accepted dark hero.
- Saved keeps navigation visible during load/error, retries in place, exposes empty Saved, reopens exact occurrences, and refreshes after Back from Detail. Failed mutations keep the prior state. Unsupported Plan/Friends controls stay disabled with an unavailable explanation; no social or preference persistence is implied.
- A same-route catalog refresh may display only previously authenticated in-memory cards while offline. With no cache, the state says that connection is required. Runtime offline copy calls prior cards "previously loaded" rather than saved. The accepted design-preview offline copy and artwork remain unchanged. Expired/auth-failed sessions instruct the user to relaunch from the MAX bot.

Shared frontend edits: `App.tsx`, `BottomNav.tsx`, `DetailScreen.tsx`, `EventDetail.tsx`, `EventsList.tsx`, `HomeScreen.tsx`, `HomeSystemScreen.tsx`, `SaveAction.tsx`, `SavedRuntime.tsx`, `SearchBar.tsx`, `core/controller.ts`, `view-model/system-state.ts`, and `styles.css`. New runtime-only screen: `RuntimeSearchScreen.tsx`. Focused test edits: `scripts/p0-save-browser.mjs` and `tests/unit/ui-delivery-controller.test.ts`. No API, schema, auth, dependency, provider or deployment file changed. No demo catalog data/provenance was added.

## Verification on this worktree

All commands below exited 0 on the source above. The authenticated browser test used synthetic data, an isolated PostgreSQL database `povod_save_browser`, isolated Redis, and the production build. Existing migrations 0001–0006 were applied only to that test database; no migration file changed.

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test:unit` | 270/270 PASS |
| `npm.cmd run build` | PASS; 198 modules; output `dist/miniapp` |
| `P0_SAVE_TEST_DATABASE_URL=postgres://.../povod_save_browser node --experimental-strip-types scripts/p0-save-browser.mjs` | PASS: authenticated empty Saved, Search filter apply/reset, Search→Detail→Back, Detail Save→Saved→reopen→unsave/resave→Back/reload, rejected mutation unchanged, unauthenticated launch guidance |
| `POVOD_CAPTURE_URL=http://127.0.0.1:4183/ npm.cmd run verify:integrated` | PASS: eight accepted design-preview browser groups |
| `git diff --check` and scope/secret scan | PASS at handoff |

The authenticated harness checked horizontal overflow at 360/390/430 px, a 390×500 focused date input with both filter actions visible, reduced-motion transition duration `0s`, and long Detail title clearance. Screenshots are in `artifacts/ui-delivery/`: `search-{360,390,430}.png`, `filters-keyboard-390.png`, `saved-empty-390.png`, `saved-detail-390.png`, and `launch-guidance-390.png`. They are synthetic test captures, not real MAX-client evidence. The existing preview browser audit was regenerated during verification and restored to its tracked version because no approved preview artifact changed.

Source anchors used for the final production build: `App.tsx` SHA-256 `C73E1F1A65849EEB1F7A8525C3F8F44C286D5BD8AB62EA3D5FA84FEE3AF8CA88`; `RuntimeSearchScreen.tsx` `470782CA620BEC7AE19D45DBC9FDB4E253093B2C387B07652E7B56758B78767A`; test harness `p0-save-browser.mjs` `573F69114A71175643DC2928F958B7C63733020575A8A95DAF39F87F259D4607`. The final build `index.html` SHA-256 is `8A0C87A3FF6B848BBFDFF5F8A9D7AF235B60742112B7AC72D923CF79726AA9B2`.

## Remaining acceptance gaps

Real MAX client launch, native Back, keyboard viewport, session-expired reauthentication, and external source opening were not run. The browser harness is not MAX acceptance. Runtime offline-with-cache is covered by the controller unit test and the accepted offline preview; no durable offline cache was added. Live Moscow data remains blocked by the separate provider/data gate. Word search, Friends, external service linking, and profile preference persistence remain unavailable. Next action: real MAX client acceptance with approved live data when its gate opens.
