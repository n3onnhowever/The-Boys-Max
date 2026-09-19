# T102 — Dependency and build baseline

Status: PASS after T102.2; stopped for human review. Current evidence: docs/handoffs/T102_2_NETWORK_MIGRATION_ACCEPTANCE.md. Prior T102/T102.1 evidence preserved.
Owner: the single integration writer.
Inputs: T101 handoff; package.json/.npmrc; Dockerfile/compose; env examples; README; preflight receipts and canonical authority in docs/current/POVOD_SOURCE_AUTHORITY.md.

1. Review package.json; generate real lock using npm install --package-lock-only --ignore-scripts. On resolution conflict stop this subtask, record exact error and propose minimal fix. No force, fabricated lock or silent major upgrades.
2. Once valid, clean install from lock with lifecycle scripts disabled; inspect any scripts before enabling them.
3. Run existing verify:dependencies, syntax, test:unit, typecheck, build scripts with exact commands/exits/logs.
4. Repair local reproduction docs and safe env-example tracking. No fabricated provenance; unresolved donor evidence belongs to T112.
5. Run docker info first. If unavailable: BLOCKED_DOCKER_DAEMON; no system repair; continue independent work. If available: inspect config, separate base-image pull time, build/start/health/stop/restart/logs and actual versions. No T103 queue fault injection.
6. Record host versions, installed graph, exact source state, secret/prohibited-file scan, diff check and final status.

Do not change application/UI/auth/Event/Occurrence semantics or queue technology. Do not run provider gates/live ingestion, implement favorites/profile/Smart, add a city, PostGIS/pg_trgm/FTS migrations or new infrastructure.
Stop after evidence/handoff. No active next ticket until human review.
