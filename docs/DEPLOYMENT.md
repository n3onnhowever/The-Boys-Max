# Deployment and rollback

## Production preflight

Record the currently deployed package revision, current database migration ledger, catalog counts, and previous package for rollback before any Amvera upload. In particular, verify that `schema_migrations` already contains migration `0010` with SHA-256 `896fffb4bf8826bbc7129ef1b8ec5be5cb1197128f09dae32dc9c7fde94e0d51` (the hash of `migrations/0010_friendship_pair_unique.sql`). Its **first** application deletes duplicate friendship pairs before creating a unique index. If an existing populated production database has not applied `0010`, stop and prepare a separate reviewed data-preserving migration plan. An empty fresh database has no duplicate Friend rows to remove.

Keep the existing PostgreSQL and Redis instances and volumes. No database reset, actor reset, Save/Plan/Friend/Notification/MAX destination/outbox reset, destructive rollback, or queue replacement belongs in this release. `scripts/migrate.ts` checks migration IDs and hashes; reviewed catalog imports and demo v3 seed are additive and idempotent.

## Amvera startup

The `amvera.yaml` command requires `APP_MODE=hybrid`, exports demo v3 and curated host/source-origin allowlists, and executes:

1. Migrations.
2. Darwin curated import.
3. Tretyakov exact-session import.
4. KudaGo Moscow A curated import.
5. KudaGo Moscow B curated import.
6. Labeled synthetic demo v3 seed.
7. `amvera-runtime`, which starts API and worker and exits if either fails.

The four JSON inputs are in `scripts/data/` and included by `Dockerfile`. A fresh isolated database should yield 166 LIVE events/167 LIVE occurrences plus 48 SYNTHETIC events/48 occurrences: 214 events and 215 occurrences. On an existing database, compare counts per source; old Saved/deep links and prior catalog versions may add rows. Do not delete them to force global totals. Use `npm run diagnose:catalog` or read-only SQL to inspect counts, source admission, and rights review.

## MAX and GigaChat

Set the MAX bot variables privately using `.env.release.example` as the name list. The webhook path is `/api/v1/max/webhook`; verify the actual HTTPS subscription, update types, ingress logs, worker startup and delivery outcome in the owner's MAX and Amvera accounts. `POVOD_OUTBOUND_ARM_ID` is an explicit one-time operator control for the existing outbound hold; review UNKNOWN delivery outcomes before arming. A local synthetic test or a successful build does not establish live MAX delivery.

External AI remains off unless `AI_EXTERNAL_ENABLED` and the private `GIGACHAT_AUTH_KEY` are configured. Confirm the account's network, TLS and model access before enabling it. Manual Search stays available if provider calls fail. See [AI](AI.md).

## Release checks and rollback

Before uploading, run typechecks, unit/integration tests, build, catalog import and second-start identity checks, browser smoke, artwork parity, secret scan, and `git diff --check`. Check the package SHA-256 and preserve the previous deployed package. In Amvera logs require migration, four import summaries, demo seed, and both API and worker start. Confirm `/health/ready`, MAX launch, source links, Search, Save, Plans and Friends in the deployed client.

On failure, restore only the previous application package and compatible configuration through the existing Amvera workflow. Keep the current PostgreSQL/Redis volumes and all newer rows. Never reverse migrations or restore an older database snapshot over current user data. Review schema compatibility, outbox UNKNOWN outcomes, and the governor before resuming delivery.
