# Isolated portfolio baseline checks

`.github/workflows/portfolio-baseline.yml` runs on Ubuntu 24.04 for pull requests, main/codex branch pushes and manual dispatch. It uses Node 24.20.0, npm 11.19.0 and the committed npm lockfile. The platform-neutral Node integration harness creates its own fresh PostgreSQL/Redis containers and random loopback ports. No pre-existing local database, Windows path, production credential, MAX account or GigaChat key is required.

Checks: clean npm ci, both typechecks, every unit/integration test, build, offline demo HTTP smoke, npm audit, current + HEAD-reachable-history repository secret/prohibited-file scan, whitespace check and release Docker image build. The workflow does not deploy, publish images, upload private runtime logs or reference production secrets. GitHub token permissions are read-only; checkout does not persist credentials.

Pinned tooling (verified from official sources on 2026-10-17):

| Source | Pin / license | Adapted path / notice |
| --- | --- | --- |
| [actions/checkout](https://github.com/actions/checkout/tree/11d5960a326750d5838078e36cf38b85af677262) | v4 `11d5960a326750d5838078e36cf38b85af677262`; MIT | workflow invocation only; no source copied |
| [actions/setup-node](https://github.com/actions/setup-node/tree/49933ea5288caeca8642d1e84afbd3f7d6820020) | v4 `49933ea5288caeca8642d1e84afbd3f7d6820020`; MIT | workflow invocation only; no source copied |
| Docker Official PostgreSQL | 18.6, digest `74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336` | existing service version; `scripts/lib/isolated-services.mjs` |
| Docker Official Redis | 8.2.9, digest `66b7f4c2f3c6ef1b298bbd7b13c806bc6f71e61f1136a4f58710daf2cb053b21` | existing service version; `scripts/lib/isolated-services.mjs` |

Docker's Node release base remains pinned by the existing Dockerfile digest. Ubuntu's hosted runner image receives GitHub maintenance updates; it is not a frozen VM snapshot. Local reproduction uses the documented npm commands and Docker; a green local run is not evidence that GitHub hosted Actions has executed. GitHub execution requires a later owner-authorized push/PR. No workflow run is triggered by this local-only sprint.

Secret scanning is the existing dependency-free repository pattern scanner, with its existing blob/rule/line-specific synthetic exceptions. It scans reachable Git blobs and tracked/nonignored working files; compressed archive payloads are not unpacked. It is evidence of the stated checks, not a guarantee of recognizing every possible credential format.
