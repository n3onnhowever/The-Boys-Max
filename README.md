# The Boys — integration26 candidate

Personal catalog first; a group is created only by explicit ADD_TO_PLAN with newPlan configuration. Product name is not approved. Full handoff is ../../README.md and ../../RUN_ELSEWHERE.md.

This source is NOT a verified deployable build: the root npm lock is absent, the registry was unreachable, target dependency graph and Docker were not run. No source/API/model/map/hosting admission is implied.

Offline: `node --experimental-strip-types --test tests/unit/*.test.ts`. After reviewed dependencies: `npm run typecheck`, `npm run build`, `npm run openapi`. Exact preparation and isolated PG/BullMQ tests are in ../../RUN_ELSEWHERE.md.

`compose.yaml` is a closed test-only stack; `compose.release.yaml` is an unlaunched release configuration with real transport gate closed. Never use synthetic credentials/data to claim MAX login or a live afisha.

No personal favorites, reminder scheduling, free-text model endpoint, live provider importer, /start message handler or polling runner is shipped as working. Their absence is recorded in OPEN_ISSUES.
