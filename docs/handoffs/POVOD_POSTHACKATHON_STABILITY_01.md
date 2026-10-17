# POVOD Post-Hackathon Stability Sprint 01

Result: **IMPLEMENTED / LOCAL_ACCEPTANCE_PASS**. No stable release/tag is claimed. Hosted GitHub Actions is NOT_RUN; the supplementary nested Linux integration check has the Docker Desktop limitation recorded below. Stop at this checkpoint; deferred correctness work is not activated.

## Inputs and source safety

- Owner's explicit sprint request, 2026-10-17; exact base `8f1348f0f009008d83830a4de3fd8835f5653a2c`.
- `git ls-remote origin refs/heads/main refs/tags/hackathon-final-2026-09-30`: both match base. Local origin/main and historical tag match too. Tag untouched.
- Original checkout: `D:\Dev\Repos\The-Boys-Max`, branch `codex/max-bot-entry-flow`, HEAD `1e4a7a2b454bed87bdcb40559773143c2fc38c9b`; dirty state preserved. No development there.
- Isolated branch `codex/posthackathon-stability-01` at `D:\Dev\Codex\Worktrees\povod-stability-01\The-Boys-Max`.
- Owner-approved private bundle: `D:\Dev\Codex\PrivateBackups\povod-stability-01\povod-pre-stability-all-refs.bundle`, Windows account-only ACL, `git bundle create ... --all`; `git bundle verify` exit 0, complete history, 139 refs including worktree HEADs. SHA-256 `23c9b65e17544502720578e13e1ba9fccaf1eb7d5c1a1dc1db31c20edc28e8fb`.
- **The bundle does not preserve uncommitted, untracked or ignored files.** No private runtime files or credentials were copied or published.
- Docker initially unavailable; starting the installed Docker Desktop made the Linux engine available (29.8.1). Runtime acceptance is recorded below only when executed.
- The completed audit text was not present in the provided chat context; requested its location. The explicit sprint request identifies the authorized findings; dependency advisories and K11 are independently reproduced against the base.

## Dependency scope

Clean base `npm ci` exit 0; `npm audit --json` exit 1 reproduced three underlying advisories:

| Advisory | Base | Resolution |
| --- | --- | --- |
| [GHSA-4mh8-r7rc-xpvc](https://github.com/advisories/GHSA-4mh8-r7rc-xpvc) | Fastify 5.12.3 | 5.12.5, first patched release |
| [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) | shell-quote 1.10.0, Gel 2.2.1 via Drizzle optional peer (production lock graph) | 1.11.0, first patched release within Gel's range |
| [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | source-map-js 1.2.1, Vite → PostCSS | 1.2.2 within existing range |

`package.json` and `package-lock.json` change only the three affected resolved versions/integrities. Gel 2.2.1, MySQL2 3.24.4, Drizzle 0.45.2, Node 24.20.0, npm 11.19.0 and the Drizzle declaration patches are preserved. No force fix, new override or ORM upgrade.

Executed on the dependency tree: `npm ci`, `npm run typecheck`, `npm run typecheck:pure`, `npm run test:unit` (330 passed), `npm run build`, `npm audit --json` (0 vulnerabilities), `npm ls fastify shell-quote source-map-js gel mysql2 drizzle-orm`, `git diff --check`: all exit 0. Ignored logs: `.run-evidence/stability-01/deps-*`; original audit: `base-audit.json`. Final source-bound evidence manifest will include log SHA-256 values.

## Catalog lifecycle (K11)

`listedForDiscovery` previously accepted UNKNOWN lifecycle with a PRESENT listing. The new regression reproduced the past-start/unknown-end false positive. Future discovery now requires scheduled status, proven upcoming occurrence and observed listing. Unknown provider health remains honestly disclosed. Exact references remain readable independently of discovery; rights checks and add authorization still apply. Ended/cancelled detail no longer offers ADD_TO_PLAN. Saved and Plan storage/access are unchanged.

Saved's client adapter also filtered out every past record. It now retains these in the existing second segment, labeled «Остальные», with an «Архив» date prefix and canonical detail access. Layout and artwork are unchanged. Plan detail access remains unchanged.

Files: `packages/persistence/catalog.ts`, `packages/persistence/ui.ts`, `apps/miniapp/src/view-model/saved-runtime.ts`, lifecycle/Saved unit regressions. No canonical source data or migration changed. `node --experimental-strip-types --test tests/unit/catalog-lifecycle.test.ts tests/unit/integration26.test.ts tests/unit/saved-runtime.test.ts`: exit 0, 36 passed. `git diff --check`: exit 0. Logs: `k11-before.log` (expected failure), `k11-after.log`. Database-backed historical Saved/detail regression follows with the catalog clock acceptance.

## Historical clock isolation

The optional in-process `CatalogClock` applies only to catalog browse/filter evaluation. Historical fixture tests explicitly inject `2026-09-30T00:30:00.000Z`; production configuration has no clock environment flag. Catalog add/plan operations, PostgreSQL session checks, credentials, choice expiry and authorization use real time. `confirmSearch` accepts a separate authorization instant so historical filter validation cannot backdate security TTLs. No global Date/Date.now mock.

Historical integration verifies all 167 LIVE + 48 DEMO stored occurrences and the original 200-result ordering. Separate present-day discovery checks eligibility and rights and retains historical Saved/detail access; a 2030 post-expiry check returns no discovery results. An expired real session still fails with the historical catalog clock.

The new `npm run test:integration:isolated` harness uses fresh PostgreSQL 18.6 and Redis 8.2.9 containers on random loopback ports, generated local credentials, six migrated databases and checked-in imports. It never starts real provider transports. The old PowerShell command delegates to it. Cleanup removes only containers created by that invocation. No Windows-specific path in the Node harness.

Executed: both typechecks exit 0; unit tests 337 passed; isolated integration 102 passed, 0 failed/skipped (72.156s). Logs: `clocks-*`, `integration.log`, `migrate-*`, `showcase-import.log`, `showcase-seed.log` under `.run-evidence/stability-01/`. Source data and historical migrations remain byte-preserved.

## Offline portfolio demo

`npm run demo:portfolio` provisions dedicated disposable services, builds the accepted UI, migrates and seeds 48 canonical/search synthetic scenarios, then runs a loopback API and the existing BullMQ worker/TestTransport. Explicit local/test guards reject production/non-loopback/provider/owner-preview configurations. Generated keys stay in child environments. Synthetic HMAC launch uses the existing bootstrap/exchange/session checks; no authentication bypass endpoint. HTML omits MAX SDK and has same-origin-only connect CSP. AI is disabled. Historical source fixtures remain untouched; a separate synthetic namespace has consistent future dates relative to startup.

New implementation: `packages/demo/portfolio.ts`, `scripts/start-portfolio.mjs`, `scripts/portfolio-api.ts`, `scripts/seed-portfolio.ts`, `scripts/portfolio-smoke.ts`; small opt-in API/UI wiring and package scripts. Instructions: `docs/PORTFOLIO_DEMO.md`.

Executed: portfolio guard/fixture/signature unit tests 3 passed; `npm run demo:portfolio -- --smoke` exit 0. HTTP journey: Home, Search (six sport matches), Event Detail, Save, Saved, New Plan, Plan Detail, Friends, Profile; anonymous/CSRF/Origin checks, disabled AI, absent owner endpoint, no MAX SDK, Redis PONG and registered BullMQ worker. Browser independently reproduced all nine UI surfaces with synthetic actors and persisted a solo plan. Screenshot/logs: ignored `.run-evidence/stability-01/portfolio-*`. No real MAX, GigaChat or provider called. Initial release Docker build also exited 0; final source-bound rebuild follows CI changes.

## GitHub CI

Added the small Ubuntu 24.04 workflow in `.github/workflows/portfolio-baseline.yml`: immutable checkout/setup-node pins, Node 24.20.0/npm 11.19.0, clean ci, both typechecks, all unit/integration tests, build, offline smoke, dependency audit, repository current/history scan and local release Docker build. Read-only token, full history, no persisted checkout credentials, no deployment/publication or production secrets. Service images retain 18.6/8.2.9 and now pin verified official image digests. See `docs/CI.md` for source/license pins and limits.

The updated cross-platform helper passed 102 isolated integrations with pinned images (68.448s). Offline smoke passed again. Current + history pattern scan passed with no findings/prohibited/oversized paths. One exact historical blob exception documents a URL template containing variable syntax (not a credential); the current helper uses URL setters. No scanner rule was broadened or disabled. Hosted GitHub execution is **NOT_RUN**: no push/PR authorized in this sprint. Local Docker release build passed; final fresh-install/source-bound evidence follows.

## Final acceptance and review

Reviewed implementation source: `a7eefd73ef97389923ef3c52f5e009486af6f92e`. Later evidence/task-pointer changes are documentation only. The final receipt records the resulting HEAD and verifies that the runtime/source tree fingerprint is unchanged.

An additional present-day rights regression appends only synthetic observations: the same future occurrence is absent with expired rights, then appears with a newly reviewed rights observation. This isolates rights expiry from past-start rejection. Historical catalog input bytes remain unchanged. Final review also repaired the existing first-party demo link allowlist to recognize `/demo/source/v3/:id`; tests retain exact origin/path restrictions, and HTTP smoke opens the explanatory page. No new provider/scenario or visual design was introduced.

| Actual command / check | Exit / result | Local ignored evidence |
| --- | --- | --- |
| `npm ci` | 0; clean lockfile install on `8d108587023792201658da59496b1e7b8eca8850` (dependency graph unchanged afterward) | `final-ci.log`, `final-core-manifest.json` |
| `npm run typecheck` | 0; all 15 existing Drizzle declaration corrections verified | `review-typecheck.log` |
| `npm run typecheck:pure` | 0 | `review-typecheck-pure.log` |
| `npm run test:unit` | 0; **340 passed, 0 failed/skipped** | `review-test-unit.log` |
| `npm run test:integration:isolated` | 0; **103 passed, 0 failed/skipped**, 69.651s; writable isolated PostgreSQL/Redis | `review-integration-run.log`, `integration.log`, migration/import/seed logs |
| Historical fixture acceptance | PASS; 167 LIVE + 48 DEMO stored; 200-result ordering, all category paths, Saved/detail | same full integration run |
| Present-day lifecycle/rights expiry | PASS; past/unknown-end exclusion, expired-rights future negative/renewed positive control, historical Saved access and real session-expiry guard | same full integration run + lifecycle/Saved units |
| `npm run build` | 0 | `review-build.log` |
| `npm run demo:portfolio -- --smoke` | 0; all nine surfaces + guards, local source page, Redis/BullMQ registration | `review-demo-run.log`, `portfolio-smoke.log` |
| `npm audit --json` | 0; no vulnerabilities | `review-audit.json` |
| `npm run scan:secrets` | 0; current + reachable history, no findings/prohibited/oversized paths | `review-secrets.log`; final post-documentation scan in receipt |
| `git diff --check` | 0 | final receipt |
| `docker build --target release --build-arg SOURCE_SHA=... -t povod:posthackathon-stability-01 .` | 0; Linux release image built locally; no publication | `review-docker-release.log`; final HEAD label rebuild in receipt |
| Release image dependency inspection | 0; Fastify 5.12.5, shell-quote 1.11.0, Gel 2.2.1, MySQL2 3.24.4, Drizzle 0.45.2. source-map-js 1.2.2 is build-only | `final-docker-resolved.txt`, npm resolved-tree log |
| Linux build-image typecheck / pure typecheck / units | all 0; **340 passed, 0 failed/skipped** | `review-linux-typecheck.log`, `review-linux-pure.log`, `review-linux-unit.log` |
| Browser journey | PASS; Home → Search → Detail → Save → Saved → New Plan → Plan Detail → Friends/Profile | `portfolio-plan-browser.png` (SHA-256 `3762fd28f431744a0ff443a03c5cdb5e255701732781b8180e00aefd983ac132`) |
| Protected bytes comparison against base | 0; migrations, real catalog/provenance, historical demo v1/v2/v3 data, brand/public assets and CSS unchanged | final receipt |
| Original checkout preservation | status, HEAD, branch and tracked-diff hash match starting record; bundle SHA-256 unchanged; historical tag and remote main still exact base | private backup receipts + `final-remote-refs.txt` |

All paths in the evidence column are under `.run-evidence/stability-01/`. `acceptance-manifest.json` ties exact commands, exits, log SHA-256 values and the runtime/source fingerprint to the reviewed source. Logs/evidence are ignored local artifacts, not automatically published. `final-head-receipt.json` binds the final documentation HEAD to that fingerprint and final scan/image receipts. No test was removed.

### Verification limits and reproduction

- **Hosted GitHub Actions: NOT_RUN**. This sprint does not push or create a PR. Workflow commands have local evidence, including Linux typechecks/units and Docker build; a hosted green check is not claimed.
- **BLOCKED_LINUX_NESTED_LOOPBACK** for an additional diagnostic run of the integration harness inside a Docker Desktop Linux container. The nested process cannot reach sibling services at published `127.0.0.1:<random-port>`; migration fails with ECONNREFUSED. The same unmodified harness passes on the actual Windows host. This is not the host topology used by the Ubuntu Actions job. No host-network setting, TLS bypass or application workaround was introduced.
- Exact auxiliary reproduction: `docker run --name povod-stability-linux-verification --network host --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock povod:stability-01-linux npm run test:integration:isolated`. The ignored diagnostic Dockerfile `Dockerfile.linux-check` copies the official Docker 29.8.1 CLI into the build-stage image; no third-party source was copied into the repository. Logs: `linux-integration-repro.log`, `linux-migrate-repro.log`. The diagnostic container and all owned services were removed.
- Required host reproduction: `npm ci`, both typechecks, `npm run test:unit`, `npm run test:integration:isolated`, `npm run build`, `npm run demo:portfolio -- --smoke`, `npm audit`, `npm run scan:secrets`, release Docker build and `git diff --check`.
- The supplied audit's full text was unavailable in chat context; no location was returned. This handoff distinguishes the owner's explicit finding list and independently reproduced evidence from that unavailable text.

## README factual corrections

Kept the existing README structure and design. Narrow corrections identify MAX as historical/no longer live, describe prepared counts as historical rather than current future inventory, update Fastify's version, document the one-command local demo and platform-neutral integration command, correct the release to draft/no assets (verified via read-only GitHub API), and qualify 330/330 and 100/100 as historical evidence. `requirements.txt` changes only Fastify's reference version. License remains OWNER_REQUIRED.

## Boundaries and owner decisions

- License: **OWNER_REQUIRED**; no open-source license selected.
- K1 AI semantics, K2 durable AI state, K4 MAX revocation ordering, K5 RSVP reminders, K6 notification pagination and K7 preference concurrency remain deferred to a separate correctness sprint.
- No Telegram, providers/events, historical migration rewrites, real source data edits, visual redesign, deployment, stable tag, push or merge.
- Next action: owner review of local commits/evidence; later authorized GitHub execution and a separate decision for license/release. Do not start a deferred correctness sprint automatically.
