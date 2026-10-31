# P22 shared foundation — blocked acceptance

Verdict: **BLOCKED_WITH_EXACT_EVIDENCE**. The dependency, toolchain, authorized harness and packaging changes are committed locally. The full integration gate is red. No push, Draft PR, hosted CI, merge, tag, deployment or package publication was performed.

Base: `164d02552de90b32fdd3dcf9c2eaddb73d8ef5bb`.
Tested implementation candidate: `0e77fbf1b11915ea2e91c5e10773ac230ac96308` (tree `0efef2cdd19548567d0ceb1da2f3890c27325117`).
Branch: `codex/povod-pretelegram-foundation`.
Worktree: `D:\Dev\Codex\Worktrees\povod-foundation\The-Boys-Max`.
This handoff is a subsequent documentation-only commit; runtime results below identify the implementation SHA they exercised.

## Inputs, authority and preservation

Read the user-authorized foundation scope, P12/P13/P11/P06 evidence, P20 repair/ownership findings, and P21 `ENVIRONMENT.md`, preservation receipt and runtime-slot protocol. P21 reached `ENVIRONMENT_READY` before installation/testing. Its readiness did not waive application failures. P22 acquired the external slot at 2026-10-31 02:56:31 +03:00, ran runtime jobs sequentially, verified owned cleanup, and released it after 03:30:57 +03:00. Release receipt: `D:\Dev\Codex\Runtime\P22-20261031-foundation.released.json`.

Fresh remote main and all historical tag objects/peeled targets at 03:29:34 +03:00 exactly match the starting receipt. Main and peeled `povod-stable-v1` remain the base SHA; stable tag object remains `0e8056b7ddbaaba315d880ce9e9c688bb8634ab2`.

Independent preservation review matched all six original/writer checkouts against both P21 snapshots, including original dirty status, staged/unstaged binary diffs, all 6,076 untracked file content hashes and ignored path inventories. Ignored contents were not read or hashed. Index hashes were unchanged during the review. P21's independent backup bundle hash still matches. No writer commit was cherry-picked.

| Writer | Preserved head |
| --- | --- |
| P15 frontend cleanup | `6a1d5116472181b6f345fd2be47e850d40794f10` |
| P16 saved batch | `e93ede6fbf26ab5f569175ca2a5085213647de7a` |
| P17 demo scenarios | `8499594781c05e09db68d70d1487d06313da011d` |
| P18 preview gate | `a9f2110cde7f367a4354bab9c04efe6b96212861` |
| P19 ICS calendar | `542407e84f96b6c7684dde0fb048c5455d4e3e3d` |

All 17 migration SQL Git blobs and `scripts/migration-fingerprint.ts` remain identical to the base. No product routes, authentication windows, catalog sources/publication policy, governor, outbox, notification policy, actor mapping, UI, Telegram, project licence or branch protection changed.

## Local commits and files

| Commit | Change |
| --- | --- |
| `3ed92d3243e0580506e797e21fceeaafb0d510f7` | Minimal dependency remediation; package manifests and matching README/requirements references |
| `1af784320ba3f56abd682fae164f56d4d08fb1e6` | Coordinated Node/npm, Docker, Compose, CI and current engineering version references |
| `1d2f9ef2897b6c59bcb2f57afe38b8c1fce1ea60` | History preflight, cleanup failure propagation/regressions, auth fixtures, four SSR fixtures, bot reconciliation fixture, browser selector, independent CI security steps |
| `0e77fbf1b11915ea2e91c5e10773ac230ac96308` | Amvera archive closure, absolute output paths, canonical export bytes and extracted-package regression/documentation |

The harness changes are in `scripts/lib/isolated-services.mjs`, new `scripts/lib/integration-history.ts`, the isolated integration runner, existing browser verifier, affected integration/unit tests and new cleanup/history test fixtures. Packaging adds `scripts/test-amvera-package.mjs` and `npm run test:package:amvera`. There are no public API/schema/authorization contract deltas. Engineering contracts now fail clearly for missing history or failed teardown; deployment archives use their build/runtime contract instead of Git-history tests.

## Dependencies and advisories

The exact original lockfile was installed with clean `npm ci` before audit. Original `npm audit --json` exited 1: three package groups (one high, one moderate, one low), representing **six distinct root advisories**, not three independent advisories. Official GitHub advisories and npm registry versions/integrities were checked afresh; candidate-version advisory queries and raw responses are retained outside Git.

| Package | Before → after | Official advisory / CVE |
| --- | --- | --- |
| zod | 4.5.4 → 4.6.6 | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), CVE-2023-54404 |
| fastify | 5.12.5 → 5.12.6 | [GHSA-389g-gv7q-r4x8](https://github.com/advisories/GHSA-389g-gv7q-r4x8), CVE-2026-107832 |
| fast-uri | 3.1.8 → 3.1.9; 4.2.1 → 4.2.3 | [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), CVE-2026-110306 |
| fast-uri | same patched resolutions | [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h), CVE-2026-110095 |
| fast-uri | same patched resolutions | [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr), CVE-2026-110180 |
| fast-uri | same patched resolutions | [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp), CVE-2026-110725 |

Only five physical dependency nodes changed: Fastify, Zod and three existing fast-uri installations. No dependency node was added or removed. The graph has 167 nodes including root and 244 declared edges. The eight changed resolved edges are:

- Root exact Fastify and Zod dependencies move to the patched versions.
- `fastify-type-provider-zod@7.0.0` retains peer ranges `fastify ^5.5.0` and `zod >=4.1.5`; their resolved root bindings change accordingly.
- `@fastify/ajv-compiler@4.0.6` and `fast-json-stringify@7.0.1` retain `fast-uri ^4.0.0`, resolving to 4.2.3.
- `ajv@8.20.0` retains `fast-uri ^3.0.1`, resolving to its existing nested node at 3.1.9.
- `json-schema-resolver@3.0.0` retains `fast-uri ^3.0.5`, resolving to its existing nested node at 3.1.9.

Fastify's outgoing dependency ranges are unchanged. Existing licences remain unchanged. No force fix, overrides, production omission or threshold reduction was used. Final complete lockfile audit exited **0**, with **zero findings in every severity**. Lockfile SHA-256: `2d3a392b294544db0b565205951152e0fb3de0aa0c9d149ec168de4db3024c19`.

## Toolchain and release image

Node 24.20.0/npm 11.19.0 become **Node 24.22.2/npm 11.19.1**, consistently across strict engine/packageManager pins, lockfile root metadata, Docker stages, Compose init, CI and current instructions. Historical measurements remain historical. A checksum-verified portable official Windows Node distribution was used; machine-global tooling was not replaced.

Base: `node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c`, same Node major and Debian/glibc family. The actual release contains embedded Undici **7.30.1**, outside the reviewed affected ranges for CVE-2026-109383, CVE-2026-109869, CVE-2026-19534 and CVE-2026-87018. Removing global npm is not the embedded Undici fix.

Only release-stage npm/npx and Yarn paths are removed. Build stages retain npm. Shell, startup commands, native dependencies, certificates and licences remain. Corepack 0.36.0 remains; this is not removal of all global tooling.

Final source-worktree image: `povod-p22-foundation:0e77fbf`, image/index digest `sha256:8924012c95acbb6b48d9fff73d77663bc2bab21b97e9612922cadc9a28d13438`. It was not pushed. Executed checks establish Linux amd64, Debian 12/glibc, UID/GID 1000, actual msgpackr native addon loading, scoped MAX CA with certificate validation enabled and unchanged global CA roots. Actual compiled migrations ran twice preserving 17 ledger rows; API readiness, actual worker startup and one successful synthetic TestTransport receipt passed. This is source-worktree image evidence, not an Amvera deployment or an archive-built image claim.

Fresh Scout SBOM indexed 249 artifacts. Full unsuppressed `docker scout cves --exit-code` exited **2 because findings exist**: **50 unique CVEs / 50 instances / 15 vulnerable source-package versions**, all Debian OS, **0 critical / 8 high / 4 medium / 38 low**. Each reports no fixed Bookworm version. P12 had 102 unique CVEs / 106 instances; 52 IDs disappeared and none were added. No application npm/global-tooling finding appears in the final scan.

Remaining high OS mappings: Perl CVE-2026-82560; util-linux CVE-2026-53613, -53615, -78408, -78409, -78410, -76642; zlib CVE-2026-85091. Actual probe found Pod::Text absent, no advertised `nsenter --join-cgroup`, empty fstab, but SUID mount/umount and blkid present. The zlib upstream-range versus Debian classification conflict remains unresolved. These observations do not establish blanket non-exploitability. Builder/global npm 11.19.1 separately retains four Undici 6.28.0 advisory mappings and two brace-expansion 5.0.9 mappings; release removal does not erase builder risk. There is no zero-container-CVE claim.

## Reproducibility corrections and remaining blockers

Auth fixtures now sign against PostgreSQL time, matching verification authority. Named negative cases use safely stale/future values; pure tests still enforce exact 3599/3600 and 300/301 second boundaries. Production authentication is unchanged.

The original unit suite reproduced port 24678 listener collisions. Four SSR-only Vite instances now set `hmr:false, ws:false`, retaining parallel tests and assertions. A fault-injection probe reproduced teardown returning normally after both Docker removals failed; cleanup now attempts all owned removals, aggregates failures, retains failed resources for retry and propagates combined startup/cleanup failure. Three new regression cases cover these outcomes. Two history tests cover clear missing-history failure and the actual complete checkout; history is checked before Docker startup.

The bot helper previously reconciled once. An external real PG/Redis probe retained `RETRY_WAIT/GOVERNOR_BEFORE_WIRE`, null wire timestamp, zero receipts, the durable next eligible time, continued deferral without reconciliation, then generation 2/attempt 2 and exactly one receipt after reconciliation. The helper now models the existing one-second worker reconciliation loop within the original 15-second limit. A new integration regression asserts that sequence and failure diagnostics include outbox/attempt/receipt state. This proves the induced mechanism; it does not retroactively prove the cause of earlier P06/P11 timeouts.

The browser verifier's old `.status-panel[role="alert"]` selector timed out. Captured DOM showed `.launch-state-screen [role="alert"]`; the narrow verifier correction passed all eight browser checks and three negative controls with zero JavaScript errors. Session-ready UI was not changed.

**Unresolved acceptance blockers:**

1. `tests/integration/demo-catalog.test.ts:123`: the positive fixture uses host `Date.now()` for rights/provenance. In the diagnostic run, the selected positive observation `956556c2-bcc1-4b54-bdaf-d24eaffc641e` had review time `2026-10-31T00:21:54.301Z`, while actual PG evaluation was `00:21:53.819Z`, **482 ms earlier**. Trace 676/681/683 proves the intended observation was selected; ordering was correct. Rights checks returned UNKNOWN/RIGHTS_UNVERIFIED and excluded it. This demonstrates a fixture clock-authority mismatch, not defective production rights enforcement. The authorized clock repair list names auth fixtures; no catalog fixture, source or rights/publication policy was changed here.
2. `tests/integration/foundation.test.ts:148`, IT-10: final full suite timed out waiting for `WIRE_ENTERED` after 15.42 seconds. Its cause remains unexplained. A single purposeful diagnostic of the unchanged full foundation file subsequently passed 14/14: READY, WIRE_ENTERED, SIGKILL, one wire-fenced attempt/receipt, then UNKNOWN/LEASE_RECOVERY. Its 86 snapshots contained no no-wire deferral or capture error. That success does not erase the earlier failure or justify classifying it as infrastructure.
3. Legacy destination test in `tests/integration/max-bot.test.ts:196` failed in the initial full suite and repetition 2/3; it passed later runs. Cross-authority fixture timestamps are plausible, but retained failure state does not prove that diagnosis. No destination policy/test change was made.

## Packaging closure

The actual baseline ZIP omitted `scripts/migration-fingerprint.ts`. The complete current build/import/runtime closure was reviewed, including TypeScript imports, Lua, scoped CA, frontend assets, licences, four curated data files, release COPY inputs and Amvera startup inputs. The helper is now included. Absolute output paths are handled correctly.

The new regression initially caught Git's inherited `core.autocrlf=true` converting archive text bytes. Evidence proves `.dockerignore` differed only by CRLF versus canonical LF. The packager now invokes Git archive with `core.autocrlf=false` and `core.eol=lf`; no SQL blob or checksum acceptance policy changed.

The final actual archive was safely extracted into a clean external directory. Every member matched its HEAD Git blob; all 17 SQL files matched; prohibited paths were absent. Clean lock-exact install/build passed, required compiled/runtime inputs existed, development dependencies were pruned, and compiled migrations ran twice with identical hashes and applied_at ledger. No Git-history engineering tests were required inside the archive. Owned containers/volumes were verified absent and the successful temporary extraction removed.

ZIP SHA-256: `3c19a79d237a267d7382aab8f9e96bd7457cdae5b1f94501f108ad2ee5b54ba4`. It remains local under the final package evidence directory. No secrets were detected in the checked source/history; the archive matches checked source bytes and excludes prohibited paths, evidence, node_modules, private backups and presentations. The secret scan remains a pattern scan, not a guarantee that every possible secret format is recognized.

## Executed gates and attempts

All final ordered gates below used clean implementation SHA `0e77fbf1b11915ea2e91c5e10773ac230ac96308`. `final2-gates.ps1`, `final2-gates.json` and `commands.jsonl` retain exact executable paths, arguments, exits, source/tree/lock/diff hashes and log hashes. Failed gates did not suppress independent checks.

| Gate | Result |
| --- | --- |
| Clean `npm ci` | PASS, exit 0, 136 installed packages |
| `npm run typecheck`; `npm run typecheck:pure` | PASS, both exit 0 |
| `npm run test:unit` | PASS, 372/372, zero skipped |
| `npm run test:integration:isolated` | FAIL, 141/143, 2 failures, zero skipped |
| Standalone isolated cross-EOL file | PASS, 9/9; also all 9 passed inside full suite |
| `npm run demo:portfolio -- --smoke` | PASS; includes build; 48 synthetic occurrences and nine HTTP journey paths |
| Existing integrated browser verifier, `--no-capture` | PASS; 8 checks, 3 negative controls, zero JS errors |
| `docker build --platform linux/amd64 --pull --target release --build-arg SOURCE_SHA=0e77fbf...` | PASS, exit 0; full SHA/command in receipt |
| `npm run test:package:amvera -- --evidence=<external directory>` | PASS, exit 0; actual archive build and compiled migration runtime |
| `npm audit --json` | PASS, exit 0, zero findings, production dependencies included |
| `npm run scan:secrets` | PASS, exit 0; 2,153 reachable history blobs, 448 working files, zero findings/prohibited/oversized paths |
| `git diff --check`; `git status --short` | PASS; clean implementation worktree |
| Release native/TLS and API/worker runtime probes | PASS; synthetic transport only |
| Release SBOM / full vulnerability scan | SBOM exit 0; CVE scan exit 2, findings detailed above |
| Push / Draft PR / exact-head hosted CI | NOT_RUN: required local integration gate failed |
| Real MAX/provider/TLS handshake, Amvera deployment | NOT_RUN; no paid calls or deployment authorized/performed |

Retained test attempts, without cherry-picking successful outcomes:

- Original lock/base unit suite: 367/367; dependency-only unit suite: 367/367.
- Reproducibility development unit suite: 372/372; first final implementation unit suite: 372/372; final source unit suite: 372/372.
- Original full integration: 139/142 (catalog, legacy destination, MAX-AUTH-02 failures).
- First final full integration at `af406ff270f4638ddcc282c02e77e33959264d55`, before the packaging EOL correction: 142/143 (catalog failure).
- Final full integration at `0e77fbf...`: 141/143 (catalog and IT-10 failures).
- Three purposeful repetitions: auth 14/14 each; SSR 19/19 each; bot 16/16, 15/16, 16/16. The one bot failure is legacy destination; reply routing and the new deferral regression pass all three. Failure-only logging was expanded during these development repetitions; later full suites ran clean committed source.
- Standalone cross-EOL: 9/9 in each of two runs.
- Instrumented catalog/bot diagnostic: 38/39, catalog failure with exact state above.
- Instrumented full foundation-file diagnostic: 14/14; prior IT-10 failure remains unresolved.
- Browser: first verifier run failed on the stale selector; corrected development and both final runs passed.
- Packaging: baseline absolute-path invocation failed; relative baseline export succeeded and proved omission. New archive regression initially failed canonical-byte comparison; corrected validation and final repeated archive regression passed. These failures remain recorded.

The additional unit inventory is two history plus three cleanup tests; the integration inventory adds one no-wire deferral regression. No test was removed or skipped. External diagnostic observers preserve SQL/assertions but add measurement load; their results are distinguished from uninstrumented full-suite gates.

## Evidence and next action

All raw audit/runtime evidence is outside Git under `D:\Dev\Codex\Evidence\povod-pretelegram-recovery\P22`:

- `run-20261031-foundation/commands.jsonl`, `test-inventory.json`, `final2-gates.json`, full logs, resource manifests, release image/SBOM/SARIF, package receipts and `runtime-cleanup-summary.json`.
- `dependency-research/graph.before.json`, `graph.after.json`, `actual-edge-delta.json`, official advisory/registry receipts and independent review.
- `toolchain-research/REVIEW.md`, actual image probes and `final-image-risk-review.md/json`.
- `packaging-research/catalog-clock-diagnosis.md/json`, deterministic bot probe, full foundation diagnostic and source-bound closure review.
- `preservation-review/report.json` and integrity manifest (SHA-256 `c1c49d62df67d456988e0da77017deea6eeb447fc3ed2eb27a32dd18280d20da`).

Final cleanup checked 34 known container IDs/prefixes and 30 recorded volumes against an independent inventory; none remained. No foundation Node/browser process remained. The old unverified portfolio pair/orphan volume and unrelated FSP/LSP/BuildKit resources were preserved. Local built images are retained for review.

There is **no validated descendant base yet**. Keep writer lanes preserved. `0e77fbf...` is the local implementation candidate for a bounded follow-up: authorize the demonstrated catalog-fixture clock correction, diagnose IT-10 and legacy-order intermittency with retained state, then run all gates and fresh exact-head hosted CI before accepting a new base. Do not describe this candidate as FOUNDATION_READY_FOR_REPAIR_LANES.
