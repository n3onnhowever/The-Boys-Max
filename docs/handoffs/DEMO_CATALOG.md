# Demo catalog delivery

## Inputs and revision

- Starting commit: `797fef47a054164fc395705a57a322a0f00d5062`; isolated worktree `D:/Dev/Repos/The-Boys-Max-demo`, branch `codex/delivery-demo-catalog`. The shared checkout had pre-existing changes and was not edited.
- Read: repository `AGENTS.md`, `docs/tasks/ACTIVE_TASK.md`, `P0_INTEGRATION_CHECKPOINT`, T105 implementation, Save and catalog handoffs, and current source authority. This is the owner's explicit demo task after the integration checkpoint.
- Scope addendum: [DEMO_DELIVERY_SCOPE_ADDENDUM.md](../current/DEMO_DELIVERY_SCOPE_ADDENDUM.md). The original freeze and T104 gate evidence were not edited.
- Source SHA-256 manifest for verified implementation/tests: `artifacts/demo-catalog/verification-sources.sha256` (local artifact). Key entries: `catalog-v1.ts` `70b338287c19aa4641b8159bc5b21b9872a9aae6770eeaff80bc20b941edd209`, `seed.ts` `9f8fe76e54212da1aa7d61874a969ec7f973bbce0156709207a0036351eb4601`, `catalog.ts` `a49486a875b8361e3856b486761dddc1c1f79ab7cdc27965b0a0e46c80484098`, `saved.ts` `c5077836466fb81e8a70991c31088228d90410752030d3cfee0ef078787694c5`.

## Result and contracts

- `APP_MODE=demo` and `DEMO_CATALOG_VERSION=v1` explicitly select the synthetic catalog. `npm run seed:demo` is an operator command; there is no startup fallback and no public seed/reset route.
- Six fixed-date fictional Moscow events flow through T105 canonical Event/Occurrence persistence and a separate bounded legacy search projection. Stable event/session/observation IDs make reruns no-op for existing versioned records and preserve Save rows; a version-content mismatch fails closed. Source pages exist only in demo mode and disclaim any real event, venue or ticket claim.
- Search, exact Detail, actor-owned Save/Saved and reload use the existing backend/session contracts. The runtime banner is **“Демонстрационная афиша — события вымышлены”**. `?design=` preview fixtures are untouched.
- Demo and live provenance remain separate (`SYNTHETIC` source ID `synthetic:povod-demo:v1` versus `LIVE`). Live-mode reads contain no demo candidates or saved synthetic occurrences, and reject synthetic Save writes. T105 live admission and provider gates are unchanged. KudaGo is `NOT_APPROVED`; Moscow live activation is `OFF`.
- Shared-file edits for review: `apps/api/app.ts`, `apps/miniapp/src/App.tsx` and `styles.css`, `packages/persistence/catalog.ts`, `saved.ts`, `ui.ts`, `delivery.ts`, `packages/platform/config.ts`, `bot.ts`, `links.ts`, and `package.json`. No route migration, auth bypass, navigation redesign, queue change, provider request or deployment change.

## Actual verification

All full command output is local in `artifacts/demo-catalog/`; the evidence is tied to the source hashes above.

| Command / check | Exit and result | Log |
|---|---|---|
| Fresh isolated `postgres:18.6` (`PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)`), `npm run migrate` | 0; 0001–0006 applied | `migrate-final.log` |
| `npm run seed:demo` then exact rerun | 0 / 0; six canonical occurrences and six search candidates, no duplicate IDs | `seed-first-final.log`, `seed-rerun-final.log` |
| `npm run migrate` rerun | 0; zero migrations applied | `migrate-rerun.log` |
| `node --experimental-strip-types --test tests/integration/demo-catalog.test.ts` with `DEMO_TEST_DATABASE_URL` | 0; 3/3. Authenticated structured search → Detail → Save → Saved → reload; cross-user isolation; rerun keeps Save; UNKNOWN/CONDITIONAL; live empty catalog/Saved, rejected synthetic Save, source 404 | `integration-final.log` |
| `node --experimental-strip-types --test tests/integration/p0-save.test.ts` on a separate fresh PostgreSQL 18.6 database | 0; 3/3 existing Save contract regressions | `migrate-save-regression.log`, `p0-save-regression.log` |
| `node --experimental-strip-types scripts/demo-browser.mjs` with `DEMO_TEST_DATABASE_URL` after `npm run build` | 0; production build in browser, authenticated Detail → Save → Saved → reload, visible notice | `browser-final.log` |
| `npm run test:unit` | 0; 271/271 | `unit-final.log` |
| `npm run typecheck`; `npm run typecheck:pure`; `npm run build` | 0 / 0 / 0 | `typecheck-final.log`, `typecheck-pure-final.log`, `build-final.log` |
| `git diff --cached --check`; staged prohibited-path and high-confidence secret scan | 0; 20 staged paths, 0 prohibited, 0 hits | `diff-check.log`, `final-scan.txt` |

The initial new-worktree typecheck was blocked by absent `node_modules`; `npm ci --ignore-scripts` exited 0 and the rerun passed. During development, an initial demo rerun exposed a duplicate observation request ID and an initial integration search lacked the required city time zone; both were corrected before the final fresh-database checks. The final logs above are the passing evidence.

## Limits and next action

- The dates/reference context and rights review expiry are fixed in the addendum. Server/session clocks remain real. Once dates pass or review expires, this v1 dataset will not silently shift; prepare a reviewed v2 if a later demo is needed.
- Canonical demo source URLs are pinned to the seed-time `PUBLIC_ORIGIN`. Seed a fresh demo database for a different origin or review an explicit migration/version; rerun fails closed on mismatch.
- Real MAX mobile/web exchange, provider access, live Moscow admission, Redis worker delivery and deployment were **NOT_RUN** for this local demo ticket. The browser used signed synthetic MAX init data through the actual session exchange; it did not simulate a privileged session.
- Review shared-file edits and the focused commit. A separate release decision is needed for hosting and real MAX acceptance. The live provider gate remains closed.
