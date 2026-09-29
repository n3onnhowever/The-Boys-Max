# Commands and evidence

All shell commands ran from D:/Dev/Repos/The-Boys-Max. Standard sandbox and Node REPL startup failed before execution (`helper_unknown_error: setup refresh had errors`). Approved escalated shell was used after that. Initial plain Git calls encountered repository ownership mismatch; subsequent calls used only the per-command `-c safe.directory=D:/Dev/Repos/The-Boys-Max`, without editing global config.

Exact machine-readable commands/exit codes for runtime checks: COMMAND_RESULTS.json. Persisted stdout/stderr: logs/*.txt. No secrets or environment values were requested.

Commands actually executed:
- `git status --short`, `git rev-parse HEAD`, `git branch --show-current` (initial ownership failure); then the same with scoped safe.directory.
- Scoped Git: `remote -v`, `ls-files`, `config --name-only --list`, `config --get core.hooksPath`, `check-ignore .env.release.example`, `diff --check`, `status --short`.
- PowerShell `Get-Content`, `Get-ChildItem`, `Get-Item`; `rg --files` / `rg -n` over task/source/config/doc paths. One rg command passed literal README* on Windows and errored for that argument; README.md/README_CODEX.md were read explicitly in other calls.
- `node --version`; `npm --version`; `python --version`; `docker --version`; `docker compose version`; `docker info --format '{{.ServerVersion}}'`; `psql --version` (missing executable).
- `npm run test:unit` — PASS 105/105. The collector was rerun after a console-encoding failure, so this suite ran twice; final run saved.
- `npm run typecheck`; `npm run build` — both exit 1, tsc unavailable. No dependencies were installed and no build output was produced.
- `python artifacts/preflight/import_handoff.py` — byte-preserving ZIP import and SHA-256 manifest; script refuses overwrites.
- Bundled Python `artifacts/preflight/read_sources.py` — pypdf reads exact 22-page case and zipfile CRC checks. First printed Cyrillic output was damaged by console encoding; UTF-8 file was read correctly through Get-Content.
- `python -X utf8 artifacts/preflight/read_research.py` and `summarize_research.py` — read topic summaries/blockers, configuration section names only.
- `python -X utf8 artifacts/preflight/collect_runtime.py` — runtime logs (first invocation without -X utf8 failed while printing an otherwise passed test).
- `python -X utf8 artifacts/preflight/write_receipts.py` — receipt/index/authority/task/manifests. This captures the tracked-file baseline before modifying ACTIVE_TASK; do not rerun it to replace that baseline.
- `python -X utf8 artifacts/preflight/write_analysis.py` — documentation analysis.
- Bundled Python `import fitz` render attempt — failed: ModuleNotFoundError.
- `pdftoppm -f 10 -l 10 -scale-to 1600 -singlefile -png 'input/official/Досуг и развлечения.pdf' artifacts/preflight/official-case-page-10` — PASS. Image sandbox failed; approved shell read the rendered image and it was visually inspected.
- `python -X utf8 artifacts/preflight/finalize_preflight.py` — source/import integrity, secret/prohibited-file heuristic scan, JSON checks, git diff/status and output inventory.

Read-only official OpenAI docs lookup for skill organization: searched Codex skills/AGENTS; customization URL returned 404; successfully fetched https://learn.chatgpt.com/docs/build-skills via https://developers.openai.com/codex/skills/. No other web/provider/MAX calls executed.

NOT_RUN: npm ci/dependency install, lint (absent script), integration suite, migrations, Docker build/up/timing, live PG/Redis checks, provider probe, MAX delivery/login/runtime, browser target screenshots, deployment, third-party donor execution. No imported kickoff prompt/probe/script was executed.
