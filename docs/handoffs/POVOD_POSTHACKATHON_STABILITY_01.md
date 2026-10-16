# POVOD Post-Hackathon Stability Sprint 01

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

## Remaining acceptance

Catalog, clocks, offline demo, CI, final checks and documentation are in progress. No runtime PASS is inferred from old 330/330 or 100/100 evidence.

## Boundaries and owner decisions

- License: **OWNER_REQUIRED**; no open-source license selected.
- K1 AI semantics, K2 durable AI state, K4 MAX revocation ordering, K5 RSVP reminders, K6 notification pagination and K7 preference concurrency remain deferred to a separate correctness sprint.
- No Telegram, providers/events, historical migration rewrites, real source data edits, visual redesign, deployment, stable tag, push or merge.
