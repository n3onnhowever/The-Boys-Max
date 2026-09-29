# Working in integration26 candidate
Read README.md, ../../CONTRACT_DELTA.md, packages/contracts/http.ts and the relevant tests before editing.
Use only root npm/package-lock.json. Runtime candidate Node24.20.0/npm11.19.0 is not installed here.
Commands: `npm run test:unit`, `npm run typecheck`, `npm run build`, `npm run openapi`;
`docker compose --profile checks run --rm checks` for dedicated PG/Redis integration.
Unit tests use Node's standard test runner, not an in-memory database substitute.

Owner26: root dependencies/lock, migrations, auth, API, worker, final contract merge.
Incoming patches: owner27 frontend; owner29 AI; owner30 search/maps.
Imported source versions remain 19/20/21/22; do not claim new neighbor versions were received. Shared contract changes require CONTRACT_DELTA.md.
No SDK/queue types in domain. No React-local business calculator. No fake ACTIVE organizer.
No arbitrary external HTTP, subscription changes, MAX load tests, secret logging, auth bypass or paid fallback.
The default compose has an INTERNAL network and explicit test transport. Never use it as live deployment.
Apply the missing-lock and exact-version gates before claiming build PASS. Do not overwrite pins with latest silently.
