# T001 — Local environment baseline

> Historical task; inactive. Follow [ACTIVE_TASK](ACTIVE_TASK.md). The T101/T102 authorization supersedes this old work order.

Recommended: GPT-5.3-Codex / low

Goal
Establish a reproducible Windows/Codex baseline without modifying application behavior.

Inputs / authority
- AGENTS.md
- docs/current/PROJECT_STATE.md
- current repository tree

Do
1. Record `node -v`, `npm -v`, `git --version`, `npm ping`.
2. Run `docker info` and `docker compose version`.
3. If Docker daemon is stopped, report `DOCKER_DAEMON_DOWN`; do not repair WSL or system policy automatically.
4. Run `git status --short`.
5. Inspect package.json and existing npm scripts only.
6. Produce `docs/handoffs/T001_ENVIRONMENT_BASELINE.md`.

Do not
- install/update packages;
- change source;
- change DNS/TLS/VPN/proxy;
- start paid services.

Acceptance
A concise evidence table distinguishes installed CLI, reachable network, and actually running Docker daemon.
