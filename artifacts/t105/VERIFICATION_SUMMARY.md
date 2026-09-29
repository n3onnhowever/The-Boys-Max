# T105 verification

Base SHA: `fd03d3a15157fcaa59e5574619725f366fd6185d`
Implementation SHA: `30a60928c58cd4be208b6ae097250a165de8ee0f`
Migration SHA-256: `d14cef7b400fc9eb78fac5f81a2cef8e78519afd448160ec8c0d8e6865cb829e`
Final source scan: `artifacts/t105/logs/implementation-scan.json` (10 changed files, no prohibited paths or high-confidence secret hits).

| Check / exact command | Exit | Result / log |
| --- | ---: | --- |
| `node --experimental-strip-types --test tests/unit/t105-normalizer.test.ts` | 0 | 21/21; `logs/focused-unit.log` |
| `node --experimental-strip-types --test tests/integration/t105-catalog.test.ts` on fresh PostgreSQL 17.10 | 0 | 11/11; `logs/postgres-pg17.log` |
| Same test on upgraded PostgreSQL 17.10 | 0 | 11/11; `logs/postgres-upgrade-pg17.log` |
| `node --experimental-strip-types --test tests/unit/detail-view-model.test.ts tests/unit/http-price.test.ts` | 0 | 13/13; `logs/ui-data-safety.log` |
| `npm run test:unit` | 0 | 264/264; `logs/full-unit.log` |
| `npm run typecheck` | 0 | `logs/typecheck.log` |
| `npm run typecheck:pure` | 0 | `logs/pure-typecheck.log` |
| `npm run build` | 0 | `logs/build.log` |
| `npm run verify:dependencies` | 0 | `logs/dependencies.log` |
| `npm run migrate` on clean isolated PostgreSQL 17.10 | 0 | 0001-0004 applied; `logs/migrate-fresh-pg17.log` |
| `node scripts/t105-upgrade-baseline.mjs` then `npm run migrate` | 0 | 0004 applied; `logs/upgrade-trunk-apply.log`, `logs/migrate-upgrade-pg17.log` |
| `npm run migrate` rerun | 0 | no-op; `logs/migrate-rerun-pg17.log` |
| `node --check scripts/t105-upgrade-baseline.mjs` | 0 | isolated upgrade helper syntax |
| `git diff fd03d3a15157fcaa59e5574619725f366fd6185d..30a60928c58cd4be208b6ae097250a165de8ee0f --check` | 0 | no whitespace errors |
| `docker info` | 1 | daemon unavailable; `logs/docker-info.log` |
| Docker build | NOT_RUN | Dockerfile/compose untouched and daemon unavailable |
| PostgreSQL 18.6 integration | BLOCKED | target image unavailable without daemon |

`LOG_HASHES.json` ties every saved log to `30a60928c58cd4be208b6ae097250a165de8ee0f`; all test credentials were synthetic and omitted from the logs.
