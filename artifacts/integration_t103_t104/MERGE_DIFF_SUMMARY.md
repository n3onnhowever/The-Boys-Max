# Merge diff summary

## T103

- Application fix: `packages/persistence/plans.ts` now treats raw Drizzle `expires_at` results as strings and explicitly constructs `Date` for expiry checks/ISO output.
- Tests: IT-13 covers invite timestamp create/replay; IT-14 covers concurrent/sequential SELECT replay plus duplicate BullMQ jobs. Runtime helpers exercise the accepted fault matrix.
- Evidence: `artifacts/t103/` contains runtime, failure, idempotency, commands, hashes and logs.
- Docs: T103 handoff plus a branch-local active-task update, superseded by this integration checkpoint.
- Scope review: no provider, MAX, schema, dependency, retry/concurrency, governor or UI implementation change.

## T104

- Probe/evidence: `artifacts/t104/` only, including immutable runtime receipts, analysis and replay tooling.
- Docs: T104 handoff.
- Scope review: no production ingestion wiring, persistent schema migration, Moscow activation, Timepad wiring or multi-provider change.

Both branches were based exactly on `5e4973f24fb74489387b3c29313cfcd1e8401ca7` and merged with separate non-fast-forward commits.
