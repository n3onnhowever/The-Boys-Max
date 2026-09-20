# Exact runtime verification

Run from the isolated worktree. Runtime source SHA: 6cdd93c3f10a9179e2e3edb9ba08b3f300ba043e.

Host checks: node artifacts/max-runtime/integrated/verify-host.mjs

Fresh build/context probe: node artifacts/max-runtime/integrated/build-release.mjs. This intentionally requires a fresh context-export directory; preserve prior receipts and use a fresh worktree/output directory for replay. It creates only synthetic markers and removes their exact bytes after success.

Exact-image tests: node artifacts/max-runtime/integrated/run-image-integration.mjs. Starts task-owned internal PostgreSQL18.6/Redis8.2.9 containers, migrates the compiled release, mounts test harnesses read-only, rewires backend imports to /app/dist, runs 35 transport/Bot/TLS units and 36 PG integration tests, removes its containers/network and synthetic config.

TLS and authorized read-only MAX: node artifacts/max-runtime/integrated/run-image-smokes.mjs. It uses EXACT_IMAGE.json; reads MAX_BOT_TOKEN only from the original ignored .secrets/max.env, sends it only on child stdin, makes GET /me and GET /subscriptions, persists only an allowlist receipt. Never pass token via command arguments, build inputs, environment or artifacts.

Final rootfs: python artifacts/max-runtime/integrated/audit-image.py. It exports an unmounted container of the exact ID and scans full file bytes in memory. Any upstream cryptographic self-test key signature must retain raw findings and a pinned narrow adjudication.

Release migration command: docker run --rm [approved runtime configuration] sha256:c4e7cd181082c611708820895290e29547435222a1457750abe4e0edcc232105 node dist/scripts/migrate.js. This is a reproduction form only; no production migration or deployment was performed.

No live send/command/profile/subscription mutation is part of this verification. Required real MAX client/deployment/data/Save acceptance belongs to separate tasks.
