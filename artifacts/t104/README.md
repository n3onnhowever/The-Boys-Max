# T104 — Evidence usage

Baseline: `5e4973f24fb74489387b3c29313cfcd1e8401ca7`. Branch: `codex/t104-kudago-gate`. API: **v1.4**. Probe UTC: `2026-09-19T07:32:05.613939+00:00` — `2026-09-19T07:43:09.112800+00:00`.

Raw-response SHA-256 and per-request provenance: [RECEIPT_INDEX.json](RECEIPT_INDEX.json), index file SHA-256 `8492a25ff24798859b87a66374875550b6fa1317c86aadedc7fc8ceacdd8aae0`. This metadata applies to linked logs and derived evidence.

Это isolated runtime/data ticket. Изменения только artifacts/t104 и docs/handoffs/T104_KUDAGO_RUNTIME_GATE.md. Production code/schema/dependencies/imported inputs не изменены; T103/T105/T106/T107/main не затронуты; push не выполнялся.

Evidence metadata наследуется из шапок отчётов, RECEIPT_INDEX.json и COMMAND_RESULTS.json. API receipt response_hash — SHA-256 исходных HTTP entity bytes до JSON parsing; file_sha256 — hash sanitized receipt file. Не смешивать эти хэши. Full raw bytes не хранятся; это deliberate minimal-retention evidence, не legal determination. SOURCE_HASHES/command manifests описывают проверенную revision.

- MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json: 12 task receipts + independent decisions.
- TASK_MATRIX.md, DATA_GATE_REPORT.md: результат и границы утверждений.
- NORMALIZER_REPLAY.json: unmodified baseline full records, отдельно single-date experiments и synthetic stale/partial checks.
- PRICE_SAMPLES.json, PRICE_EDGE_CASES.md, OCCURRENCE_OBSERVATIONS.md: T105 inputs.
- API_OPERATIONAL_OBSERVATIONS.md, OPERATIONAL_STATS.json: T107 inputs.
- KUDAGO_MANUAL_QUESTIONS.md, KUDAGO_MINIMAL_SAFE_DATASET.md: manual decision inputs, not sent.
- receipts/: factual sanitized HTTP receipts and raw response hashes.
- COMMAND_RESULTS.json/logs/: exact argv, exit codes, timings, source manifests. Bootstrap/collection summaries reconstructed from recorded receipts are labelled, not claimed as original stdout.
- FINAL_VERIFICATION.json: checks and preservation; FILES_CHANGED.md: file list.

Network scripts use only Python stdlib, sequential requests with 1.2s spacing, 25s timeout, max four pages/query (one page for bounded edge scan), no automatic retry. Execution cost: no paid services. Repeat only when fresh evidence is needed, preserving existing committed receipts first. Code is project-owned original probe tooling; no third-party code/assets imported. Command logs are normalized to UTF-8/LF with trailing whitespace removed; original captured-output hashes remain in COMMAND_RESULTS.json. Local .gitattributes pins LF for evidence integrity. Local dependencies installed by npm ci --ignore-scripts in this worktree only, versions unchanged; existing T102 Drizzle declaration patch invoked by baseline scripts.

NOT_RUN: Docker/PG/Redis/MAX/browser/UI checks, actual importer, production transport acceptance, real timeout/429/5xx, API edit/cancel/delete transitions, long-term stability, legal clearance. These are not mislabeled PASS.
