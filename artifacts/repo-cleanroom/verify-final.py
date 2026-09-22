import gzip,hashlib,json,re,subprocess,time
from pathlib import Path
from urllib.parse import unquote
R=Path.cwd();O=R/'artifacts/repo-cleanroom';BASE='1e4a7a2b454bed87bdcb40559773143c2fc38c9b';CODE='991b3cdf9e8081cf9648faa4746243e4e5dfcb3b'
def run(args):
 p=subprocess.run(args,capture_output=True);return p.returncode,p.stdout,p.stderr
def put(path,x):path.write_bytes((json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
paths=subprocess.check_output(['git','diff','--cached','--name-only','-z']).decode().split('\0');paths=[x for x in paths if x]
strong=[('private_key',rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),('provider_key',rb'(?<![A-Za-z0-9])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,200}'),('github_token',rb'(?:gh[pousr]_[A-Za-z0-9]{25,200}|github_pat_[A-Za-z0-9_]{30,200})'),('aws_key',rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),('google_key',rb'\bAIza[A-Za-z0-9_-]{30,100}\b'),('slack_token',rb'xox[baprs]-[A-Za-z0-9-]{20,200}'),('bot_token',rb'(?<![0-9])[0-9]{7,14}:[A-Za-z0-9_-]{25,200}'),('jwt',rb'\beyJ[A-Za-z0-9_-]{8,1000}\.[A-Za-z0-9_-]{8,2000}\.[A-Za-z0-9_-]{8,1000}\b')]
prohibited=[];findings=[];bytes_scanned=0
for path in paths:
 parts=Path(path).parts
 if any(x in parts for x in ['.secrets','.git','node_modules','dist','install','probes']) or (Path(path).name.startswith('.env') and Path(path).name not in ['.env.example','.env.release.example']):prohibited.append(path);continue
 raw=subprocess.check_output(['git','show',':'+path])
 if path.endswith('.gz'):raw=gzip.decompress(raw)
 bytes_scanned+=len(raw)
 for typ,pattern in strong:
  if re.search(pattern,raw):findings.append({'path':path,'type':typ})
logs=[]
for name in ['clean-checkout-results.json','context-proof.json','image-files-proof.json','attempts/c9d7984/clean-checkout-results.json']:
 doc=json.loads((O/name).read_text(encoding='utf-8-sig'));records=doc.get('records',doc.get('results',[doc]))
 for rec in records:
  if 'log' not in rec:continue
  p=O/rec['log'];b=p.read_bytes();good=hashlib.sha256(b).hexdigest()==rec['log_sha256']
  if rec.get('log_compression')=='gzip':good=good and hashlib.sha256(gzip.decompress(b)).hexdigest()==rec['uncompressed_log_sha256']
  logs.append({'receipt':name,'log':rec['log'],'hashes_match':good})
links=[]
for p in list((R/'docs/research/2026-09-20/repo-cleanroom').glob('*.md'))+[R/'docs/handoffs/REPO_CLEANROOM_2026-09-20.md']:
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8-sig')):
  if target.startswith(('http:','https:','#')):continue
  q=(p.parent/unquote(target.split('#')[0])).resolve()
  if not q.exists():links.append({'path':p.relative_to(R).as_posix(),'target':target})
code_delta=subprocess.check_output(['git','diff','--name-only',BASE,CODE]).decode().splitlines()
diff_rc,out,err=run(['git','diff','--cached','--check'])
report={'status':'PASS' if not prohibited and not findings and not links and all(x['hashes_match'] for x in logs) and diff_rc==0 and sorted(code_delta)==['.dockerignore','.gitignore'] else 'FAIL','source_base':BASE,'cleanup_code_sha':CODE,'staged_files_scanned':len(paths),'decompressed_bytes_scanned':bytes_scanned,'prohibited_paths':prohibited,'strong_secret_matches':findings,'limitations':'Strong signatures only for new staged deliverables; broader Git heuristic audit retained separately','log_hash_checks':logs,'broken_report_links':links,'code_changed_existing_files':code_delta,'git_diff_cached_check_exit':diff_rc,'timestamp_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
put(O/'final-verification.json',report)
print(json.dumps({k:v for k,v in report.items() if k!='log_hash_checks'}))
if report['status']!='PASS':raise SystemExit(1)
