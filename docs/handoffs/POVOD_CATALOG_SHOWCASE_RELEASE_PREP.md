# POVOD catalog showcase: GitHub and Amvera release preparation

## Git ancestry and source identity

- Canonical previous `main`: `257b366e9a3b292f04bd73820d434214ee904684`.
- Reviewed catalog result: `eddbf1754f6be95f7dea965d4964377b2ae3e876` (owner-supplied archive SHA-256 `0FA41E5569EF1612EC60CB28ACAA77350C54CA44CB1A212B7ECC4F51632AEA2C`). It was committed in an independent archive extraction; canonical main is **not** its ancestor.
- Reconciled branch `codex/catalog-showcase` has a merge commit with both of those commits as parents. All files from the reviewed result are byte-identical in the merge tree. The only tree additions relative to the reviewed result are the two canonical environment templates and ten byte-preserved research ZIPs missing from the archive. No reviewed product file was changed by reconciliation.
- Source contains accepted POVOD V2, backend hardening, MAX E2E and Smart Occasion/GigaChat files and tests. Migrations `0001` through `0015_max_notification_outbox.sql` are present. Typechecks, build, 328 unit tests and 99 integration tests passed on the reconciled tree.

## Fresh local startup evidence

Isolated database `povod_catalog_release_verify` only; no production access. Ran compiled scripts in the exact Amvera order. First import summaries: Darwin `4 events/5 occurrences/5 search candidates/0 quarantine`; Tretyakov `12/12/12/0`; KudaGo A `75/75/75/0`; KudaGo B `75/75/75/0`. Demo v3 seed: `48 canonical occurrences/48 search candidates`. Fresh total: **214 canonical events, 215 canonical occurrences, 167 LIVE search projections, 48 SYNTHETIC search projections**. A second migration/import/seed run had no migration to apply and retained the same counts and canonical occurrence-ID digest `c5638abea9bef538107c9a002efa897a`.

`amvera.yaml` requires `APP_MODE=hybrid`, sets v3 and source allowlists, then executes migrations → Darwin → Tretyakov → KudaGo A → KudaGo B → demo v3 seed → `amvera-runtime`. That supervisor starts API and worker together and exits if either fails. Dockerfile copies all four curated JSON files. The 200-result Search cap is unchanged; 167 LIVE results precede demo in a full local view.

## Production diagnosis required before upload

Amvera opened to an unauthenticated login page in this session; no production logs, package identity or database connection was available. **Do not upload or start the new package until the owner records the following read-only evidence. Do not share credentials.**

1. In the existing Amvera project, record the current application source/package revision or archive hash if displayed, latest successful build ID/time, current application status, and retain the previous package or its exact Git revision for rollback. Take screenshots of the Repository/Code and application log views if a revision is not displayed.
2. In Amvera environment settings, record only `APP_MODE`, `DEMO_CATALOG_VERSION`, and whether `CURATED_SOURCE_HOSTS` and `ALLOWED_SOURCE_ORIGINS` are set. Do not copy other values. Expected new package settings are `hybrid`, `v3`, and both allowlists set; this does not prove the currently deployed package uses them.
3. In **Лог приложения** for the currently deployed version, find migration, four curated import and demo seed summaries. Record each source's event/occurrence/search-candidate/quarantine counts or the exact error code. Also look for source admission/review errors. Older builds may not have the four-import startup chain; record that as evidence rather than guessing.
4. If the current container has `dist/scripts/diagnose-catalog.js`, run `node dist/scripts/diagnose-catalog.js` from an authorized read-only shell. It prints no credentials or user rows. If no shell is available, run the SQL below with an authorized read-only PostgreSQL connection and share only these aggregated results.
5. In the real MAX Mini App, record the Search result count and selected search text, date, category, price/free and time chips. Clear the filters and reload to compare the unfiltered count. Check the Home count separately; do not infer catalog size from Home's limited card section.

```sql
SELECT id, sha256 FROM schema_migrations WHERE id IN ('0010','0015') ORDER BY id;
SELECT id, data_mode, admission_state FROM catalog_sources ORDER BY id;
SELECT data_mode, count(*) AS search_rows FROM catalog_occurrences GROUP BY data_mode ORDER BY data_mode;
SELECT e.source_id, count(DISTINCT e.id) AS events, count(DISTINCT o.id) AS occurrences
FROM canonical_events e LEFT JOIN canonical_occurrences o ON o.event_id=e.id
GROUP BY e.source_id ORDER BY e.source_id;
SELECT source_id, code, count(*) AS quarantined
FROM catalog_normalization_quarantine GROUP BY source_id, code ORDER BY source_id, code;
SELECT count(*) FILTER (WHERE (body->'rights'->>'reviewed_at')::timestamptz>clock_timestamp()) AS review_not_started,
       count(*) FILTER (WHERE (body->'rights'->>'review_due_at')::timestamptz<=clock_timestamp()) AS review_expired,
       count(*) FILTER (WHERE (body->'rights'->>'reviewed_at')::timestamptz<=clock_timestamp()
                       AND (body->'rights'->>'review_due_at')::timestamptz>clock_timestamp()) AS review_current
FROM catalog_occurrences WHERE data_mode='LIVE';
```

These are read-only queries. If a table is absent in the currently deployed schema, record the error and stop that query; it is useful evidence of an older package/schema. Production's exact eight-result cause remains unresolved until this evidence is collected.

## Mandatory data-safety gate

`scripts/migrate.ts` is append-only by migration ID/hash; catalog imports and v3 seed are additive/idempotent. The startup command contains no volume, database or table reset. Static review found **one existing exception to a blanket “no Friend deletion” claim**: migration `0010_friendship_pair_unique.sql` deletes duplicate friendship rows on its **first** application, then creates a unique index. This migration is inherited from canonical main and was not altered for the catalog release.

**Production upload gate:** verify `schema_migrations` already contains `0010` with the expected hash before uploading. If it does not, stop; a separate reviewed data-preserving migration plan is required. Do not run the new package's migration chain on an existing populated Friends table until that gate is resolved. On a fresh empty database, `0010` removes no Friend rows. The new package must retain the existing PostgreSQL and Redis instances/volumes and all actors, sessions, Saves, Plans, Friends, Notifications, MAX destinations and outbox state. No destructive database rollback is permitted.

## Owner upload and release checklist

1. Confirm this branch's PR is reviewed, the production diagnostic above is recorded, `0010` is already applied, the existing database/volumes are selected, and the previous package/revision is retained.
2. Verify the downloaded release ZIP's SHA-256 against the `.sha256` sidecar and final handoff. Upload that ZIP through the project's **existing** Amvera source workflow. Do not use a reset/recreate option. Set/retain `APP_MODE=hybrid`; the package's `amvera.yaml` exports `DEMO_CATALOG_VERSION=v3` and the curated/source-origin allowlists. Do not disclose other environment values.
3. In **Лог приложения**, require: migrations successful; Darwin `4/5/5/0`; Tretyakov `12/12/12/0`; KudaGo A `75/75/75/0`; KudaGo B `75/75/75/0`; v3 seed `48/48`; then `AMVERA_SERVICES_STARTED` listing `api` and `worker`. Confirm the API `/health/ready` reports ready and the worker remains running without an `AMVERA_SERVICE_EXIT` or delivery error. A green build status alone is insufficient.
4. Run the read-only diagnostic again. On a fresh catalog: 166 LIVE events/167 occurrences plus 48 v3 events/48 occurrences, totaling 214/215. On an existing production database, older demo versions and any other retained rows may raise global totals; compare **per source** and do not delete or rewrite prior data to force these totals.
5. In the real MAX Mini App: Home loads; unfiltered Search is populated; Cinema, Theatre, Concert and Museum have results; Sport, Outdoor and Volunteer have visibly labeled demo results; Free, ≤1000 ₽ and Evening return results; a LIVE Detail opens its actual source; a synthetic Detail visibly says “Демо-каталог”; Save survives closing and reopening. Check the remaining OTHER category as well. Mark rollout accepted only after these checks.

## Rollback

Before upload, record the actual previous deployed package/revision and keep its source artifact. The new ZIP SHA-256 is in its adjacent `.sha256` sidecar and final response. On a failed rollout, restore **only the previous application source/package and its matching configuration** through the existing Amvera workflow. Keep the current PostgreSQL and Redis instances/volumes; do not restore an older database snapshot over user data or remove v3 rows. Confirm the old API/worker health, MAX launch and Saved/Plans/Friends behavior after restoration. The previous package/revision is currently **unknown** because Amvera access requires owner login.
