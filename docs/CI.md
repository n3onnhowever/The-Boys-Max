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

Docker's Node release base remains pinned by the existing Dockerfile digest. Ubuntu's hosted runner image receives GitHub maintenance updates; it is not a frozen VM snapshot. Local reproduction uses the commands in [VALIDATION](VALIDATION.md) and Docker.

Hosted execution has completed successfully for all three accepted stacked PR heads:

| Measurement date (Europe/Moscow) | Exact source SHA | Successful hosted push run | Unit / integration |
| --- | --- | --- | --- |
| 2026-10-17, Stability 01 | `dca0036bb3a39f7a099c923d7dfd32e03e891b00` | [38985716207](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/38985716207) | 340 / 103 |
| 2026-10-19, Correctness 02A | `d1185f047bef3e1998d4ff87a390214b72916a45` | [39174983138](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/39174983138) | 359 / 119 |
| 2026-10-20, Correctness 02B + migration portability | `0c0c2a528e6daf523a74df0e3c5747482196b5c1` | [39483652475](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/39483652475) | 367 / 142 |

The candidate also passed [PR run 39483658871](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/39483658871). These are historical, source-pinned measurements. Documentation head `3d54fecc84d03e1e148d5ef2736bd5a08a1d230a` subsequently failed npm audit in [push run 39491393265](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/39491393265) and [PR run 39491407692](https://github.com/n3onnhowever/The-Boys-Max/actions/runs/39491407692): Vite 8.2.2, [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv), one moderate finding. The targeted patch pins Vite 8.2.4; [VALIDATION](VALIDATION.md#vite-security-patch) records its source and local results. Both fresh push and PR workflows for the patched candidate and the exact integrated main commit must succeed before tagging; an older result cannot satisfy that gate. Inspect the run's `headSha`, event, job steps and logs. Push runs validate the exact branch commit; pull-request workflow checkout uses GitHub's test merge commit. [Main push runs](https://github.com/n3onnhowever/The-Boys-Max/actions?query=branch%3Amain+event%3Apush) retain the final integration evidence.

The integration step includes `tests/integration/migration-eol.test.ts`: nine PostgreSQL scenarios explicitly create LF and reviewed legacy CRLF files on Ubuntu, reproduce failures using the old runner, and require the repaired runner to preserve ledger and business data. No portability test is skipped because the host uses LF. See [the checksum contract](DEPLOYMENT.md#migration-checksum-contract).

`npm audit` measures application dependencies. The workflow builds the release image but does not scan container OS packages: the previously reported 27 high/critical image advisories require separate review before public hosting. A successful workflow does not establish an advisory-free container or live MAX/GigaChat operation.

Secret scanning is the existing dependency-free repository pattern scanner, with its existing blob/rule/line-specific synthetic exceptions. It scans reachable Git blobs and tracked/nonignored working files; compressed archive payloads are not unpacked. It is evidence of the stated checks, not a guarantee of recognizing every possible credential format.
