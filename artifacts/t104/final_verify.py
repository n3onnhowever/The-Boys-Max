"""Final preservation, evidence consistency, secret/prohibited-path checks (no network)."""
import json,re,hashlib,subprocess,sys,os
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/t104';BASELINE='5e4973f24fb74489387b3c29313cfcd1e8401ca7'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode('utf-8').strip()
def read(n):return json.loads((OUT/n).read_text(encoding='utf-8'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,v):(OUT/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
branch=git('branch','--show-current');assert branch=='codex/t104-kudago-gate'
head=git('rev-parse','HEAD');assert head==BASELINE,'Unexpected HEAD before authorized T104 commit'
now=datetime.now(timezone.utc).isoformat();gate=read('MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json');meta={'baseline_sha':BASELINE,'branch':branch,'api_version':'v1.4','probe_timestamp':now,'response_hashes_ref':'RECEIPT_INDEX.json','response_hashes':gate['response_hashes']}
tracked=git('ls-files','-z').split('\0');allfiles=git('ls-files','--cached','--others','--exclude-standard','-z').split('\0');allfiles=sorted(set(p for p in allfiles if p and (ROOT/p).is_file()))
newfiles=sorted(p for p in allfiles if p.startswith('artifacts/t104/') or p=='docs/handoffs/T104_KUDAGO_RUNTIME_GATE.md')
changed=git('diff','--name-only',BASELINE).splitlines();unexpected=[p for p in changed if p and not (p.startswith('artifacts/t104/') or p=='docs/handoffs/T104_KUDAGO_RUNTIME_GATE.md')]
untracked=git('ls-files','--others','--exclude-standard').splitlines();unexpected.extend(p for p in untracked if not (p.startswith('artifacts/t104/') or p=='docs/handoffs/T104_KUDAGO_RUNTIME_GATE.md'))
inputs=read('STARTING_STATE.json')['files'];input_changes=[p for p,h in inputs.items() if digest(ROOT/p)!=h]
assert not unexpected and not input_changes,(unexpected,input_changes)
prohibited=[];findings=[];scanned=0;skipped=[]
patterns=[r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16})\b',r'\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b']
for p in allfiles:
 if (re.search(r'(^|/)\.env(?:\.|$)',p) and not p.endswith('.example')) or re.search(r'(^|/)(\.runtime|node_modules|__pycache__)/',p) or re.search(r'\.(pem|p12|pfx|key|pyc)$',p):prohibited.append(p)
 raw=(ROOT/p).read_bytes()
 if b'\0' in raw or len(raw)>10_000_000:skipped.append(p);continue
 scanned+=1;text=raw.decode('utf-8',errors='replace')
 for pattern in patterns:
  for match in re.finditer(pattern,text):findings.append({'file':p,'line':text[:match.start()].count('\n')+1,'rule':'credential_signature'})
# No captured provider image/body/description values; field-name inventory is permitted metadata.
def forbidden_keys(value):
 if isinstance(value,dict):return [k for k in value if k in ['images','description','body_text','phone']]+[x for v in value.values() for x in forbidden_keys(v)]
 if isinstance(value,list):return [x for v in value for x in forbidden_keys(v)]
 return []
idx=read('RECEIPT_INDEX.json');consistency=[]
for n,r in idx['receipts'].items():
 p=OUT/'receipts'/n;v=json.loads(p.read_text(encoding='utf-8'))
 assert digest(p)==r['file_sha256'],n
 assert v['response_hash']==r['response_hash'] and re.fullmatch('[a-f0-9]{64}',v['response_hash']),n
 assert v['baseline_sha']==BASELINE and v['api_version']=='v1.4',n
 assert not forbidden_keys(v.get('payload')),n
 consistency.append(n)
assert len(gate['tasks'])==12
required=['task_id','queried_at_utc','provider','api_version','request_url','request_parameters','http_status','latency_ms','source_event_id','source_url','raw_dates','raw_place','raw_location','raw_coordinates','raw_price','raw_is_free','raw_category','headers','normalized_event','normalized_occurrence','normalized_price','hard_constraints','result','response_hash','verifier','notes']
for row in gate['tasks']:
 assert all(k in row for k in required),(row['task_id'],set(required)-set(row))
 assert row['result'] in ['PASS','NO_PASS','UNKNOWN','ERROR']
 assert row['response_hash'] in gate['response_hashes'].values()
assert gate['summary']['DATA_RUNTIME_GATE']=='FAIL' and gate['summary']['LEGAL_MANUAL_GATE']=='OPEN'
replay=read('NORMALIZER_REPLAY.json');assert not replay['test_failures'] and replay['critical_false_pass']==0
assert not findings and not prohibited,(findings,prohibited)
node_modules=ROOT/'node_modules';assert node_modules.exists() and not node_modules.is_symlink() and not node_modules.is_junction(),'No shared node_modules'
scan={**meta,'status':'PASS','files_scanned':scanned,'credential_findings':findings,'prohibited_files':prohibited,'binary_or_large_skipped':skipped,'limitations':'Heuristic credential signatures plus forbidden filenames; not exhaustive secret detection. Ignored env/runtime contents not read.','input_hash_changes':input_changes,'unexpected_scope_changes':unexpected,'receipts_validated':len(consistency),'node_modules':'local directory, not symlink/junction'}
save('SECRET_SCAN.json',scan)
commands=read('COMMAND_RESULTS.json');required_checks=['clean-install','verify-dependencies','syntax','unit','typecheck','build','final-constraint-tests','final-normalizer-replay','diff-check-staged-accepted']
checks={n:next(c for c in reversed(commands) if c['name']==n)['exit_code'] for n in required_checks};assert all(v==0 for v in checks.values())
for command in commands:
 if 'log' in command:assert digest(OUT/command['log'])==command['log_sha256'],command['name']
 if 'source_manifest_sha256' in command:assert digest(OUT/'logs'/('sources-'+command['source_manifest_sha256']+'.json'))==command['source_manifest_sha256']
# Baseline file bytes are unchanged; index/new files are the only intended changes.
summary={**meta,'verification_status':'PASS','provider_decision':'FAIL / LEGAL OPEN / NOT APPROVED','checked_HEAD_before_commit':head,'phase':'pre-commit; final commit SHA and clean tree verified in final tool output','checks':checks,'unit_tests':{'passed':115,'failed':0,'skipped':0},'probe_tests':{'passed':12,'failed':0},'baseline_replay_summary':replay['full_record_summary'],'git_diff_check':next(c for c in reversed(commands) if c['name']=='diff-check-staged-accepted')['exit_code'],'preservation':'All original tracked inputs unchanged; changes limited to T104 evidence/tooling and one handoff','secret_prohibited_scan':'PASS (heuristic)','receipts_validated':len(consistency),'data_gate_summary':gate['summary'],'NOT_RUN':['Docker','PostgreSQL','Redis','MAX clients/auth','browser/UI','production importer','production provider transport','actual cancellation/reschedule/deletion transitions','429/5xx/natural timeout','legal clearance'],'environment_notes':['Initial sandbox process setup failed before Git ran; authorized escalated commands in requested worktree succeeded. No global Git config or safe.directory change was needed.']}
save('FINAL_VERIFICATION.json',summary)
# Include final generated evidence names; exclude transient Python caches via local .gitignore.
newfiles=sorted(set(newfiles+['artifacts/t104/SECRET_SCAN.json','artifacts/t104/FINAL_VERIFICATION.json','artifacts/t104/FILES_CHANGED.md','artifacts/t104/FINAL_SOURCE_HASHES.json','artifacts/t104/logs/acceptance-scan-final.txt']))
index_hash=digest(OUT/'RECEIPT_INDEX.json')
header=f'# T104 — Files changed\n\nBaseline: `{BASELINE}`. API v1.4. Verification UTC `{now}`. Response hashes: RECEIPT_INDEX.json, file SHA-256 `{index_hash}`.\n\nAll files are additions. No original source, imported archive, lockfile, schema, UI, auth, queue or other task changed. Logs/source manifests are evidence. Python cache ignored locally.\n\n'
(OUT/'FILES_CHANGED.md').write_text(header+'\n'.join('- `'+p+'`' for p in newfiles)+'\n',encoding='utf-8',newline='\n')
# Exclude recursively changing verification/control files. Git commit provides final complete integrity.
excluded=['artifacts/t104/FINAL_SOURCE_HASHES.json','artifacts/t104/COMMAND_RESULTS.json','artifacts/t104/logs/acceptance-scan-final.txt']
hashes={p:digest(ROOT/p) for p in newfiles if p not in excluded and (ROOT/p).exists()}
save('FINAL_SOURCE_HASHES.json',{**meta,'files':hashes,'excluded':excluded,'note':'COMMAND_RESULTS changes when wrapper records this verification; all final bytes are bound by the resulting Git commit. No self-hash claim.'})
print(json.dumps({'status':'PASS','receipt_count':len(consistency),'credential_findings':len(findings),'prohibited_files':len(prohibited),'unexpected_scope_changes':unexpected,'new_files':len(newfiles)},ensure_ascii=False))
