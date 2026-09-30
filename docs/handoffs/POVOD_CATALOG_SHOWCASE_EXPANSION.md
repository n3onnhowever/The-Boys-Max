# POVOD catalog showcase expansion

## SOURCE BASE

- Owner-supplied primary candidate: `The-Boys-Max-catalog-167-fix.zip`, SHA-256 `0FA41E5569EF1612EC60CB28ACAA77350C54CA44CB1A212B7ECC4F51632AEA2C`.
- Main checkout starting revision: `1e4a7a2b454bed87bdcb40559773143c2fc38c9b`; it had pre-existing changes and was not edited. This work was made in an isolated extraction at `D:\Dev\Repos\The-Boys-Max-catalog-showcase`, baseline Git snapshot `4a8b9f79f7db91211db08076ffb11d21efaeeefc`.
- Scope follows the owner's catalog showcase request. The archived `docs/tasks/ACTIVE_TASK.md` describes an earlier publication ticket and was not activated by this request. Existing BullMQ/Redis/outbox, MAX bot identity, GigaChat, Plans, Friends, Save and auth contracts were preserved.
- Source inputs inspected: four files in `scripts/data/`, `scripts/import-curated-official.ts`, `packages/real-catalog/`, `packages/persistence/catalog.ts`, `packages/demo/`, `Dockerfile`, `amvera.yaml`.

## WHY ONLY ~8 WERE VISIBLE

Production cause is **not verified**: no Amvera release identity, production logs, read-only DB access or live Mini App URL was available. Eight resembles the older Darwin five sessions plus v2 sport three sessions, but this is a diagnostic hypothesis, not a finding about production.

The supplied archive already contained startup import of Darwin, Tretyakov and both KudaGo files. Local import accepted `5 + 12 + 75 + 75 = 167` exact sessions, zero quarantine, and a second run retained the same count. The local archive's hybrid browse previously stopped adding demo after six live results; this was a separate filter-coverage defect and is fixed. The KudaGo files have a review window beginning `2026-09-30T00:00:00Z`: a local check at 2026-09-29 23:56 UTC correctly showed 150 rows as not yet reviewed; after 00:00 UTC the same local catalog displayed all 167 LIVE rows. Therefore an eight-card observation before that boundary could also involve review gating, but the deployed release and database must be checked.

Read-only production diagnosis, from the running Amvera container after owner review:

```sh
node dist/scripts/diagnose-catalog.js
node -e "for (const k of ['APP_MODE','DEMO_CATALOG_VERSION']) console.log(k+'='+(process.env[k]||'UNSET')); for (const k of ['CURATED_SOURCE_HOSTS','ALLOWED_SOURCE_ORIGINS']) console.log(k+'='+(process.env[k]?'SET':'UNSET'))"
```

Compare the deployment's source revision/package checksum, startup logs for each of the four importer summaries and the demo seed summary, the diagnostic's `sources`, `searchProjectionRows`, `liveRights`, and `databaseClock`, then authenticate and inspect an unfiltered `/api/ui/v1/view` catalog response. This distinguishes old package, skipped/failed import, older persistent DB, wrong `APP_MODE`/version/host allowlists, admission failure, rights expiry, filters and result cap. Do not print runtime secrets or modify production data during diagnosis.

## REAL CATALOG COUNTS

| Source file | Event records | Exact occurrences |
| --- | ---: | ---: |
| Darwin `curated-official-v1.json` | 4 | 5 |
| Tretyakov `curated-official-tretyakov-exact-v1.json` | 12 | 12 |
| KudaGo Moscow A | 75 | 75 |
| KudaGo Moscow B | 75 | 75 |
| **Total** | **166** | **167** |

All are `LIVE`, with 131 distinct retained external source URLs and 47 distinct source venue IDs. Moscow local date range: 2026-09-30 14:30 through 2026-12-14 00:00. All 167 have `fee_status=UNKNOWN`; 120 carry source price text, 47 do not. Canonical price kinds: `FROM` 47, `KNOWN` 13, `UNKNOWN` 107. None has a confirmed all-in payable total; hard budget excludes them. Admission, exact time, category, venue, URL, review evidence and uncertainty were not rewritten. This is a bounded curated set; it is not provider-wide approval.

## DEMO SUPPLEMENT COUNTS

Version `v3`: 48 team-authored `SYNTHETIC` event records and 48 exact occurrences, six in each canonical category, across 16 explicitly fictional venues and 22 Moscow dates (2026-09-30 to 2026-10-28). No real organization, external provider photograph, verified navigation coordinate, ticket sale or availability is claimed. Source/detail pages explicitly disclose fiction. Search, Home and Saved cards show “Демо-каталог”; the demo source is first-party. Legacy v1/v2 Saves and exact Event links remain readable, while normal discovery uses v3 only.

## CATEGORY MATRIX

| Category | LIVE occurrences | v3 demo | Combined eligible |
| --- | ---: | ---: | ---: |
| CINEMA | 13 | 6 | 19 |
| THEATRE | 50 | 6 | 56 |
| CONCERT | 42 | 6 | 48 |
| MUSEUM | 25 | 6 | 31 |
| SPORT | 0 | 6 | 6 |
| OUTDOOR | 0 | 6 | 6 |
| VOLUNTEER | 0 | 6 | 6 |
| OTHER | 37 | 6 | 43 |
| **Total** | **167** | **48** | **215** |

Browse remains capped at 200, with admitted LIVE first; unfiltered local Search returned 167 LIVE + 33 labeled demo. Focused queries can show all matching demo rows. The 200 cap is explicit; no infinite scroll was added.

## PRICE MATRIX

| v3 demo case | Count | Hard budget evidence |
| --- | ---: | --- |
| FREE | 12 | Confirmed team-authored zero total and no fee |
| EXACT | 21 | Confirmed demo payable total; values include 300, 500, 700, 900, 1200, 1500, 2000, 2500, 3500 and 5000 ₽ |
| RANGE | 4 | Confirmed demo upper bound and no fee |
| FROM | 3 | Lower bound only; cannot prove a hard ceiling |
| CONDITIONAL | 4 | No confirmed total |
| UNKNOWN | 4 | No confirmed total |

Real price uncertainty is unchanged. `fee_status=UNKNOWN` remains unknown even where raw source text names a number.

## TIME MATRIX

Moscow demo dayparts: MORNING 9, DAY 19, EVENING 12, NIGHT 8. Dates include the demo day, next day, weekends and the next four weeks. Real dayparts: MORNING 5, DAY 61, EVENING 98, NIGHT 3. Time filters use Europe/Moscow and exact occurrence starts. The local demo set is fixed to the requested hackathon window and will age out; do not silently relabel expired fixtures as future events.

## ARTWORK MATRIX

All 30 presentation assets found in the archive remained byte-identical after changes; per-file original/current SHA-256 is in `artifacts/catalog-showcase/asset-hashes.json`. Seven category assets returned HTTP 200 in the local browser run. The intentionally dark concert image is unchanged. These are POVOD category illustrations, not source event posters.

| Category | Local presentation artwork |
| --- | --- |
| CINEMA | `/assets/events/category-cinema.png` |
| THEATRE | `/assets/events/category-theatre.png` |
| CONCERT | `/assets/events/category-concert.png` |
| MUSEUM | `/assets/events/category-museum.png` |
| SPORT | `/assets/events/category-sport.png` |
| OUTDOOR | `/assets/events/category-outdoor-v2.png` |
| VOLUNTEER | `/assets/events/category-other-v2.png` approved fallback |
| OTHER | `/assets/events/category-other-v2.png` |

Artwork mapping is deterministic; Saved cards and saved detail now use the same local art. No remote artwork was downloaded.

## FILTER TEST RESULTS

The 19 deterministic filter cases passed: eight categories, FREE, hard budgets ≤500/≤1000/≤2000, four dayparts, category+budget, date+category and text+category. The hybrid integration also proves 167 LIVE before demo under the 200 cap, sport/budget demo recovery, exclusion of all 167 uncertain real prices under a hard budget, and Save for accepted real and permitted demo entries. Unit coverage proves UNKNOWN price cannot satisfy hard budget and cancelled/missing-listing entries do not enter normal discovery. Demo Detail, source disclosure, Saved persistence and cross-user isolation passed.

## ACTUAL CHECKS

After final changes: `npm run typecheck` PASS; `npm run typecheck:pure` PASS; `npm run test:unit` 328/328 PASS; `npm run test:integration` 99/99 PASS; `npm run build` PASS; local authenticated showcase browser PASS (15 captures, seven art URLs HTTP 200, zero console errors); authenticated demo browser Detail→Save→Saved→reload PASS. The integration suite includes real catalog, demo catalog, Search/filter, Save, MAX and backend/AI integration cases. `git diff --cached --check` PASS. Test logs are retained locally in `artifacts/catalog-showcase/` and excluded from the distribution package. A mistyped targeted command for nonexistent `tests/unit/search-runtime.test.ts` exited 1; the actual `search-ui-state`, `saved-runtime` and `home-view-model` files were then run, 15/15 PASS, followed by a PASS typecheck and build.

Representative clean viewport screenshots without browser frame or scrollbar are in `artifacts/catalog-showcase/screenshots/`: `all-events.png`, `cinema.png`, `concerts.png`, `sport.png`, `free.png`, `budget-1000.png`, `evening.png`; also `theatre.png`, `museum.png`, `outdoor.png`, `volunteer.png`, `other.png`, `home.png`, `event-detail.png`, `saved.png`. Home, unfiltered Search, all eight category filters, budget/free/time filters, Detail and Saved were exercised locally.

## AMVERA DEPLOYMENT STEPS

Package source has `amvera.yaml` start order: require `APP_MODE=hybrid`; set `DEMO_CATALOG_VERSION=v3`, curated source hosts and allowed origins; run migrations; import Darwin, Tretyakov, KudaGo A and KudaGo B; run v3 seed; start API + worker. `Dockerfile` includes the four JSON sources. No deployment was performed.

After owner review, deploy the attached package through the existing Amvera source workflow with the existing secrets/settings and `APP_MODE=hybrid`. Do not replace or reset the PostgreSQL database or Redis. Inspect four import and one seed summaries before treating startup as successful. Run the read-only diagnostic above, then verify authenticated Search/Detail/Save and source links in the deployed MAX Mini App. If a source's review window has expired at deploy time, obtain a new bounded review through the approved process; do not bypass the gate.

For a **fresh empty catalog schema**, first start should contain 166 LIVE events/167 LIVE occurrences and 48 v3 synthetic events/48 occurrences: **214 events/215 occurrences** in canonical tables, **167 LIVE + 48 SYNTHETIC = 215** search projections. A second restart should retain the same counts and IDs. In an existing production database, legacy v1/v2 synthetic rows and other existing data remain; use the diagnostic's per-source counts instead of assuming a global total. If the 167 LIVE rows were already present, the import should add zero duplicate occurrences; v3 adds 48 only if absent.

## PRODUCTION DATA SAFETY / ROLLBACK

Imports and seed are additive/idempotent; no truncation, destructive migration, volume reset, user/session/Save/Plan/Friend/Notification/MAX destination/outbox deletion, or queue replacement. Version v3 is new and never mutates previously seeded v1/v2 payloads. Real source records and exact links remain intact. Normal discovery uses v3; legacy exact links and Saves remain readable.

Rollback: restore the previous application image/package and its prior configuration; keep PostgreSQL/Redis volumes and all rows. v3 rows can remain dormant under the older package; do not delete them as a rollback shortcut. If returning to an older demo version, use that package's expected `DEMO_CATALOG_VERSION` setting. Validate prior MAX/auth and Saved behavior after rollback.

## NOT_RUN / EXTERNAL

- No production Amvera logs, DB, deployed package checksum or live MAX Mini App/browser access were available, so the exact reason for ~8 live cards remains unconfirmed. No production deployment, production migration, provider call, live MAX delivery or live GigaChat call was run.
- Local PostgreSQL, Redis and browser were available; external MAX/outbox delivery remains unverified because no live provider call was authorized. Integration regressions passed.
- The repository secret scanner returned nonzero due to five findings in the isolated **baseline Git snapshot history**: synthetic test fixture assignments in demo/real catalog tests, demo browser and GigaChat test. The current worktree scan had no findings, and `prohibitedPaths=[]`. This scanner limitation is recorded rather than relabeled PASS. No credentials were included in the package.

## FILES / NEXT ACTION

Implementation: `packages/demo/catalog-v3.ts`, `catalog-versions.ts`, `seed.ts`, `packages/persistence/catalog.ts`, `saved.ts`, `ui.ts`, `packages/platform/config.ts`, `apps/api/app.ts`, Search/Home/Saved view models and card components/styles, `scripts/seed-demo.ts`, `scripts/diagnose-catalog.ts`, `scripts/showcase-browser.mjs`, `scripts/demo-browser.mjs`, `amvera.yaml`; targeted unit/integration tests and screenshot/hash evidence. Owner review of this source package and read-only production diagnosis are the next gates. Deployment was deliberately not started.
