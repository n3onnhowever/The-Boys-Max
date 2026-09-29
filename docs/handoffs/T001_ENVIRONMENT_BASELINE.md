# T001 — Environment baseline

Date: 2026-09-16
Environment: Windows/Codex PowerShell, `D:\Dev\Repos\The-Boys-Max`

## Source and repository baseline

- Inputs read: `AGENTS.md`, `docs/current/PROJECT_STATE.md`, `docs/current/KNOWN_GAPS.md`, and `docs/tasks/001_ENVIRONMENT_BASELINE.md`.
- Repository root inspected: `D:\Dev\Repos\The-Boys-Max`.
- Git baseline commit: unavailable. The directory is not a Git working tree; `git rev-parse --show-toplevel`, `git rev-parse HEAD`, and `git status --short` each returned `fatal: not a git repository`.
- Working-tree status: unavailable for the same reason; no source files were modified.

## Evidence table

| Capability | Result | Classification / evidence |
|---|---|---|
| Node | `v24.19.0` | **installed and runnable**. Resolved from `C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`. Note: this differs from the prior project note (`v24.20.0`). |
| npm | Not found | **unavailable**. `npm`, `npm.cmd`, and the common `C:\Program Files\nodejs` locations were not found by this shell. `npm -v` and `npm ping` could not run. |
| npm registry network | TCP reachable; npm client check not executable | **reachable at TCP level, npm ping NOT_RUN/BLOCKED**. `Test-NetConnection registry.npmjs.org -Port 443` returned `TcpTestSucceeded=True`; HTTPS request failed with `The SSL connection could not be established`. |
| Git | `2.55.0.windows.3` | **installed and runnable**. |
| GitHub connectivity | TCP reachable; Git transport failed | **reachable at TCP level, GitHub operation BLOCKED**. `Test-NetConnection github.com -Port 443` returned `TcpTestSucceeded=True`; `git ls-remote https://github.com/EventHive/eventhive.git HEAD` failed with Schannel `SEC_E_NO_CREDENTIALS (0x8009030e)`. No TLS settings were changed. |
| Docker CLI | Not found | **unavailable**. `docker`/`docker.exe` were not found on PATH or in common Docker Desktop locations. |
| Docker Compose | Not found | **unavailable**. `docker compose version` could not run because Docker CLI was unavailable. |
| Docker daemon | Not testable from this shell | **unavailable / NOT_RUN**. Docker CLI was absent, so `docker info` could not be executed. `DOCKER_DAEMON_DOWN` is not asserted because the CLI itself was not available. |
| Package metadata | Read successfully | `package.json` inspected; scripts and dependencies recorded without executing or changing them. |

## Package scripts observed

`verify:dependencies`, `typecheck`, `test:unit`, `test:integration`, `build`, `migrate`, `seed:test`, `openapi`, `start:api`, `start:worker`, `migrate:price`, `syntax`, `test:offline`, and `typecheck:pure`.

## Checks not run / blocked

- `npm -v` and `npm ping`: **BLOCKED_NPM_UNAVAILABLE**.
- `git status --short` and commit capture: **BLOCKED_NOT_A_GIT_REPOSITORY**.
- `git ls-remote`: **BLOCKED_TLS_SCHANNEL** after TCP connectivity succeeded.
- Docker version, Compose version, and `docker info`: **BLOCKED_DOCKER_CLI_UNAVAILABLE**.
- No package installation, update, repair, service start, source edit, or system/network reconfiguration was performed.

## Contract deltas

None.

## Residual risks and next action

The current Codex PATH/runtime does not expose npm or Docker, and local Schannel cannot establish the tested HTTPS connections. The next concrete action is an environment-owner investigation of the Codex runtime PATH/TLS credential availability and Docker installation visibility; do not change system policy or repair Docker/WSL as part of T001.
