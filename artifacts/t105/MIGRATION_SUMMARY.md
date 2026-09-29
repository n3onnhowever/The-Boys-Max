# T105 migration summary

- Classification: additive, forward only, pre-release. Historical migrations 0001-0003 were not edited. No evidence of external deployment of 0004 was found.
- New file: `migrations/0004_t105_catalog.sql`; SHA-256 (working tree and Git blob): `d14cef7b400fc9eb78fac5f81a2cef8e78519afd448160ec8c0d8e6865cb829e`.
- `.gitattributes` pins LF for 0004 so the migration ledger hash is stable across Windows and Linux checkouts. Existing historical migration line endings were not changed.
- Clean PostgreSQL 17.10 database: `npm run migrate` applied 0001-0004; exit 0.
- Trunk upgrade PostgreSQL 17.10 database: ran `node scripts/t105-upgrade-baseline.mjs` to apply trunk 0001-0003 SQL and exact ledger hashes, then `npm run migrate` applied only 0004; exit 0.
- Rerun: `npm run migrate` applied no further SQL; exit 0.
- PostgreSQL 18.6: BLOCKED_DOCKER_DAEMON. `docker info` exit 1 because the Docker Desktop Linux engine pipe is absent.
- Reproduction: use isolated test databases and synthetic configuration; set `DATABASE_URL`, run `npm run migrate`, then set `T105_TEST_DATABASE_URL` and run `node --experimental-strip-types --test tests/integration/t105-catalog.test.ts`. Do this on both clean and trunk-upgrade PostgreSQL 18.6 databases.

Exact PostgreSQL 18.6 Docker commands: `artifacts/t105/POSTGRES_18_6_REPRO.md`.
