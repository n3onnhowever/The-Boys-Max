# Real Catalog Sprint — implementation checkpoint

## Revision, authority and scope

- Owner-authorized branch `codex/data-real-catalog`, worktree `D:\Dev\Repos\The-Boys-Max-real-catalog`, clean starting SHA `1e6b3e20600d4a1f249003990f95b6213eb561fa`. The main checkout had unrelated changes and was not edited.
- Read repository `AGENTS.md`, `ACTIVE_TASK`, current authority, `RUNTIME_VISUAL_PARITY`, `T105_DATA_SAFETY_IMPLEMENTATION`, `DEMO_CATALOG`, and the Moscow Gate v2 runtime/matrix handoffs in the separate gate worktree. The Gate v2 files were not copied or changed.
- This task authorized only the named source classes and no provider-wide approval. Moscow Gate v2 remains `FAIL`; KudaGo remains `NOT_APPROVED`; provider/legal admission for a full catalogue remains open. No real MAX message, deployment, provider account, queue change, migration, or new infrastructure was used.
- Source and test file hashes: `artifacts/real-catalog/source-hashes.json`. Bounded HTTP, PDF, and RSS receipts: `artifacts/real-catalog/source-receipts/`. Coverage measurement: `artifacts/real-catalog/coverage.json`.

## Bounded source admission check

The [official KudaGo API terms](https://docs.kudago.com/api/) still describe free public API use. Unauthenticated read-only v1.4 GET requests returned HTTP 200 for events, event detail, places, movies and movie showings. The open license requires a direct, ordinary indexable link to the exact KudaGo source, and warns that some marked materials are advertising whose tokens cannot be reused by another user. No reliable machine-readable advertising discriminator was established in the probed schemas. Absence of an ad field is classified `AD_STATUS_UNPROVEN`, never as clearance. The local ad classifier quarantined all 14 retained factual examples (ten events and four showings). No KudaGo row was persisted or published. Provider-wide Gate v2 stays FAIL.

The event query for 2026-09-26 through 2026-10-25 reported an API total of 590, **not** 590 accepted or reviewed future sessions. Its bounded sample includes historical `dates` despite the `actual_since` filter, so the importer must filter exact future starts itself. The detail example had 1,880 date entries and zero in this short window. The places list reported 794, movies 1,612, and movie showings four. The four showings were at cinema «Пионер», with three numeric price strings and one null price. Two movie detail GETs provided nearest movie source URLs; the showing schema offered no direct showing page. Their source granularity is `MOVIE_PAGE`; no ticket URL or end time was invented. All four are quarantined pending exact advertising review.

The latest official [Moscow 2026 EKP PDF](https://www.mos.ru/upload/documents/files/1077/EKP_2026_24042026.pdf) found in the bounded check is the April 24 named revision, SHA-256 `91b9d5d809f998b087437752dfa9f72413b77b8cfb19df2e34e97dae6b29b303`. Page 1092 was visually reviewed. Registry rows 52721, 52729, and 77827 give October 1–31 Moscow ranges and three distinct venues. They provide no exact session or spectator admission terms. Three event-level records are prepared; their adapter creates zero Occurrences and UNKNOWN prices. The bounded check did not prove that no later EKP revision exists.

The official Darwin Museum page exposes [event RSS](https://www.darwinmuseum.ru/rss.php?type=news) and [exhibition RSS](https://www.darwinmuseum.ru/rss.php?type=exh). HTTP 200 receipts contain five and twelve items. The reusable RSS parser preserves GUID, or a deterministic feed URL plus link identity, and never treats `pubDate` as event time. No item was promoted to an exact Occurrence. No additional explicit official ICS feed was found in the bounded known source set. The ICS parser preserves UID and RECURRENCE-ID, validates Moscow timezone, and suppresses cancelled sessions; operator ICS with cancellation fails closed for explicit reconciliation.

Four first-party Darwin Museum factual records were reviewed from exact official pages: «Лисий день» (October 3), «Медвежий праздник» (October 9 and 30), and two distinct Belcanto productions (October 3 and 17). They produce five exact sessions in one venue. The reviewed museum pages contain the cited times and address; the bear quest page quotes 1,500 rubles but does not establish every mandatory fee, so the amount is a known quote with unknown payable total. Other prices remain UNKNOWN. The museum footer restricts use of its materials to noncommercial use; no descriptions or images are copied, and only factual metadata is used. The science festival page had a conflicting 2025 heading and 2026 body, so it was excluded rather than assigned an invented year.

## Implementation

- `packages/real-catalog/adapters.ts` stages KudaGo ambiguity, maps movie → Event/showing → Occurrence/cinema → Place, maps EKP ranges to Event only, parses official RSS/ICS, and validates curated factual JSON.
- KudaGo's exact manual admission receipt type binds ID, source URL, API response hash, page review hash, review timestamp and explicit factual-display approval. It is staging logic only; no reviewed KudaGo receipt or publisher was supplied in this sprint.
- `packages/real-catalog/operator-formats.ts` accepts bounded CSV and editorial ICS with required provenance fields. `scripts/import-curated-official.ts` and `scripts/import-moscow-sport.ts` are explicit operator commands. They do not run on API startup or a provider error.
- `packages/real-catalog/import.ts` commits reviewed first-party records through T105 canonical normalization and PostgreSQL, then projects those same canonical Occurrences into the existing Search/Detail path. Stable native session IDs preserve canonical IDs and Save references across reruns; request IDs vary per run to satisfy the existing unique observation constraint. Only `real:curated-official:v1` and event-only `real:moscow-sport-ekp:2026` are registered as scoped sources. KudaGo is not registered.
- `APP_MODE=hybrid` is explicit and requires the existing live release gate and demo version. Search checks canonical source approval for every LIVE candidate, shows eligible real results first, and adds labeled demo candidates only if fewer than six real results pass current filters. Save retains source separation. The policy is [documented](../current/REAL_CATALOG_HYBRID_POLICY.md). Source links use ordinary anchors, and real source origins require `ALLOWED_SOURCE_ORIGINS` configuration.
- No Event/Occurrence/Price schema, migration, queue, provider port, auth/session contract, or MAX delivery contract changed. Search admission checks and `ManualProvider` HTTPS link handling changed to permit reviewed official source links. KudaGo branding is not used.

## Coverage and price truth

`artifacts/real-catalog/coverage.json` separates `REAL_ACCEPTED`, `REAL_QUARANTINED`, reviewed source inputs, and `DEMO`. Reviewed input counts describe the same records before admission and must not be added to accepted totals. In the isolated PostgreSQL 18.6 verification database, **REAL_ACCEPTED is seven Events, five exact Occurrences, one canonical Occurrence venue, and three canonical categories**. Four curated Darwin Events yield the five Occurrences; three EKP sport Events retain date ranges and yield zero Occurrences. Their three venue names remain in the reviewed source receipt, with no fabricated canonical session or venue row. All seven Events and five Occurrences have source links. The exact session span is October 3–30. The four movie showings remain quarantined; the API's larger totals are not counted as reviewed records. The six existing fictional demo definitions were separately seeded in isolated test databases and excluded from REAL_ACCEPTED.

Canonical price kinds remain FREE, KNOWN, FROM, RANGE, CONDITIONAL and UNKNOWN. The new narrow factual grammar handles FROM and RANGE, leaves zero numeric price UNKNOWN, and does not claim an all-in total when mandatory fees are unknown. The existing T105 parser retains mandatory-deposit CONDITIONAL behavior. Canonical Saved labels now note when a quoted amount has no confirmed final total. Source evidence and review time are retained in the existing provenance and receipt structures; there is no new financial shortcut.

## Actual checks and blockers

| Command or check | Result | Evidence |
| --- | --- | --- |
| `node scripts/real-catalog-probe.mjs` | Exit 0; five HTTP 200 KudaGo entity probes, followed by two bounded movie-detail source checks | `source-receipts/*.json` |
| Two official Darwin RSS GETs; four first-party page GETs; Moscow EKP PDF read and page render | HTTP 200; hashes and factual receipts recorded; raw HTTP bodies and full PDF discarded | `source-receipts/` |
| `npm.cmd ci --ignore-scripts` | Exit 0 | command output |
| `node --experimental-strip-types --test tests/unit/real-catalog.test.ts` | Exit 0; 9/9 | command output |
| `npm.cmd run test:unit` | Exit 0; 283/283 on continuation | `artifacts/real-catalog/unit.log` |
| `npm.cmd run typecheck` | Exit 0 on continuation | `artifacts/real-catalog/typecheck.log` |
| `npm.cmd run typecheck:pure` | Exit 0 on continuation | `artifacts/real-catalog/typecheck-pure.log` |
| `npm.cmd run build` | Exit 0; Vite 200 modules on continuation | `artifacts/real-catalog/build.log` |
| JSON parse of all real-catalog receipts and coverage | Exit 0 | command output |
| Secret/prohibited-path scan | 44 changed source/artifact files scanned; zero prohibited paths, zero high-confidence secrets | `artifacts/real-catalog/scan.json` |
| `git diff --check` | Exit 0 across tracked and intent-to-add files; line-ending notices only | command output |
| `docker info`; isolated `postgres:18.6` on `127.0.0.1:55486` | Exit 0; PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2); existing PostgreSQL 17 untouched | `artifacts/real-catalog/postgres-18.6.log` |
| `npm.cmd run migrate` on `povod_real_catalog_verify` and `povod_demo_verify` | Exit 0 each; migrations 0001–0006 applied in each database | `migrate-real.log`, `migrate-demo.log` |
| `tests/integration/real-catalog.test.ts` | Exit 0; 2/2, accepted REAL import, Search → Detail → Save, URL equals the exact curated record source, unchanged canonical IDs and Save after rerun, real-first plus labeled demo fallback | `integration-real.log` |
| `tests/integration/demo-catalog.test.ts` | Exit 0; 3/3, demo Search → Detail → Save, rerun identity, isolation and live-mode negative control | `integration-demo.log` |
| Operator curated and sport import commands | Exit 0; curated 4 Events/5 Occurrences/5 Search candidates, sport 3 Events/0 Occurrences; curated rerun did not duplicate IDs | `import-curated.log`, `import-sport.log` |
| PostgreSQL 18.6 coverage query | 7 approved LIVE Events, 5 Occurrences, 1 canonical venue, 3 categories, event URLs 7/7, occurrence URLs 5/5; real price kinds KNOWN 2, UNKNOWN 3 | `coverage.json` |

The initial `npm.cmd run migrate` attempt had `APP_MODE_REQUIRED` because its full runtime configuration was not supplied. The configured rerun applied all migrations and exited 0. Docker's Linux engine became available before this continuation; no PostgreSQL 17 service or data was modified. The test-only PostgreSQL 18.6 container is named `povod-pg18-real-catalog`, binds localhost port 55486, and uses only its two isolated verification databases. No real MAX messages or deployment occurred. The real integration test was tightened to compare each displayed URL with the exact curated source URL and compare canonical IDs before and after rerun; its rerun passed 2/2.

To repeat the real integration check against a fresh isolated PostgreSQL 18.6 database named `povod_real_catalog_verify`, supply the existing migration runtime configuration and run:

```powershell
$env:DATABASE_URL = $env:REAL_CATALOG_TEST_DATABASE_URL
npm.cmd run migrate
node --experimental-strip-types --test tests/integration/real-catalog.test.ts
```

The integration test asserts Search → Detail → Save, source URLs, rerun identity, and hybrid real-first/demo fallback. The existing `tests/integration/demo-catalog.test.ts` also passed on its separately named `povod_demo_verify` database. A source review update or cancellation requires explicit operator reconciliation; missing rows never imply cancellation.

## Next action

All required PostgreSQL checks and operator imports passed on the isolated 18.6 instance. Final unit, typecheck, build, diff and scan checks passed before the result commit. No owner API key is required. Partner feeds remain deferred: Yandex Afisha distribution, PRO.Культура export, Sputnik API, Ticketland/Radario APIs, and Timepad catalogue rights/access. The current real sample is narrow: sport has no exact sessions and cinema remains quarantined; no count was fabricated to reach the desired category coverage. The test container is local verification state and is not deployed.
