import sys, re, urllib.parse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'t101'))
from capture import *
def gitfiles():
    p=subprocess.run(GIT+['ls-files','-z','--cached','--others','--exclude-standard'],cwd=ROOT,capture_output=True,check=True)
    return sorted(set(p.stdout.decode('utf-8').strip('\0').split('\0')))
e=ROOT/'artifacts/t102'
# Include generated final outputs in the inventory, avoiding self-referential hashes.
for name in ['FILES_CHANGED.json','FINAL_SOURCE_HASHES.json','SECRET_SCAN.json','FINAL_VERIFICATION.json']:
    if not (e/name).exists():write_json(e/name,{})
if not (e/'FILES_CHANGED.md').exists():(e/'FILES_CHANGED.md').write_text('# Changed files\n',encoding='utf-8')
base=json.loads((ROOT/'artifacts/t101/BASELINE_HASHES.json').read_text(encoding='utf-8'))
modified=[p for p,h in base.items() if not (ROOT/p).exists() or sha(ROOT/p)!=h]
imports=json.loads((ROOT/'artifacts/preflight/IMPORT_MANIFEST.json').read_text(encoding='utf-8'))['files']
assert all(sha(ROOT/x['path'])==x['sha256'] for x in imports)
protected=[p for p in modified if p.startswith(('apps/','packages/','modules/','scripts/','tests/','migrations/','docs/research/','docs/architecture/adr/','docs/product/povod-2026-09-19/','artifacts/preflight/')) or p in ['package.json','Dockerfile','compose.yaml','compose.release.yaml','.npmrc','.env.example','.env.release.example']]
assert not protected,protected
assert sha(ROOT/'package-lock.json')==json.loads((e/'LOCKFILE_RECEIPT.json').read_text(encoding='utf-8'))['sha256']
assert (ROOT/'.env.example').read_bytes()==(ROOT/'.env.release.example').read_bytes()
files=gitfiles()
new=[p for p in files if p not in base and (p.startswith(('artifacts/t101/','artifacts/t102/')) or p in ['package-lock.json','docs/tasks/101_SCOPE_GOVERNANCE.md','docs/tasks/102_DEPENDENCY_BUILD_BASELINE.md','docs/handoffs/T101_SCOPE_GOVERNANCE.md','docs/handoffs/T102_DEPENDENCY_BUILD_BASELINE.md'])]
write_json(e/'FILES_CHANGED.json',{'relative_to':'T101 start including pre-existing T070 work; not just Git HEAD','modified_existing_files':modified,'created_this_pass':new,'newly_trackable_existing_unchanged':['.env.release.example'],'not_attributed_to_this_pass':'pre-existing T070 imports/preflight; see artifacts/t101/logs/starting-status.txt','local_ignored_outputs':['node_modules/ (120 installed packages)','dist/ (partial tsc output; NOT accepted build)','dependency-preflight.json (copied to artifacts/t102)']})
(e/'FILES_CHANGED.md').write_text('# Exact T101/T102 changed files\n\nRelative to captured T101 working-tree baseline; pre-existing preflight/imports are not listed as new work.\n\n## Modified existing files\n\n'+'\n'.join('- `'+p+'`' for p in modified)+'\n\n## Existing unchanged file newly allowed by tracking policy\n\n- `.env.release.example`\n\n## Created this pass (including evidence)\n\n'+'\n'.join('- `'+p+'`' for p in new)+'\n\nIgnored local outputs: node_modules/, partial dist/, dependency-preflight.json. No commit/staging performed.\n',encoding='utf-8')
sourcefiles=[p for p in files if not p.startswith(('artifacts/','docs/research/','archive/','input/')) and not any(x in Path(p).parts for x in ['node_modules','dist','__pycache__'])]
write_json(e/'FINAL_SOURCE_HASHES.json',{p:sha(ROOT/p) for p in sourcefiles})
patterns={'private_key':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),'github_token':re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b'),'aws_access_key':re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),'openai_key':re.compile(r'\bsk-(?:proj-)?[A-Za-z0-9_-]{35,}\b'),'credential_url':re.compile(r'(?:postgres(?:ql)?|rediss?|https?)://[^\s/:]+:[^\s/@]+@'),'literal_bearer':re.compile(r'(?i)bearer\s+[A-Za-z0-9_=-]{35,}')}
findings=[]; prohibited=[]; scanned=0; parse_errors=[]
for rel in files:
    p=ROOT/rel
    if p.name.startswith('.env') and p.name not in ['.env.example','.env.release.example']:prohibited.append(rel)
    if p.suffix.lower() in ['.pem','.key','.p12','.pfx','.pyc'] or p.name in ['id_rsa','id_ed25519']:prohibited.append(rel)
    if p.suffix=='.zip':continue
    try:s=p.read_text(encoding='utf-8-sig')
    except UnicodeDecodeError:continue
    scanned+=1
    for rule,pat in patterns.items():
        for m in pat.finditer(s):
            f={'path':rel,'line':s[:m.start()].count('\n')+1,'rule':rule}
            if rel=='scripts/init-test.mjs' and rule=='credential_url':f['disposition']='REVIEWED_TEST_ONLY: unchanged synthetic internal max23_test fixture; no external credential'
            findings.append(f)
    if p.suffix=='.json':
        try:json.loads(s)
        except Exception as x:parse_errors.append({'path':rel,'error':str(x)})
unresolved=[f for f in findings if 'disposition' not in f]
scan={'status':'PASS_WITH_REVIEWED_TEST_FIXTURE' if not unresolved and not prohibited else 'REVIEW_FINDINGS','text_files_scanned':scanned,'findings':findings,'prohibited_files':prohibited,'limitations':'Heuristic patterns only; no full history/entropy/security audit. Git source and nonignored evidence scanned; node_modules/dist/private ignored files excluded. Imported ZIP bytes unchanged from prior preflight scan (213 members); not rescanned. Values never emitted.'}
write_json(e/'SECRET_SCAN.json',scan)
# Only authored current Markdown, not inert historical/import text, participates in current link check.
linkfiles=['AGENTS.md','README.md','README_CODEX.md','docs/current/POVOD_SOURCE_AUTHORITY.md','docs/current/PROJECT_STATE.md','docs/current/KNOWN_GAPS.md','docs/current/DECISIONS.md','docs/product/PRODUCT_FRAME.md','docs/TARGET_ARCHITECTURE.md','docs/tasks/ACTIVE_TASK.md']
broken=[]
for rel in linkfiles:
    for target in re.findall(r'\]\(([^)]+)\)',(ROOT/rel).read_text(encoding='utf-8')):
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:|^#',target):continue
        path=(ROOT/rel).parent/urllib.parse.unquote(target.split('#')[0])
        if not path.exists():broken.append({'file':rel,'target':target})
diffcode=run('t102','diff-check',GIT+['diff','--check'])
run('t102','ending-head',GIT+['rev-parse','HEAD'])
run('t102','final-status',GIT+['status','--short'])
run('t102','final-diff-names',GIT+['diff','--name-only'])
validation={'T101':'PASS','T102':'PARTIAL','starting_sha':'4f9a198d4fa2b18686efa19a59b6ac78281d341d','ending_sha':(e/'logs/ending-head.txt').read_text(encoding='utf-8').strip(),'commit_created':False,'application_and_runtime_config_unchanged':not protected,'imported_files_unchanged':len(imports),'preflight_evidence_unchanged':all(sha(ROOT/p)==h for p,h in base.items() if p.startswith('artifacts/preflight/')),'lock_unchanged_after_ci':True,'env_templates_safe_and_unchanged':True,'git_diff_check_exit':diffcode,'secret_scan_status':scan['status'],'prohibited_files':prohibited,'json_parse_errors':parse_errors,'current_doc_broken_links':broken,'compiler':'FAIL; no suppressions applied','docker':'BLOCKED_DOCKER_DAEMON','queue':'BLOCKED','no_active_implementation_ticket':True,'T103_T104_T105_T106_started':False}
write_json(e/'FINAL_VERIFICATION.json',validation)
print(json.dumps(validation,ensure_ascii=False,indent=2))
assert not unresolved and not prohibited and not parse_errors and not broken and diffcode==0
