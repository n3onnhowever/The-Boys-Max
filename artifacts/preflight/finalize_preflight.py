from pathlib import Path
import json,hashlib,subprocess,re,zipfile,io
r=Path.cwd();e=r/'artifacts/preflight'
def write(p,s):
 p=r/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s.rstrip()+'\n',encoding='utf-8')
def git(*args):return subprocess.run(['git','-c','safe.directory=D:/Dev/Repos/The-Boys-Max',*args],cwd=r,capture_output=True,text=True,encoding='utf-8')
# Update visual evidence truth after successful Poppler render and inspection.
p=e/'CURRENT_STATE_RECEIPT.json';d=json.loads(p.read_text('utf-8'));d['not_run']=[x for x in d['not_run'] if not x.startswith('PDF visual')];d['official_case_visual_check']={'page':10,'status':'PASS_VISUALLY_INSPECTED','renderer':'installed Poppler pdftoppm','earlier_fitz_attempt':'ModuleNotFoundError; recovered via Poppler','artifact':'artifacts/preflight/official-case-page-10.png'};p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=e/'CURRENT_STATE_RECEIPT.md';p.write_text(p.read_text('utf-8').replace('PDF visual render attempt failed (fitz absent); requirements read from Unicode text, no claim of visual QA.','Official submission page 10 rendered with installed Poppler and visually inspected. Initial fitz import failed; Poppler recovered the check. Full case text extracted as Unicode.'),encoding='utf-8')
write('artifacts/preflight/COMMANDS_RUN.md','''# Commands and evidence

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
''')
write('docs/handoffs/T070_RESEARCH_IMPORT_PREFLIGHT.md','''# T070 handoff — research import and repository preflight

Status: DOCUMENTATION PREFLIGHT COMPLETE; Phase 2 NOT STARTED. Human review is the explicit next gate.

Source: D:/Dev/Repos/The-Boys-Max, main, HEAD 4f9a198d4fa2b18686efa19a59b6ac78281d341d; initial Git status clean; no remotes. ZIP SHA-256 eb06177c37aaadddcce3f0aeeb6f98406c6ec9d10a7a8f254fa15dd171614aa0. Exact official PDF SHA-256 638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a, 22 pages, matching synthesis. All five authority paths/hashes are in CURRENT_STATE_RECEIPT.json.

Changed: only docs/tasks/ACTIVE_TASK.md among pre-existing tracked files; new task T070, current authority overlay, immutable product/ADR/synthesis/research import, research INDEX, this handoff and artifacts/preflight evidence. Full imported-file mapping: IMPORT_MANIFEST.json. Full created/changed inventory: FILES_CREATED.json.

Preserved: apps/, packages/, modules/, migrations/, tests/, scripts/, package.json, dependency state, Docker/compose, MAX auth/Bridge/Bot transport, AGENTS.md, old current/product/design documents, team brand assets, supplied ZIP bytes. No commit, migration, deployment, provider request, bot action, skill installation or global config change.

Executed: unit PASS 105/105; typecheck/build BLOCKED_DEPENDENCIES (tsc unavailable); Docker info BLOCKED_DOCKER_DAEMON; archive CRC 10/10 PASS; 39/39 supplied manifest entries match plus manifest itself independently hashed; exact official case hash matches and page 10 visually checked; final git diff --check, JSON validation, code-preservation comparison and heuristic secret/prohibited-file scan recorded in FINAL_VERIFICATION.json/SECRET_SCAN.json. All command details: COMMANDS_RUN.md and COMMAND_RESULTS.json.

NOT_RUN: real PG/Redis/BullMQ integration, Docker build/start/timing, MAX/mobile/web/API2 runtime, provider runtime/legal approval, browser screenshots, lint (not configured). psql unavailable. No passing unit test is represented as runtime acceptance.

Architecture: TypeScript/Fastify + React/Vite modular monolith, PostgreSQL durable state, separate API/worker, implemented Redis/BullMQ outbox delivery. Queue classification BLOCKED because ADR-003 requires runtime evidence not available here; preserve existing path pending T103. No queue migration.

Contract deltas: NONE to executable interfaces, schema or auth. Documentation precedence now explicitly points to supplied Scope Freeze and safety patch. Record conflicts rather than editing imported sources: stale TBD; old 2–3-city/map/Follow/Smart/social P0; omitted conditional price fields; old fixed BullMQ rule versus repository-gated ADR; optional-save wording versus required capability. CONFLICTS.md lists exact locations.

Residual risks: no lock/dependencies/reproducible build; daemon unavailable; KudaGo NOT APPROVED; stable occurrence identity/sync ledger missing; favorites/preferences/new navigation missing; live MAX and submission evidence absent. Source helper/adapters are not live integrations. Existing donor notice references missing copied-path evidence. No usable deployment URL or CI is verified.

Next action: human reviews CURRENT_STATE_RECEIPT.md, IMPLEMENTATION_GAP_MATRIX.md and ORDERED_IMPLEMENTATION_TICKETS.md. If accepted, start only T101, then T102 dependency/build baseline. T103 verifies existing queue; T104 and T106 carry external provider/MAX gates. Detailed ordered T101–T113 acceptance criteria are proposed, not executed.
''')
# Heuristic secret scan covers working source/evidence and every member of the ten newly imported archives.
patterns={'private_key':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),'github_token':re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b'),'aws_access_key':re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),'openai_key':re.compile(r'\bsk-(?:proj-)?[A-Za-z0-9_-]{35,}\b'),'credential_url':re.compile(r'(?:postgres(?:ql)?|rediss?|https?)://[^\s/:]+:[^\s/@]+@'),'literal_bearer':re.compile(r'(?i)bearer\s+[A-Za-z0-9_=-]{35,}')}
findings=[];scanned=0;archive_members=0;prohibited=[]
files=[p for p in r.rglob('*') if p.is_file() and not any(x in p.relative_to(r).parts for x in ['.git','node_modules','input','__pycache__'])]
def scan(label,data):
 global scanned
 try:s=data.decode('utf-8-sig')
 except UnicodeDecodeError:return
 scanned+=1
 for rule,pat in patterns.items():
  for m in pat.finditer(s):findings.append({'path':label,'line':s[:m.start()].count('\n')+1,'rule':rule})
for p in files:
 rel=p.relative_to(r).as_posix()
 if p.name.startswith('.env') and not p.name.endswith('.example'):prohibited.append(rel)
 if p.suffix.lower() in ['.pem','.key','.p12','.pfx'] or p.name in ['id_rsa','id_ed25519']:prohibited.append(rel)
 if p.suffix=='.zip' and '/raw/' in rel:
  with zipfile.ZipFile(p) as z:
   for n in z.namelist():
    if not n.endswith('/'):
     archive_members+=1;scan(rel+'!'+n,z.read(n))
     if Path(n).name.startswith('.env') and not Path(n).name.endswith('.example'):prohibited.append(rel+'!'+n)
 else:scan(rel,p.read_bytes())
# Report match locations only. Synthetic test URL credentials require manual triage; no values are emitted.
for finding in findings:
 if finding['path']=='scripts/init-test.mjs' and finding['line']==6 and finding['rule']=='credential_url':
  finding['disposition']='REVIEWED_TEST_ONLY';finding['evidence']='APP_MODE=test, isolated max23_test DB, internal compose service without host port; fixed local fixture credentials, not a live external secret.'
unresolved=[x for x in findings if x.get('disposition')!='REVIEWED_TEST_ONLY']
report={'status':'REVIEW_FINDINGS' if unresolved or prohibited else 'PASS_WITH_REVIEWED_TEST_FIXTURE' if findings else 'PASS_HEURISTIC','text_files_scanned':scanned,'archive_members_scanned':archive_members,'findings':findings,'prohibited_files':prohibited,'limitations':'Heuristic patterns, not a full commercial/history/entropy scanner. Historical input archives and .git excluded; all newly imported archive members scanned. Values never emitted.'}
write('artifacts/preflight/SECRET_SCAN.json',json.dumps(report,ensure_ascii=False,indent=2))
base=json.loads((e/'TRACKED_BASELINE_HASHES.json').read_text('utf-8'));changed=[p for p,h in base.items() if not (r/p).exists() or hashlib.sha256((r/p).read_bytes()).hexdigest()!=h]
imp=json.loads((e/'IMPORT_MANIFEST.json').read_text('utf-8'));integrity=all(hashlib.sha256((r/x['path']).read_bytes()).hexdigest()==x['sha256'] for x in imp['files'])
json_errors=[]
for p in files:
 if p.suffix=='.json':
  try:json.loads(p.read_text('utf-8-sig'))
  except Exception as ex:json_errors.append({'file':p.relative_to(r).as_posix(),'error':str(ex)})
diff=git('diff','--check');status=git('status','--short');(e/'logs/diff-check.txt').write_text(diff.stdout+diff.stderr,encoding='utf-8');(e/'logs/final-status.txt').write_text(status.stdout,encoding='utf-8')
validation={'head':git('rev-parse','HEAD').stdout.strip(),'tracked_changed':changed,'only_expected_existing_doc_changed':changed==['docs/tasks/ACTIVE_TASK.md'],'application_source_config_unchanged':not any(p!='docs/tasks/ACTIVE_TASK.md' for p in changed),'all_40_imports_byte_identical':integrity,'git_diff_check_exit':diff.returncode,'json_parse_errors':json_errors,'secret_scan_status':report['status'],'phase_2_started':False}
write('artifacts/preflight/FINAL_VERIFICATION.json',json.dumps(validation,ensure_ascii=False,indent=2))
created=[p.relative_to(r).as_posix() for p in r.rglob('*') if p.is_file() and not any(x in p.relative_to(r).parts for x in ['.git','node_modules','input','__pycache__']) and p.relative_to(r).as_posix() not in base and p.relative_to(r).as_posix()!='.env.release.example']
created.append('artifacts/preflight/FILES_CREATED.json') if 'artifacts/preflight/FILES_CREATED.json' not in created else None
write('artifacts/preflight/FILES_CREATED.json',json.dumps({'created':sorted(created),'modified_existing':changed,'local_existing_ignored_not_created':['.env.release.example']},ensure_ascii=False,indent=2))
print(json.dumps(validation,ensure_ascii=False));print(json.dumps(report,ensure_ascii=False));print(status.stdout)
