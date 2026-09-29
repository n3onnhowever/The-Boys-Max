# Product trunk verification summary

Source under test: 7fbe5950f41cba4b310f5d1180121e174bd61496. Node v24.20.0, npm 11.19.0; Docker client/server 29.7.2. All successful command exits below were 0. Committed log paths and Git-blob SHA-256 values are in LOG_SHA256.json. The generated evidence and handoff are a later documentation commit; they do not change application, build, test or Docker inputs.

| Check | Exact command or invocation | Result and evidence |
|---|---|---|
| Clean lockfile install | npm.cmd ci --ignore-scripts --no-audit --no-fund | Exit 0; 136 packages; verification/npm-ci.txt |
| Dependency boundary | npm.cmd run verify:dependencies | Exit 0; verification/dependencies.txt |
| Focused MAX | node --experimental-strip-types --test tests/unit/max-bot.test.ts tests/unit/max-tls-scope.test.ts tests/unit/max-tls-trust.test.ts tests/unit/max-transport.test.ts tests/unit/miniapp-bridge.test.ts tests/unit/miniapp-client.test.ts tests/unit/security.test.ts | Exit 0; 125/125; verification/focused-max-final.txt |
| Focused UI | node --experimental-strip-types --test tests/unit/home-view-model.test.ts tests/unit/home-system-reset.test.ts tests/unit/home-system-state.test.ts tests/unit/search-ui-state.test.ts tests/unit/detail-view-model.test.ts tests/unit/saved-ui-state.test.ts tests/unit/profile-ui-state.test.ts tests/unit/plans-ui.test.ts tests/unit/ui-integration.test.ts | Exit 0; 40/40; verification/focused-ui-final.txt |
| Full unit | npm.cmd run test:unit | Exit 0; 243/243; verification/full-unit-final.txt |
| Typecheck | npm.cmd run typecheck | Exit 0; verification/typecheck-committed.txt |
| Pure typecheck | npm.cmd run typecheck:pure | Exit 0; verification/typecheck-pure-final.txt |
| Production build | npm.cmd run build | Exit 0; 195 Vite modules; verification/build-committed.txt |
| UI 390 × 844 smoke | node scripts/verify-povod-integrated.mjs --output=artifacts/product-trunk/ui-smoke --widths=390 | Exit 0; 17 captures, eight browser interaction groups, three normal-runtime negative controls; verification/ui-smoke-final.txt and ui-smoke/browser-audit.json |
| UI keyboard | node D:/Dev/Repos/The-Boys-Max-ui-quality/tools/ui-final-gate/keyboard-probe.mjs against local preview | Exit 0; focus entry/wrap/restore, inert background, reduced motion; verification/QUALITY_KEYBOARD_RECEIPT.json |
| Successful-runtime fixture boundary | Accepted quality runtime probe against local preview and labeled fake API | Exit 0; five synthetic API scenarios; no design chunk, supplied artwork, fake service or unsupported promotion/proximity claim; verification/FIXTURE_BOUNDARY.json |
| Docker context and build | node artifacts/product-trunk/verification/tools/build-release.mjs | Exit 0; no-cache marker context 27/27 excluded, 10/10 retained; exact release image sha256:0b0867b31634ae4bc12b4a4fedcc447182c5709fe8a13fe875ce07c56ed1ea4d; verification/DOCKER_CONTEXT.json and EXACT_IMAGE.json |
| PostgreSQL/Redis and transport in exact image | node artifacts/product-trunk/verification/tools/run-image-integration.mjs | Exit 0; migrations, 35/35 transport/TLS/Bot checks, 36/36 PostgreSQL integration checks; verification/TRANSPORT_EVIDENCE.json and POSTGRES_INTEGRATION.json |
| Release rootfs scan | python artifacts/product-trunk/verification/tools/audit-image.py, then node artifacts/product-trunk/verification/tools/adjudicate-gnutls.mjs | Raw scanner exit 1 on one public GnuTLS self-test constant signature; exact pinned upstream comparison 10/10 PASS. Final adjudicated status PASS; 14,015 files / 286,369,497 bytes scanned; zero forbidden paths, missing inputs or dev dependencies. Raw and final receipts preserved. |
| Read-only MAX smoke | node artifacts/product-trunk/verification/tools/tls-smoke.mjs | Exit 0; no token; scoped /me TLS authorized and HTTP 401; missing trust/wrong host rejected; unrelated example.com HTTP 200 before/after; verification/max-sanitized-smoke.json |
| Ignore/context/source safety | git check-ignore harmless markers; Docker context marker probe; python artifacts/product-trunk/verification/tools/scan-source.py | 12/12 ignore probes; 27/27 forbidden context paths absent; 0 prohibited tracked paths or strong text signatures across 1,243 paths / 34,023,501 text bytes; artifacts/product-trunk/REPO_DOCKER_SAFETY.json |
| Diff check | git diff --check | Exit 0 after source integration; rerun after evidence commit. |

Visual reference: 16/17 screenshots exactly match the accepted post-quality 390 × 844 captures. Home differed by 187 of 329,160 pixels on the first capture and 127 on a repeat; the two repeats differed by 101 pixels themselves. The browser assertions and keyboard checks passed. See UI_VISUAL_RECEIPT.json. The local preview servers were stopped.

MAX coverage specifically exercises scoped trust, read-only /me, 401/429/UNKNOWN classifications, initData, CSRF, Origin, ACL, Bot command construction and durable webhook outcomes through focused and exact-image integration checks. No token-bearing or mutating live MAX request was made.

NOT_RUN / external acceptance: real MAX Web/Android/iOS, production hosting, Moscow live provider/data gate and legal/manual gate. Those remain separate work. The source scan avoids reading ignored credentials and skips opaque archive/media contents (104 paths); Docker context and rootfs checks are separate evidence for release containment. Only harmless synthetic markers were used in ignore/context tests.
