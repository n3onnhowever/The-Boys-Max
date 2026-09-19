# T101/T102 execution receipt

All commands ran at D:/Dev/Repos/The-Boys-Max. Starting/ending SHA is 4f9a198d4fa2b18686efa19a59b6ac78281d341d; no commit. Working-tree source hashes supplement SHA because the T070 imports were already uncommitted.

Exact verification argv/exits/timestamps/durations and log paths: COMMAND_RESULTS.json (T102), ../t101/COMMAND_RESULTS.json (T101). Windows uses npm.cmd; README's npm commands invoke those same scripts. `capture.py` wraps subprocesses without enabling lifecycle scripts. Scripts under these evidence directories are an audit trail, not a new product command/workflow; do not rerun initialize/reconcile/complete/document/finalize to reset reviewed state.

Environment attempts before capture:
- Normal exec attempted Get-Location; git status --short; git rev-parse HEAD; Get-Content AGENTS.md; rg --files docs artifacts/preflight. Process never started: helper_unknown_error: setup refresh had errors (no process exit code).
- Explicit PowerShell shell read-only retry and Node REPL fallback hit the same sandbox setup error; no commands/edits executed there.
- Approved require_escalated shell read AGENTS/files. Initial plain git status/rev-parse were rejected by dubious ownership (no repository changes). Subsequent Git commands used `git -c safe.directory=D:/Dev/Repos/The-Boys-Max ...`; no global safe.directory or system setting changed.
- Get-Content and rg read required local task/canonical/preflight/source/config documents. One rg search with literal README* reported Windows path syntax error; both README files were then read by explicit names.

Evidence/edit commands executed with exit 0:
- python -X utf8 artifacts/t101/initialize.py (capture starting state/hash/backup; verify official/import hashes)
- python -X utf8 artifacts/t101/reconcile.py (T101 docs only)
- python -X utf8 artifacts/t101/complete.py (unchanged-code/import assertion; T101 handoff; activate T102)
- python -X utf8 artifacts/t102/review_lock.py (npm-generated lock matches manifest; node_modules absent)
- python -X utf8 artifacts/t102/document.py (README/env policy/provenance/error receipt)
- python -B -X utf8 artifacts/t102/finalize.py (handoff/current state; stop activation)
- python -B -X utf8 artifacts/t102/verify_final.py (final source/import/link/JSON/secret/diff/status checks; rerun once to include newly created final log paths in the inventory)

The underlying npm/Docker/Git commands are individually recorded in COMMAND_RESULTS.json, including nonzero typecheck/build/Docker exits. Safe examples were read; real .env files/global credential stores were not printed. PowerShell Set-Content wrote only repository-local evidence scripts. The generated artifacts/t101/__pycache__ path was resolved and checked against that exact workspace path before removing the generated cache; future evidence commands use python -B.

NOT_RUN: npm lifecycle scripts; T103 fault injection/integration suite; live MAX/provider/gate; Docker build/start/timing; PG/Redis runtime; browser; deployments. No third-party tooling installed. npm registry metadata fetch/install is the only new external dependency activity.
