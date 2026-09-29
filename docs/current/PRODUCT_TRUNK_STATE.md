# Product trunk state — 2026-09-22

- Source main: 1e4a7a2b454bed87bdcb40559773143c2fc38c9b.
- Integrated source SHAs: cleanroom policy 1176eb3ae7e84315b9c3f0107c19232c8b2cffc4; MAX runtime bbe233b6fce98e362da0d29e4824353de4be4a75; UI v1 6cc7311aa2ad882437946a7970245704527732c6; UI quality safe fix 989bfcf53912ea594e12ccb7884f64009cf3ffc2.
- Verified application result: 7fbe5950f41cba4b310f5d1180121e174bd61496 on codex/product-trunk. The delivery commit SHA is recorded in the package RESULT_SHA.txt.
- UI: 17 accepted screens and variants captured at 390 × 844; 16 exact post-quality image matches, with small repeat-variable pixels on Home; keyboard quality and fixture isolation pass. Plans remain a design preview and do not expand frozen P0.
- MAX: scoped TLS, transport outcomes, Bot UX, auth/session/Bridge and durable webhook regressions pass. Read-only no-token /me smoke returns the expected 401.
- Repo/Docker: clean lockfile install, context exclusions, release image audit and exact-image PostgreSQL/Redis integration pass. One raw image signature matched pinned public GnuTLS self-test constants and was adjudicated.
- Checks: focused MAX 125/125; focused UI 40/40; PostgreSQL integration 36/36; full unit 243/243; typecheck, pure typecheck, dependency check, production build, Docker build, diff check and source/secret scan pass. See [verification summary](../../artifacts/product-trunk/VERIFICATION_SUMMARY.md).
- Remaining P0 blockers: T105 mapping; durable solo Save; basic «Мой Повод»; catalog LIMIT-before-filter; controller 422 pending-state; destination overwrite race; Moscow provider/data gate; production hosting; real MAX Web/Android/iOS acceptance. T104 DATA_RUNTIME_GATE=FAIL and LEGAL_MANUAL_GATE=OPEN; Moscow is not activated.
- Next task: T105 data-safety/domain implementation.
