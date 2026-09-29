# Unified POVOD runtime — owner handoff

## Input and boundary

- Worktree starting revision: `c0235a30195ced23b1cf9934dfe1bf09830e45b4` (accepted real catalog result). Accepted UI revision: `14528e10a9a855fab661bdef23228b1c69903354`.
- Authority read: `docs/current/POVOD_SOURCE_AUTHORITY.md`, `docs/tasks/ACTIVE_TASK.md`, relevant accepted UI and real catalog handoffs. The existing Search → Detail → Save implementation was kept.
- This is an uncommitted, unpushed owner preview. The owner inspection gate has not happened.

## Run

From this worktree: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-owner-preview.ps1`

Open `http://127.0.0.1:3000/?owner-preview=1`. The script starts loopback PostgreSQL/Redis containers, migrates, imports the curated official Moscow catalog and clearly labeled demo fallback, builds, and serves the one application. Rerun with `-NoSeed` to retain preview data. The alternate local persona is `http://127.0.0.1:3000/?owner-preview=friend`; opening it in the same browser replaces the preview session cookie. The preview route requires explicit local mode and a loopback HTTP request and is rejected in production/live mode. It creates a normal session and uses the same runtime API and components.

## Port and contract deltas

- Accepted AppViewport, navigation, home, search, filters, detail, Saved, My Plans, Friends, Profile, Settings, Notifications and system state compositions remain in the runtime. Final approved brand SVGs are used.
- Added durable preferences, friendship, plan chat and in-app notification tables in migration `0007_owner_product.sql` and narrow persistence/API adapters. Existing session, catalog, saves, plan command, roster, outbox, Redis/BullMQ and source contracts remain.
- Home ranks the existing catalog using saved interests. Nearby uses browser location and real venue coordinates only; missing permission or coordinates get an explicit state. Moscow is the only proven real catalog city; unsupported selections show no invented coverage.
- Event sharing uses a stable occurrence identity URL. Plan invitation uses the existing stable invite reference. Later MAX deep-link transport remains external integration work.

## Feature/control matrix

| Surface or visible control | State | Evidence / limit |
| --- | --- | --- |
| Home catalog, categories, cards, navigation | WORKING | Real-first catalog and labeled demo fallback loaded in browser. |
| Search, date/category/budget filters, detail, source, save, Saved | WORKING | Browser flow completed with a real Darwin occurrence and source link; Save persisted in Saved. |
| Search text, format/sort/map affordances | NEEDS WIRING | Disabled or explained in UI; no silent action. Map remains P1. |
| City selection | WORKING | Preference persists; unsupported city shows honest empty coverage. Moscow data only. |
| Nearby and radius | WORKING | Real-coordinate distance logic; denied/unavailable location visibly falls back. Positive permission path needs owner/browser location grant. |
| Profile and Settings (city, interests, budget, radius, notification preferences) | WORKING | Persisted and survived reload in browser. |
| My Plans, event → plan, plan status/participants, open plan | WORKING | Real occurrence plan created and reopened. Existing plan/roster commands used. |
| Plan chat and refresh | WORKING | Message sent, persisted, and reopened. Polling/manual refresh; no WebSocket. |
| Friends, request, accept, select and invite | WORKING | Two local actors completed request/accept and plan invite/join approval. Friend discovery needs actor ID or stable invite link. |
| Notifications | WORKING | Durable friend request and plan invite opened their destination. Chat activity notification implemented; cross-user browser check not run. |
| Event/plan share | WORKING | Stable link/payload wired. Native share or clipboard availability depends on browser/MAX host. |
| Loading, empty, retry/error, offline | WORKING | Existing state components retained; loading and nearby empty shown in browser. Error/offline manual browser simulation not run. |
| Profile linked-services, old placeholder action controls | BLOCKED_EXTERNAL / NEEDS MINIMAL BACKEND | Disabled with explanatory UI; MAX provider/account links need platform integration. |
| Plan → open original event from a later snapshot | NEEDS WIRING | Disabled rather than routing to a potentially changed occurrence. |

No visible enabled control is intentionally a silent no-op. Disabled controls expose their unavailable state; remaining controls above are explicit follow-up work.

## Actual validation

- `npm.cmd ci --ignore-scripts` — exit 0.
- `npm.cmd run typecheck` — exit 0 after final edits.
- `npm.cmd run test:unit` — exit 0, 284 pass / 0 fail, including owner preview production gate.
- `npm.cmd run build` — exit 0. Preview script also rebuilt the final source, 201 Vite modules. Bundle-size warning only.
- `git diff --check` — exit 0; Git reported LF/CRLF conversion warnings.
- Secret pattern scan with `rg` and prohibited `.pem/.key/.env/*secret*/*credential*` path scan — no matches (rg exit 1 means none).
- Check source fingerprints (SHA-256): `apps/api/app.ts` `B6774134EECF8938847158D5D04799C90273E9B14701BD49D218006ABB71B901`; `OwnerPages.tsx` `8C02BD6E5497290FADB0A00D2957911FCCCF7D2E19B8CC451A7D75F1B319D738`; `social.ts` `EBC68AEF3CF964035422CDE443697132BE01C0C394FF70ACA967A2D96B9123D9`; `0007_owner_product.sql` `AA04012864DE01F6B4FA43623AF26A36A9F936A4A99C6004D0031ACA8546E6CD`; `start-owner-preview.ps1` `AF45A96B18491B6B08E36C2631D145B1A2C9FB732443AE028BC5B2E63EC4C9CD`.
- Local browser: Home → Search → Filters → real Detail → Save → Saved; Profile → Settings → reload; Event → Plan → My Plans; chat send/read; friend request/accept → invite → join request → organizer approval; notification destination; nearby permission-unavailable state.
- Browser viewport override checked at 390×844, 360×780, 1440×900: no horizontal overflow; bottom nav visible, desktop centered at 430 px. Browser default restored afterward.

## Not run / blocked

- Owner's personal inspection: **PENDING**. No commit or push before it.
- Live MAX authentication, Bot API delivery, live provider refresh, actual device location permission grant, native share destination and external notification delivery: **BLOCKED_EXTERNAL**. Reproduce local app with the script above; test live MAX in its approved environment and grant geolocation in a browser to validate distance results.
- Browser-injected network offline and forced API error/retry visual states: **NOT_RUN**. Existing state components and retry paths remain; reproduce with browser network offline or by stopping the local API while the page is open.
- Exact real catalog importer/provider research was not repeated; accepted prior evidence at `c0235a3` remains the basis.

## Next action

Owner opens the local URL, inspects all surfaces, and reports any visual or flow corrections. Then rerun checks on corrections and decide whether to commit/push. Keep this worktree and its live preview while inspection is pending.
