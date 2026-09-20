import csv, gzip, hashlib, json, os, re, subprocess, sys, time
from pathlib import Path
from collections import Counter, defaultdict
ROOT=Path(r'D:\Dev\Repos\The-Boys-Max')
OUT=Path(r'D:\Dev\Repos\The-Boys-Max-repo-cleanroom\artifacts\repo-cleanroom')
BASE='1e4a7a2b454bed87bdcb40559773143c2fc38c9b'
def git(root,*args):
 p=subprocess.run(['git','-c','core.quotepath=false','-C',str(root),*args],capture_output=True)
 if p.returncode: raise RuntimeError('git command failed: '+repr(args)+' exit '+str(p.returncode))
 return p.stdout.decode('utf-8','replace')
def dump(name,obj): (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def phase(n,status,**details):
 p=OUT/'state.json'; data=json.loads(p.read_text(encoding='utf-8')) if p.exists() else {'schema':1,'base_sha':BASE,'source_path':str(ROOT),'cleanup_path':str(OUT.parent.parent),'branch':'codex/repo-cleanroom','created_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'phases':{}}
 data['phases'][str(n)]={'status':status,**details}; dump('state.json',data)
phase(1,'RUNNING')
raw=git(ROOT,'worktree','list','--porcelain')
worktrees=[]
for block in raw.strip().split('\n\n'):
 d={}
 for line in block.splitlines():
  k,_,v=line.partition(' '); d[k]=v
 if d.get('worktree') and 'repo-cleanroom' not in d['worktree']: worktrees.append(d)
refs=[]
for line in git(ROOT,'for-each-ref','--format=%(refname) %(objectname)','refs/heads','refs/remotes','refs/tags').splitlines():
 ref,sha=line.split(' ',1)
 counts=git(ROOT,'rev-list','--left-right','--count',BASE+'...'+sha).strip().split()
 refs.append({'ref':ref,'sha':sha,'base_only_commits':int(counts[0]),'ref_only_commits':int(counts[1])})
dump('refs.json',refs)
rows=0; totalbytes=0; counts=Counter(); statuses=Counter(); categories=Counter(); dupe=defaultdict(list); summaries=[]; errors=[]; primary_status=[]
binary=[]; zips=[]; protected=[]
category_patterns=[('dependencies',r'(^|/)node_modules/'),('build',r'(^|/)(dist|coverage|\.vite|\.cache)/'),('secret_path',r'(^|/)(\.secrets|secrets)/|(^|/)\.env(?:\.|$)'),('archives',r'\.(zip|7z|tar|gz|tgz)$'),('screenshots',r'\.(png|jpg|jpeg|webp|gif)$'),('logs',r'(^|/)(logs?|\.run-evidence)/|\.log$'),('local_runtime',r'(^|/)(\.runtime|storage|pgdata|redis-data)/|\.(sqlite|sqlite3|db|rdb|aof)$'),('design_references',r'(^|/)(design|design-references)/'),('research_copies',r'^artifacts/research/consolidated/(sources|verification)/'),('scripts',r'(^|/)(scripts|tools)/'),('evidence',r'^(artifacts|input|archive)/'),('docs',r'^docs/'),('source',r'^(apps|packages|modules|tests)/')]
def classify(p,status,cat):
 issecret=cat=='secret_path' and Path(p).name not in ('.env.example','.env.release.example')
 if issecret: return 'IGNORE','private local path; metadata only; never packaged'
 if cat in ('dependencies','build'):
  return ('REVIEW_REQUIRED','tracked generated/dependency material; establish provenance before deletion') if status=='tracked' else ('DELETE_SAFE','regenerable local install/build output; proposal only')
 if re.search(r'(^|/)(\.DS_Store|Thumbs\.db|desktop\.ini)$|\.(tmp|swp|swo)$',p,re.I): return ('REVIEW_REQUIRED' if status=='tracked' else 'DELETE_SAFE'),'editor/OS temporary output'
 if status=='tracked': return 'KEEP_TRACKED','source or existing historical/audit evidence; preserve bytes'
 if cat=='research_copies': return 'MOVE_TO_ARCHIVE','expanded research copy; consolidate only after reference and archive-integrity review'
 if cat=='local_runtime': return 'REVIEW_REQUIRED','local runtime state; may contain private/durable data; no deletion'
 if cat=='archives': return 'KEEP_UNTRACKED','research/submission archive; retention and authoritative copy need review'
 if p.startswith(('artifacts/','input/','docs/','archive/')): return 'KEEP_UNTRACKED','uncommitted evidence/input; retain pending owner acceptance'
 if status=='ignored': return 'IGNORE','local ignored material; retained'
 return 'REVIEW_REQUIRED','uncommitted source/tool; another task may own it'
with gzip.open(OUT/'inventory.csv.gz','wt',encoding='utf-8',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=['worktree','path','git_status','category','classification','reason','bytes','mtime_ns','sha256','hash_status']);writer.writeheader()
 for wt in worktrees:
  root=Path(wt['worktree']); tracked=set(git(root,'ls-files','-z').split('\0'))-{''}; ignored=set(git(root,'ls-files','--others','--ignored','--exclude-standard','-z').split('\0'))-{''}
  dirty=git(root,'status','--porcelain=v1','-z'); wt['status_entries']=len([x for x in dirty.split('\0') if x]); wt['status_sha256']=hashlib.sha256(dirty.encode()).hexdigest()
  (OUT/'raw'/('status-'+root.name+'.txt')).write_text(git(root,'status','--short','--branch'),encoding='utf-8')
  wc=Counter(); wb=0
  for folder,dirs,files in os.walk(root,followlinks=False):
   dirs[:]=[x for x in dirs if x!='.git' and not (Path(folder)/x).is_symlink()]
   for name in files:
    fp=Path(folder)/name; p=fp.relative_to(root).as_posix()
    if p=='.git': continue
    try:
     st=fp.stat(); status='tracked' if p in tracked else ('ignored' if p in ignored else 'untracked'); cat=next((k for k,pat in category_patterns if re.search(pat,p,re.I)),'other'); cl,reason=classify(p,status,cat)
     h=''; hs='metadata_only'
     secret=cat=='secret_path' and name not in ('.env.example','.env.release.example')
     # Do not read credentials, database/runtime state, installed dependencies, or symlink targets.
     if not secret and cat not in ('dependencies','local_runtime') and not fp.is_symlink():
      digest=hashlib.sha256()
      with fp.open('rb') as src:
       for chunk in iter(lambda:src.read(1024*1024),b''):digest.update(chunk)
      h=digest.hexdigest(); hs='sha256';
      if st.st_size>0 and cat!='build': dupe[(st.st_size,h)].append({'worktree':root.name,'path':p,'git_status':status})
     row=dict(worktree=root.name,path=p,git_status=status,category=cat,classification=cl,reason=reason,bytes=st.st_size,mtime_ns=st.st_mtime_ns,sha256=h,hash_status=hs)
     writer.writerow(row); rows+=1;totalbytes+=st.st_size; counts[cl]+=1;statuses[status]+=1;categories[cat]+=1;wc[status]+=1;wb+=st.st_size
     if secret: protected.append({k:row[k] for k in ('worktree','path','git_status','classification','bytes','hash_status')})
     if cat=='archives':zips.append(row)
     if status=='tracked' and cat in ('archives','screenshots'): binary.append(row)
     if root==ROOT and status!='tracked' and cat not in ('dependencies','build'):primary_status.append(row)
    except (OSError,ValueError) as e:errors.append({'worktree':root.name,'path':p,'error_type':type(e).__name__})
  wt.update(file_counts=dict(wc),bytes=wb); summaries.append(wt)
  print(json.dumps({'worktree':root.name,'counts':dict(wc),'bytes':wb}),flush=True)
duplicates=[]
for (size,sha),paths in dupe.items():
 # A normal Git checkout replicated across worktrees is not clutter. Report only repeated paths within one worktree.
 by=defaultdict(list)
 for item in paths: by[item['worktree']].append(item)
 for wt,items in by.items():
  if len(items)>1:duplicates.append({'worktree':wt,'bytes_each':size,'sha256':sha,'paths':items})
dump('duplicates.json',sorted(duplicates,key=lambda x:x['bytes_each']*(len(x['paths'])-1),reverse=True))
dump('archives.json',zips);dump('tracked-binaries.json',binary);dump('protected-paths.json',protected);dump('worktrees.json',summaries);dump('primary-local-material.json',primary_status);dump('inventory-errors.json',errors)
summary={'files':rows,'bytes':totalbytes,'by_classification':dict(counts),'by_git_status':dict(statuses),'by_category':dict(categories),'duplicate_groups_within_worktree':len(duplicates),'tracked_binary_records':len(binary),'archive_records':len(zips),'errors':len(errors),'worktrees':len(worktrees),'limitations':['Git internal object files excluded; refs/objects audited separately','Credential/private runtime content and node_modules not opened or hashed','Generated dependency file metadata included; same-path copies across worktrees not counted as clutter','Snapshot taken while other tasks may be running']}
dump('inventory-summary.json',summary);phase(1,'PASS',summary=summary,inventory='inventory.csv.gz');print(json.dumps(summary),flush=True)
