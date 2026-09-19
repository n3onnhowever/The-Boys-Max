# Current repository receipt — 2026-09-19

- Repository: `D:\Dev\Repos\The-Boys-Max`
- Branch: `main`; HEAD: `4f9a198d4fa2b18686efa19a59b6ac78281d341d`
- Initial `git status --short`: empty (clean). No remotes configured. No commit created.
- Node: `v24.20.0`; npm: `11.19.0`, matching package.json. Root lockfile and node_modules absent.
- Architecture: TypeScript/Fastify modular monolith, React/Vite mini-app, separate API and worker roles, PostgreSQL durable state, Redis/BullMQ execution. Drizzle + pg persistence; no pg-boss/Valkey.
- PostgreSQL `18.6` and Redis `8.2.9` are compose image declarations, NOT observed running versions. No declared CREATE EXTENSION, FTS/GIN, pg_trgm or PostGIS. Runtime extensions/configuration unknown. psql unavailable.
- Docker CLI `29.7.2`, Compose `v5.5.1`; daemon inaccessible at dockerDesktopLinuxEngine. No containers started.
- Redis: AOF/everysec, 256mb/noeviction; durable named volume. Internal test network; no PG/Redis host ports. Release compose expects external PG/Redis and HTTPS proxy.
- BullMQ `6.3.4`, ioredis `5.11.1`; `apps/worker/main.ts` queue `max-effects`, concurrency 4, one-second outbox reconciliation timer. `packages/persistence/delivery.ts` owns ledger/reconciliation; `packages/platform/governor.ts` + Lua use Redis for outbound governance. No live provider-sync scheduler.

## Authority (read, hashed, preserved)
| File | SHA-256 |
|---|---|
| `input/official/Досуг и развлечения.pdf` | `638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a` |
| `docs/product/povod-2026-09-19/POVOD_FINAL_SCOPE_FREEZE_MVP.md` | `a904abdcb148692a22a821ca0ccf22e52281d3204c7ca26e9c9a563b04e05f99` |
| `docs/product/povod-2026-09-19/POVOD_PRODUCT_CONTRACT_V1.json` | `fee706e1a28155c9a33a744fcaf4588803f4bcf76df04a580f053c9900199640` |
| `docs/product/povod-2026-09-19/POVOD_PRODUCT_SPEC_V1.md` | `66509ced23dde708a8cc5f101ab15423387d0e51e0c4d31c82d8f5f4f1aba5e8` |
| `docs/product/povod-2026-09-19/POVOD_PRODUCT_SPEC_V1_1_DATA_SAFETY_PATCH.md` | `54b4a98e8a0373c01fabee12a46a89be0773e37aeb26523c56e026f29f3daab4` |

Official PDF: 22 pages; exact hash matches synthesis. Full extracted text: `artifacts/preflight/OFFICIAL_CASE_TEXT.md`. Official submission page 10 rendered with installed Poppler and visually inspected. Initial fitz import failed; Poppler recovered the check. Full case text extracted as Unicode.
Handoff ZIP: `eb06177c37aaadddcce3f0aeeb6f98406c6ec9d10a7a8f254fa15dd171614aa0`; all 40 imported files have source/member/path/hash mapping in IMPORT_MANIFEST.json. See IMPORT_VERIFICATION.json for supplied-manifest agreement.

## Paths and wiring
- Docker/config: `Dockerfile`, `compose.yaml`, `compose.release.yaml`, `.dockerignore`
- Providers: `modules/search/port.ts`, `modules/search/core/types.ts`, `modules/search/core/provider.ts`, `modules/search/core/normalizers.ts`, `modules/search/core/service.ts`, `modules/search/core/observations.ts`, `packages/persistence/catalog.ts`, `modules/ai/port.ts`, `modules/ai/provider/`, `modules/maps/port.ts`
- Deployment/env docs: `README.md`, `README_CODEX.md`, `docs/runbooks/DOCKER_WINDOWS.md`, `docs/current/KNOWN_GAPS.md`, `compose.release.yaml`, `.env.example`, `.env.release.example`
- MAX auth: `packages/platform/auth.ts`, `packages/persistence/sessions.ts`
- MAX bridge: `apps/miniapp/bridge.ts`, `apps/miniapp/index.html`, `apps/miniapp/client.ts`
- MAX bot: `packages/platform/transport.ts`, `packages/platform/ingress.ts`, `packages/platform/governor.ts`, `packages/platform/links.ts`
- MAX api: `apps/api/app.ts`, `apps/api/main.ts`
- Provider normalizers exist for KudaGo and Timepad; generic MappedEventProvider requires injected transport. No production live importer/sync wiring found. Current catalog reads up to 100 latest JSONB observations then filters in TypeScript. Event/occurrence source refs exist but stable canonical identity and sync ledger do not.
- API2 URL already present in MaxTransport; server HMAC/timestamp validation, session cookies, CSRF/Origin and object authorization exist. Their presence is not MAX runtime acceptance.
- User state includes actors/sessions/private search contexts and shared plans. Favorites/profile/interests persistence and corresponding P0 navigation are missing.

## Commands exposed by package.json
| npm script | Definition |
|---|---|
| `verify:dependencies` | `node scripts/verify-dependencies.mjs` |
| `typecheck` | `tsc --noEmit` |
| `test:unit` | `node --experimental-strip-types --test tests/unit/*.test.ts` |
| `test:integration` | `node --experimental-strip-types --test --test-concurrency=1 tests/integration/*.test.ts` |
| `build` | `tsc -p tsconfig.build.json && node scripts/copy-assets.mjs && vite build apps/miniapp` |
| `migrate` | `node --experimental-strip-types scripts/migrate.ts` |
| `seed:test` | `node --experimental-strip-types scripts/seed-test.ts` |
| `openapi` | `node --experimental-strip-types scripts/openapi.ts` |
| `start:api` | `node dist/apps/api/main.js` |
| `start:worker` | `node dist/apps/worker/main.js` |
| `migrate:price` | `node --experimental-strip-types scripts/upgrade-price.ts` |
| `syntax` | `node scripts/check-source-syntax.mjs` |
| `test:offline` | `node --experimental-strip-types --test tests/unit/*.test.ts` |
| `typecheck:pure` | `tsc --noEmit -p tsconfig.pure.json` |

No lint script. No tracked CI workflow, no remote to inspect. No verified deployment URL. OpenAPI generator exists but generated spec and DATA-API.yaml are absent. README links to `../../RUN_ELSEWHERE.md` / `../../README.md` escape the project and are not usable repository-local instructions. `.env.release.example` exists locally but is ignored/untracked under current .gitignore.

## Fresh checks
| Check | Result | Evidence |
|---|---|
| Unit | PASS 105/105, 0 skips | logs/unit.txt |
| Typecheck | BLOCKED_DEPENDENCIES: tsc missing, exit 1 | logs/typecheck.txt |
| Build | BLOCKED_DEPENDENCIES: tsc missing, exit 1 | logs/build.txt |
| Docker info | BLOCKED_DOCKER_DAEMON, exit 1 | logs/docker-runtime.txt |
| PostgreSQL runtime/extensions | NOT_RUN; no daemon; psql unavailable | logs/psql.txt |
| PG/Redis/BullMQ integration | NOT_RUN | tests/integration/foundation.test.ts exists, not executed |
| MAX/provider/browser/deployment | NOT_RUN | no release build/live credentials used |

`COMMAND_RESULTS.json` contains exact argv, exit codes and logs. Earlier sandbox launch failed; read-only commands used approved escalation. Git used per-command safe.directory for this exact repo; global Git config was not changed. The first collector run hit a Windows console encoding error after unit tests; it was rerun with `python -X utf8`.

## Workflow audit inventory
{
  "root_agents": "AGENTS.md",
  "historical_agents": "archive/SOURCE26_AGENTS.md",
  "repo_agents_directory": false,
  "repo_codex_directory": false,
  "repo_skills": [],
  "active_git_hooks": [],
  "custom_hooks_path": null,
  "repo_mcp_config": [],
  "global_mcp_sections": [
    "mcp_servers.node_repl"
  ],
  "global_config_values_recorded": false,
  "global_agents_exists": true,
  "global_agents_bytes": 0,
  "preferred_custom_skills_present": false
}

Only environment-variable names are recorded in JSON; no secret values. Default sample Git hooks only. Existing global plugins were not changed; no third-party skills were installed. Detailed recommendations: CODEX_WORKFLOW_AUDIT.md.

## Queue gate
**BLOCKED**. Existing BullMQ is real code, not just a dependency, but runtime-green is unproven. Keep files intact while T103 verifies the existing implementation. ADR-003 does not justify pg-boss evaluation from a failed Docker launch; PostgreSQL runtime prerequisites are unknown. See QUEUE_DECISION.md.

## Conflicts and next work
See CONFLICTS.md, IMPLEMENTATION_GAP_MATRIX.md and ORDERED_IMPLEMENTATION_TICKETS.md. Human review is required before Phase 2 by the user request. Final source-preservation and scan evidence is in FINAL_VERIFICATION.json.
