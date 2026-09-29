import csv,gzip,hashlib,json,subprocess,zipfile
from pathlib import Path
from collections import Counter,defaultdict
R=Path.cwd();O=R/'artifacts/repo-cleanroom';S=Path(r'D:\Dev\Repos\The-Boys-Max')
def put(n,x):(O/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
rows=[]
with gzip.open(O/'inventory.csv.gz','rt',encoding='utf-8') as f:
 for row in csv.DictReader(f):
  if row['worktree']==S.name:rows.append(row)
counts=Counter(x['classification'] for x in rows);sizes=Counter()
for x in rows:sizes[x['classification']]+=int(x['bytes'])
groups=defaultdict(lambda:{'files':0,'bytes':0})
for x in rows:
 if x['classification'] in ('DELETE_SAFE','MOVE_TO_ARCHIVE','REVIEW_REQUIRED'):
  if '/node_modules/' in '/'+x['path']:prefix=x['path'].split('node_modules/')[0]+'node_modules/'
  elif '/dist/' in '/'+x['path']:prefix=x['path'].split('dist/')[0]+'dist/'
  elif x['path'].startswith('artifacts/research/consolidated/'):prefix='/'.join(x['path'].split('/')[:4])+'/'
  else:prefix=x['path']
  k=x['classification']+' '+prefix;groups[k]['files']+=1;groups[k]['bytes']+=int(x['bytes'])
put('primary-summary.json',{'counts':dict(counts),'bytes':dict(sizes),'total_files':len(rows),'action_groups':[{'classification':k.split(' ',1)[0],'path':k.split(' ',1)[1],**v} for k,v in sorted(groups.items())]})
archives=[]
for x in rows:
 if x['category']=='archives' and x['path'].lower().endswith('.zip'):
  p=S/x['path'];rec={k:x[k] for k in ['path','sha256','bytes','git_status','classification']}
  try:
   with zipfile.ZipFile(p) as z:
    infos=z.infolist();names=[i.filename for i in infos];rec.update(entries=len(infos),uncompressed_bytes=sum(i.file_size for i in infos),encrypted_entries=sum(bool(i.flag_bits&1) for i in infos),sensitive_path_candidates=[n for n in names if ('.secrets' in Path(n).parts or (Path(n).name.startswith('.env') and Path(n).name not in ('.env.example','.env.release.example')))],unsafe_member_paths=[n for n in names if n.startswith(('/', '\\')) or '..' in Path(n).parts])
    # Central-directory metadata only: no archived contents or credential values read.
    rec['inspection']='CENTRAL_DIRECTORY_ONLY'
  except zipfile.BadZipFile:rec['inspection']='INVALID_ZIP'
  archives.append(rec)
put('archive-directory-audit.json',archives)
current_files=['README.md','docs/TARGET_ARCHITECTURE.md','docs/tasks/ACTIVE_TASK.md']+[x.relative_to(R).as_posix() for x in (R/'docs/current').glob('*.md')]
authority=[]
for path in current_files:
 raw=(R/path).read_bytes();text=raw.decode('utf-8-sig');lines=[]
 for n,line in enumerate(text.splitlines(),1):
  if ('T102.2' in line or 'T103' in line or 'KEEP_EXISTING_BULLMQ' in line or 'CURRENT' in line or 'Current' in line) and len(line)<1500:lines.append({'line':n,'text':line})
 authority.append({'path':path,'sha256':hashlib.sha256(raw).hexdigest(),'selected_status_lines':lines})
put('authority-evidence.json',authority)
attrs=subprocess.check_output(['git','show','HEAD:.gitattributes']);put('attributes-audit.json',{'changed':False,'sha256_git_blob_bytes':hashlib.sha256(attrs).hexdigest(),'minus_text_rules':sum(line.strip().endswith(b'-text') for line in attrs.splitlines()),'reason':'Exact historical byte-preservation rules retained; no global newline normalization introduced'})
put('source-anchors.json',{'base_sha':'1e4a7a2b454bed87bdcb40559773143c2fc38c9b','cleanup_sha':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':[{'path':p,'working_sha256':hashlib.sha256((R/p).read_bytes()).hexdigest(),'git_blob_sha256':hashlib.sha256(subprocess.check_output(['git','show','HEAD:'+p])).hexdigest()} for p in ['.gitignore','.dockerignore','.gitattributes','package.json','package-lock.json','Dockerfile','docs/current/POVOD_SOURCE_AUTHORITY.md','docs/tasks/ACTIVE_TASK.md']]})
state=json.loads((O/'state.json').read_text());state['phases']['2']={'status':'ISSUES_DOCUMENTED','evidence':'authority-evidence.json','issues':['README stale T102.2/T103 BLOCKED summary','TARGET_ARCHITECTURE stale T103 gate','ignored official PDF absent from Git checkout','UI/MAX branch-local work not integrated']};put('state.json',state)
print(json.dumps({'primary_counts':dict(counts),'primary_bytes':dict(sizes),'archives':len(archives),'archives_with_sensitive_paths':sum(bool(x.get('sensitive_path_candidates')) for x in archives),'largest_duplicate_groups':json.loads((O/'duplicates.json').read_text())[:8]},ensure_ascii=False,indent=2))
