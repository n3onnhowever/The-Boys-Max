# T103/T104 integration receipt

- Starting main: `5e4973f24fb74489387b3c29313cfcd1e8401ca7`.
- T103 branch/head: `codex/t103-bullmq-runtime` / `e379c62b6804d67df811bb2db5338cbf9a3f9e83`, verified exact.
- T104 branch/head: `codex/t104-kudago-gate` / `3bb2a9a47163b6f25dafe3381b5fe278bcb46ea5`, verified exact.
- T103 merge commit: `6c98ca76420a946672903fd1e7316cbe7d5b75e3`.
- T104 merge commit: `3e5b9902e86030eaabe37f2bdb9a4e15545523fb`.
- Final main / `POVOD_POST_T103_T104_BASELINE_SHA`: resolve with `git rev-parse main` after the clean integration commit. A tracked receipt cannot contain its own containing commit SHA.

Both ticket merge-bases were the starting main SHA. T103 contained one application fix, tests, evidence and docs; no provider/MAX/scope implementation leaked. T104 contained probe/evidence/handoff only; no production ingestion, schema migration, Moscow activation, Timepad or multi-provider wiring.

Accepted result: queue `KEEP_EXISTING_BULLMQ`; T103 PASS. KudaGo remains `CONDITIONAL_PRIMARY / NOT APPROVED`; T104 data runtime gate FAIL; legal/manual gate OPEN; Moscow NOT ACTIVATED. Frozen Gate v1 remains FAIL. Gate v2 is future-dated and pre-frozen under current governance, and was not run.

Regressions: dependency metadata PASS; syntax PASS; unit 115/115 PASS; typecheck PASS; build PASS; integration 16/16 PASS on isolated PostgreSQL 18.6 + Redis 8.2.9. KudaGo network gate was not rerun. Working-tree and baseline-range whitespace checks PASS. Heuristic secret/prohibited scan PASS.

The first local sandbox process runner failed before Git ran. All subsequent Git invocations used per-command `-c safe.directory=D:/Dev/Repos/The-Boys-Max` only; global Git configuration was not changed. T106 was not written or merged by this checkpoint; its independent branch advanced from observed `af0c0ad3569f12cc545546083393ef7fe7f0869f` to `4632ba46ca53c3aaadfbaf0b5a9262d9c9ea7dd4` in its own worktree while integration was running.
