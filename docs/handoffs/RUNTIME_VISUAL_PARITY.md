# Runtime visual parity and demo integration

## Revision and inputs

- Base and clean worktree start: `797fef47a054164fc395705a57a322a0f00d5062`, `D:/Dev/Repos/The-Boys-Max-runtime-visual`, branch `codex/delivery-runtime-visual`. The main checkout was dirty and was not edited.
- Verified and applied: UI functionality `4583ff305924e77f5bb95a49e94fe675bad8d22f` → `39ef9eb`; demo catalog `a9c0cf56ff70ea3226931169dd6f752e2e1ed042` → `5de7653`; deployment/static serving `72200349d6c302d424aef32219b4278964caed32` → `1f43dd0`. Accepted visual authority `6cc7311aa2ad882437946a7970245704527732c6` and `989bfcf53912ea594e12ccb7884f64009cf3ffc2` is already ancestral to the base.
- Shared-file precheck: `App.tsx` and `styles.css` overlap UI/demo; `apps/api/app.ts` overlaps demo/deployment. The UI/demo conflicts were merged by retaining both navigation/controller behavior and demo disclosure. The API static route merged cleanly and retained the demo source route. No blanket ours/theirs resolution was used.
- Final implementation source and log SHA-256 values: `artifacts/runtime-visual-parity/source-hashes.json`. Runtime build and asset hashes: `artifacts/runtime-visual-parity/runtime-receipt.json`.

## Result

- Runtime Search now uses the accepted `SearchScreen`, `FilterSheet`, chips, card list and shell. Its adapter supplies real server state and only the supported date and category actions. The sheet keeps the approved geometry, close treatment, action area and focus trap; the date field remains a native, labeled input. Word search is explicitly unavailable. The submitted search fills the fixed Moscow city/time-zone context if the initial server draft omits it; a real date/category browser run exposed and then verified this correction.
- Home category chips use supported backend category codes. Event labels show Moscow-local day and minute without raw time-zone IDs or seconds, human-readable categories and source freshness. The demo has a compact `Демо-каталог` indicator with the full disclosure in its accessible label. The README states that all six demo records are prepared fiction. Neither live records nor demo records acquire artwork automatically; the approved no-image composition is polished with the existing visual tokens.
- Detail keeps the accepted hero and rows. The long-title hero grows below its Back/Save controls. Demo explanatory sources use a tightly scoped same-origin `/demo/source/<id>` link; normal external sources still require the configured HTTPS origin allowlist. Missing links remain unavailable. Saved uses durable server data in the accepted populated/empty layout; conditional price is shortened on the card and remains complete in Detail. Save/Unsave and rejection remain server-confirmed. Loading, retry, offline and MAX relaunch guidance use POVOD shell and state components.
- Six versioned demo events remain the committed catalog. The live data/provider gate, MAX bot, queue, authentication/session protocol, migrations and API business routes were not changed by the visual restoration. The secure nested Fastify asset route is retained from the deployment input.

## Actual verification

All checks below ran on the worktree, with PostgreSQL `18.6 (Debian 18.6-1.pgdg13+2)` in the dedicated local `povod-runtime-visual-pg` container. Four isolated databases were used: `povod_demo_verify`, `povod_save_fresh`, `povod_save_browser`, and `povod_visual_edges`. Migrations 0001–0006 applied to each. The demo database held six canonical occurrences from `synthetic:povod-demo:v1`. Local test credentials are ignored under `.runtime/` and are not in this handoff. Redis delivery was not exercised.

| Command/check | Exit and result | Evidence |
| --- | --- | --- |
| `npm.cmd ci --ignore-scripts` | 0 | Install output at execution |
| `npm.cmd run typecheck` | 0 | `artifacts/runtime-visual-parity/typecheck.log` |
| `npm.cmd run typecheck:pure` | 0 | `artifacts/runtime-visual-parity/typecheck-pure.log` |
| `npm.cmd run test:unit` | 0; 274/274 after updating the conditional-price presentation assertion | `artifacts/runtime-visual-parity/unit.log` |
| `npm.cmd run build` | 0; Vite production build, 200 modules | `artifacts/runtime-visual-parity/build.log` |
| `node --experimental-strip-types --test tests/integration/demo-catalog.test.ts` with isolated `DEMO_TEST_DATABASE_URL` | 0; 3/3, including live-mode negative control | `artifacts/runtime-visual-parity/demo-integration.log` |
| `node --experimental-strip-types --test tests/integration/p0-save.test.ts` with isolated `P0_SAVE_TEST_DATABASE_URL` | 0; 3/3 | `artifacts/runtime-visual-parity/p0-save-integration.log` |
| `node --experimental-strip-types scripts/demo-browser.mjs` with isolated `DEMO_TEST_DATABASE_URL` | 0; authenticated demo Save/Saved/reload | `artifacts/runtime-visual-parity/demo-browser.log` |
| `node --experimental-strip-types scripts/p0-save-browser.mjs` with isolated `P0_SAVE_TEST_DATABASE_URL` | 0; Save/Unsave, reload, rejected mutation, no false confirmation | `artifacts/runtime-visual-parity/p0-save-browser.log` |
| `node --experimental-strip-types scripts/runtime-visual-parity.mjs` with isolated `DEMO_TEST_DATABASE_URL` | 0; 28 production-build screenshots, authenticated journey and state checks | `artifacts/runtime-visual-parity/browser.log`, `runtime-receipt.json` |
| `POVOD_EDGE_CAPTURE=1 node --experimental-strip-types scripts/p0-save-browser.mjs` on isolated `povod_visual_edges` | 0; fictional long-title/no-image/unknown-price/unavailable-source fixture | `artifacts/runtime-visual-parity/edge-test-fixture.log` and `edge-test-fixture/source-unavailable-long-title-no-image-390.png` |
| Fastify asset check in the runtime capture script | 0; 14 fonts/brand/state/event files, release HTML/JS/CSS MIME and byte hashes, nested asset traversal 404 | `runtime-receipt.json` |
| `git diff --cached --check` | 0 after removing an extra blank line from a captured log | Staged diff check |
| Secret/prohibited-path scan of all 113 paths changed from the base | 0 prohibited paths, 0 unexpected high-confidence secret hits; two reviewed local example/test database URLs | `artifacts/runtime-visual-parity/scan.json` |

The runtime capture script waited for browser fonts and images before each main capture and checked both Onest and IBM Plex Mono loaded. Primary states are 390×844. Home, Search, Filter Sheet, Detail and Saved were also checked at 360 and 430 where relevant; the 390×500 filter/date stress case kept its footer visible. The journey is launch → Home → Search → Filters → Detail → Save → Saved → reopen → reload → unsave. Empty Saved, rejected mutation, loading, error/retry, offline, no image and auth relaunch were captured. The unavailable-source and long-title screenshot comes from a separate fictional test-mode backend fixture, not from the six-event demo catalog. No `SYNTHETIC Save <id>` record is used as presentation evidence.

## Visual comparison and limits

Compared with the accepted coded 390px Search and Filter Sheet captures in `artifacts/ui-povod-v1/integrated/390/`: hierarchy, header/card geometry, Onest/metadata typography, gutters, chip treatment, bottom navigation and sheet footer now follow the same components in preview and runtime. The runtime sheet is shorter because the backend supports only exact date and category. Sort, format, price and map controls from the design preview are absent until supported. Fictional demo events use a shared dark no-image state, so their artwork and content cannot match photographed Master UI fixtures. This is content variation, not a pixel-perfect claim. The compact demo indicator adds a small disclosure absent from live/preview.

No live provider calls, AI, deployment, bot mutation or MAX client interaction were performed. Real MAX Web/Android/iOS launch, native Back, keyboard viewport, session recovery and source-opening acceptance remain **NOT_RUN**. The local browser used a signed synthetic MAX launch and real session exchange, not a MAX client. Live Moscow admission remains blocked by its separate provider/data gate. Next action is a real MAX client pass against an approved hosted runtime after that gate and deployment approvals are resolved.
