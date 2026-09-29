import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'t101'))
from capture import *
def put(path,text): (ROOT/path).write_text(text.strip()+'\n',encoding='utf-8')
put('docs/tasks/ACTIVE_TASK.md','''# Active task

**No implementation ticket is active. Awaiting human review after T102.**

- T101: PASS — [handoff](../handoffs/T101_SCOPE_GOVERNANCE.md).
- T102: PARTIAL — [handoff](../handoffs/T102_DEPENDENCY_BUILD_BASELINE.md). Install/lock/unit/syntax passed; typecheck/build failed; Docker daemon blocked.
- Do not start T103/T104/T105/T106 or any later ticket in this pass.
- Resume T102 compiler/Docker blockers only after review and explicit next-task activation. One integration owner retains contracts/routes/migrations/dependencies/auth/session ownership; at most one implementation ticket and one writer.

Historical T001 → T010 → T070 pointers do not authorize work.
''')
p=ROOT/'docs/tasks/102_DEPENDENCY_BUILD_BASELINE.md';s=p.read_text(encoding='utf-8').replace('Status: ACTIVE; T101 accepted. Authorized by 2026-09-19 user request.','Status: PARTIAL / awaiting human review; no active implementation. See docs/handoffs/T102_DEPENDENCY_BUILD_BASELINE.md.');put('docs/tasks/102_DEPENDENCY_BUILD_BASELINE.md',s)
p=ROOT/'docs/current/KNOWN_GAPS.md';s=p.read_text(encoding='utf-8').replace('- T102: dependency resolution/real lock, clean install, typecheck/build and Docker one-command reproduction need fresh evidence. Preflight Docker was BLOCKED_DOCKER_DAEMON; image tags are not observed versions.','- T102: lock generation/clean install/metadata/syntax passed; unit 105/105. Typecheck failed (89 diagnostics), build failed (83 diagnostics); see artifacts/t102/BUILD_BLOCKERS.md. Docker info freshly returned BLOCKED_DOCKER_DAEMON; build/start/timing and PG/Redis reachability are NOT_RUN. Compose configuration validates statically; image tags remain declarations.');put('docs/current/KNOWN_GAPS.md',s)
p=ROOT/'docs/current/PROJECT_STATE.md';s=p.read_text(encoding='utf-8');s+='\nT101 PASS; T102 PARTIAL and stopped for human review. Fresh lock/clean install/metadata/syntax/unit passed. Typecheck/build failed on real compiler diagnostics; Docker daemon unavailable. See [T102 handoff](../handoffs/T102_DEPENDENCY_BUILD_BASELINE.md). No next ticket active.\n';put('docs/current/PROJECT_STATE.md',s)
put('docs/handoffs/T102_DEPENDENCY_BUILD_BASELINE.md','''# T102 — dependency and build baseline

**Status: PARTIAL. Stopped for human review; T103+ NOT STARTED.**
Starting/ending HEAD: `4f9a198d4fa2b18686efa19a59b6ac78281d341d`, branch main. No commit. Starting tree already contained T070 preflight/import changes; this pass preserves them. Source revision includes working-tree hashes, not SHA alone.

Inputs: T101 handoff; package.json/.npmrc; existing verification scripts and TS configs; Docker/compose/env examples; official case/freeze/spec/patch/contract/ADRs/synthesis verified in artifacts/t101/SOURCE_VERIFICATION.json. Exact source hashes: artifacts/t101/BASELINE_HASHES.json; final file inventory/hashes: artifacts/t102/FILES_CHANGED.json and FINAL_SOURCE_HASHES.json.

Changes: real npm-generated package-lock.json; .gitignore admits existing safe .env.release.example (bytes unchanged); repository-local README; explicit missing donor-provenance notice; current task/state/gaps and evidence. No dependency pins, app/UI/auth/queue/Event/Occurrence/schema/compiler settings, Docker config or runtime behavior changed. Existing BullMQ/Redis/outbox/governor remain. No third-party tools/Skills/MCP/hooks installed.

| Check | Actual result |
|---|---|
| Host versions | Node v24.20.0, npm 11.19.0 |
| npm install --package-lock-only --ignore-scripts | PASS exit 0; 36.617 s; npm lockfile v3; 150 package entries |
| npm ci --ignore-scripts | PASS exit 0; 3.591 s; 120 packages; node_modules absent beforehand |
| npm ls --all --json | PASS exit 0; actual installed graph saved |
| npm run verify:dependencies | PASS exit 0; all pinned metadata read |
| npm run syntax | PASS exit 0; no diagnostics |
| npm run test:unit | PASS exit 0; 105/105, 0 skipped |
| npm run typecheck | FAIL exit 2; 89 diagnostics (70 in dependency declarations), 7.418 s |
| npm run build | FAIL exit 2; 83 diagnostics (70 in dependency declarations), 3.913 s; stopped at tsc before Vite |
| docker info | BLOCKED_DOCKER_DAEMON exit 1; missing dockerDesktopLinuxEngine pipe |
| Both compose configs | PASS static validation only; release config checked without resolving env_file |
| Env policy | Safe template visible; .env/.env.release/.env.local ignored |

Lock SHA-256: `1fa85552dd5227742fed4564e2ccf0ad2cbd33ed8f11da15100bb38e558fb828`. Direct pins and package.json unchanged. No ERESOLVE or engine conflict occurred; compiler failures are separate. Lifecycle scripts disabled throughout. Details: LOCKFILE_RECEIPT.json, LOCKED_PACKAGES.json, dependency-preflight.json and installed-graph log.

Exact check argv, exit codes, durations and logs: artifacts/t102/COMMAND_RESULTS.json. Full unit/typecheck/build logs are under artifacts/t102/logs/. Human-readable execution notes: COMMANDS_RUN.md. Final diff/status/secret/prohibited-file checks: FINAL_VERIFICATION.json, SECRET_SCAN.json and logs/final-status.txt. Exact full changed-file list: FILES_CHANGED.md / FILES_CHANGED.json; separate pre-existing preflight changes are not attributed to T102.

## Remaining blockers and minimal next action

1. Compiler baseline: Drizzle 0.45.2 declarations, ioredis NodeNext imports, Fastify unknown errors, HTTP/domain price-union mismatch and Leaflet bounds. Exact errors and bounded correction proposal: artifacts/t102/BUILD_BLOCKERS.md. No compiler suppression, unchecked contract cast, silent upgrade or dependency patch applied. Review the narrow repair plan before another T102 pass.
2. Docker: manually restore/start Docker Desktop Linux engine, then `docker info`. After compiler baseline is green, record base-image pull separately, clean build duration, `docker compose up --build -d`, health, actual versions, stop/restart and logs as documented in README. No system configuration changed automatically.
3. T112: missing historical EventHive copied/adapted path/hash artifact remains BLOCKED_PROVENANCE_T112. Existing licence retained; no invented provenance.

NOT_RUN: Docker pull/build/start/health/stop/restart/timing, actual container versions, PostgreSQL/Redis reachability, migrations/seed/integration/fault injection, MAX/provider/browser/live gate, OpenAPI generation/deployment. Declared image tags are not observed versions. Partial ignored dist from failed tsc is not a build artifact for release. No final build exists to use for screenshots.

Contract deltas: NONE. P0 and queue remain frozen; queue classification BLOCKED.
T103 unblocked: **NO** — needs successful T102 build + isolated PG/Redis/Docker; human activation also required.
T104/T106 are conceptually independent of T103's queue decision, but **not activated**. Their documented T102 prerequisite is not fully satisfied. After review, bounded standalone provider/manual preparation for T104 can proceed independently of queue faults; real T106 release-image/client checks need working build/Docker, provisioned attached Mini App and local credentials. Do not run two implementation writers/tickets concurrently.

Manual action: review this diff and compiler repair proposal; start Docker Desktop when ready; separately provide/confirm provider-use and MAX provisioning through future approved tasks without sending secrets in chat. This pass stops here.
''')
put('artifacts/t102/COMMANDS_RUN.md','''# T101/T102 execution receipt

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

The underlying npm/Docker/Git commands are individually recorded in COMMAND_RESULTS.json, including nonzero typecheck/build/Docker exits. Safe examples were read; real .env files/global credential stores were not printed. PowerShell Set-Content wrote only repository-local evidence scripts. The generated artifacts/t101/__pycache__ path was resolved and checked against that exact workspace path before removing the generated cache; future evidence commands use python -B.

NOT_RUN: npm lifecycle scripts; T103 fault injection/integration suite; live MAX/provider/gate; Docker build/start/timing; PG/Redis runtime; browser; deployments. No third-party tooling installed. npm registry metadata fetch/install is the only new external dependency activity.
''')
write_json(ROOT/'artifacts/t102/RUNTIME_RECEIPT.json',{'host':{'node':'v24.20.0','npm':'11.19.0'},'declared_container_tags':['node:24.20.0-bookworm-slim','postgres:18.6','redis:8.2.9'],'actual_container_versions':None,'docker':'BLOCKED_DOCKER_DAEMON','base_image_pull_seconds':None,'docker_build_seconds':None,'docker_start_seconds':None,'postgres_reachability':'NOT_RUN: daemon unavailable; no alternate target configured or probed','redis_reachability':'NOT_RUN: daemon unavailable; no alternate target configured or probed','queue_decision':'BLOCKED','T103_started':False,'MAX_provider_browser':'NOT_RUN'})
# Lifecycle names only, not executing scripts.
lock=json.loads((ROOT/'package-lock.json').read_text(encoding='utf-8'))
installed=[]
for rel,row in lock['packages'].items():
    p=ROOT/rel/'package.json'
    if rel and p.exists():
        m=json.loads(p.read_text(encoding='utf-8')); installed.append({'path':rel,'name':m['name'],'version':m['version'],'license':m.get('license','UNKNOWN'),'lifecycle_scripts':{k:v for k,v in m.get('scripts',{}).items() if k in ['preinstall','install','postinstall','prepare']}})
write_json(ROOT/'artifacts/t102/INSTALLED_PACKAGES.json',installed)
print('Final handoff/state prepared; no active implementation ticket. Installed package manifests:',len(installed))
