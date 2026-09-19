from capture import *
before=json.loads((ROOT/'artifacts/t101/BASELINE_HASHES.json').read_text(encoding='utf-8'))
changed=[p for p,h in before.items() if not (ROOT/p).exists() or sha(ROOT/p)!=h]
protected=[p for p in changed if p.startswith(('apps/','packages/','modules/','scripts/','tests/','migrations/','licenses/','docs/research/','docs/architecture/adr/','docs/product/povod-2026-09-19/','artifacts/preflight/')) or p in ['package.json','Dockerfile','compose.yaml','compose.release.yaml']]
assert not protected,protected
write_json(ROOT/'artifacts/t101/VERIFICATION.json',{'application_and_imports_unchanged':True,'changed_existing_files':changed,'third_party_tooling_installed':False,'skills_added':False,'queue':'BLOCKED; preserve existing implementation','diff_check':'PASS'})
handoff='''# T101 — scope and governance

Status: PASS. User-authorized documentation-only reconciliation, 2026-09-19.
Starting/ending HEAD: `4f9a198d4fa2b18686efa19a59b6ac78281d341d` (no commit). Starting tree already contained T070 preflight/import changes; preserved.

Inputs: required preflight receipts; official case hash `638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a`; byte-preserved freeze/spec/patch/contract, eight ADRs and synthesis. Exact source paths/hashes: artifacts/t101/SOURCE_VERIFICATION.json and BASELINE_HASHES.json.

Changes: Повод / The Boys, unambiguous Moscow solo-first P0, Follow/Smart/map P1 and second-city/social Stretch; explicit imported flag overrides; queue BLOCKED and BullMQ/Redis/outbox/governor preservation; corrected architecture links; historical task/prompt labels; one active ticket/integration owner. No local Skills were needed, no third-party tooling installed. Prior editable docs are preserved in BASELINE_DOCUMENTS.json; imported evidence untouched.

Checks: baseline SHA/status captured; imported source hashes and application/config bytes unchanged; git diff --check exit 0. Exact commands/exits/logs: artifacts/t101/COMMAND_RESULTS.json. Files changed in this stage: artifacts/t101/VERIFICATION.json (changed existing files), plus T101/T102 task definitions, this handoff and artifacts/t101 evidence/scripts.
NOT_RUN: runtime/unit/build checks in T101 (documentation only; T102 follows). No contract or application behavior changes. Queue/provider/MAX runtime remains unverified; old documents must be read through the authority overlay.

Environment: ordinary shell and Node REPL could not start (`helper_unknown_error: setup refresh had errors`). Authorized local commands used escalation. Git's ownership mismatch was handled only with per-command `-c safe.directory=D:/Dev/Repos/The-Boys-Max`; global/system configuration was not changed.

Next action: T101 acceptance passed; activate T102 only, then stop for human review. T103+ remain unstarted.
'''
(ROOT/'docs/handoffs/T101_SCOPE_GOVERNANCE.md').write_text(handoff,encoding='utf-8')
p=ROOT/'docs/tasks/101_SCOPE_GOVERNANCE.md';p.write_text(p.read_text(encoding='utf-8').replace('Status: ACTIVE (2026-09-19 user authorization after T070 review).','Status: PASS. Evidence: docs/handoffs/T101_SCOPE_GOVERNANCE.md.'),encoding='utf-8')
p=ROOT/'docs/tasks/102_DEPENDENCY_BUILD_BASELINE.md';p.write_text(p.read_text(encoding='utf-8').replace('Status: PENDING T101 acceptance; authorized next by 2026-09-19 user request.','Status: ACTIVE; T101 accepted. Authorized by 2026-09-19 user request.'),encoding='utf-8')
p=ROOT/'docs/tasks/ACTIVE_TASK.md';p.write_text('''# Active task

`102_DEPENDENCY_BUILD_BASELINE.md` — the only active implementation ticket.
T101 passed; see docs/handoffs/T101_SCOPE_GOVERNANCE.md.
Stop after T102 for human review. T103–T113 are not authorized by this pass.
One integration owner controls contracts/routes/migrations/dependencies/auth/session. No second writer.
Historical T001 → T010 → T070 pointers do not activate work.
''',encoding='utf-8')
print(json.dumps({'T101':'PASS','changed_existing_files':changed},ensure_ascii=False,indent=2))
