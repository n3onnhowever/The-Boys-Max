# T105 PostgreSQL 18.6 reproduction

Run from the T105 repository worktree with a working Docker daemon. These commands use only the synthetic, repository-defined Compose test database credentials. Do not use a provider or production database. The two database names must be unused.

~~~powershell
docker info
docker compose -f compose.yaml up -d init postgres
docker compose -f compose.yaml exec -T postgres pg_isready -U max23 -d max23_test
docker compose -f compose.yaml exec -T postgres psql -U max23 -d postgres -c "CREATE DATABASE povod_t105_fresh_18 OWNER max23"
docker compose -f compose.yaml exec -T postgres psql -U max23 -d postgres -c "CREATE DATABASE povod_t105_upgrade_18 OWNER max23"

docker compose -f compose.yaml run --rm --no-deps -e DATABASE_URL=postgres://max23:max23_test@postgres:5432/povod_t105_fresh_18 migrate npm run migrate
docker compose -f compose.yaml run --rm --no-deps -e T105_TEST_DATABASE_URL=postgres://max23:max23_test@postgres:5432/povod_t105_fresh_18 migrate node --experimental-strip-types --test tests/integration/t105-catalog.test.ts

docker compose -f compose.yaml run --rm --no-deps -e T105_TEST_DATABASE_URL=postgres://max23:max23_test@postgres:5432/povod_t105_upgrade_18 migrate node scripts/t105-upgrade-baseline.mjs
docker compose -f compose.yaml run --rm --no-deps -e DATABASE_URL=postgres://max23:max23_test@postgres:5432/povod_t105_upgrade_18 migrate npm run migrate
docker compose -f compose.yaml run --rm --no-deps -e T105_TEST_DATABASE_URL=postgres://max23:max23_test@postgres:5432/povod_t105_upgrade_18 migrate node --experimental-strip-types --test tests/integration/t105-catalog.test.ts
~~~

Expected: 0004 SHA-256 d14cef7b400fc9eb78fac5f81a2cef8e78519afd448160ec8c0d8e6865cb829e on both paths, and 11/11 T105 tests on each database. These commands were NOT RUN in this task because docker info cannot connect to the daemon.
