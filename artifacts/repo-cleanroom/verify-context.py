import hashlib,json,subprocess,time
from pathlib import Path
R=Path.cwd(); O=R/'artifacts/repo-cleanroom'; P=O/'probes'; P.mkdir(exist_ok=True)
def run(label,args,cwd):
 started=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()); p=subprocess.run(args,cwd=cwd,capture_output=True)
 raw=p.stdout+p.stderr;(O/'raw'/f'{label}.txt').write_bytes(raw)
 return dict(label=label,command=args,cwd=str(cwd),exit=p.returncode,started_utc=started,log=f'raw/{label}.txt',log_sha256=hashlib.sha256(raw).hexdigest())
markers=['.secrets/cleanroom-marker.txt','.env.cleanroom','docs/cleanroom-marker.md','docs/research/cleanroom-marker.txt','input/cleanroom-marker.txt','artifacts/raw/cleanroom-marker.txt','artifacts/research/cleanroom-marker.zip','input/design/cleanroom-marker.png','.git/cleanroom-marker','node_modules/cleanroom-marker.txt','dist/cleanroom-marker.js','coverage/cleanroom-marker.txt','private.log','apps/api/.secrets/cleanroom-marker','apps/api/.env.local','apps/api/node_modules/cleanroom-marker','apps/miniapp/dist/cleanroom-marker.js','apps/miniapp/test-results/cleanroom-marker.png','apps/api/cleanroom-marker.zip','apps/api/cleanroom-marker.sqlite','apps/api/cleanroom-marker.tmp']
allowed=['package.json','package-lock.json','.npmrc','tsconfig.json','tsconfig.build.json','tsconfig.pure.json','tests/unit/cleanroom-marker.ts','apps/api/cleanroom-marker.ts','packages/platform/cleanroom-marker.lua','modules/cleanroom-marker.ts','scripts/cleanroom-marker.mjs','migrations/cleanroom-marker.sql','patches/cleanroom-marker.json','assets/cleanroom-marker.svg','licenses/cleanroom-marker.txt']
results=[]
for mode in ['baseline','hardened']:
 context=P/mode;context.mkdir(exist_ok=True)
 for name in markers+allowed:
  p=context/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('HARMLESS_CLEANROOM_MARKER\n',encoding='utf-8')
 ignore=subprocess.check_output(['git','show','1e4a7a2b454bed87bdcb40559773143c2fc38c9b:.dockerignore']) if mode=='baseline' else (R/'.dockerignore').read_bytes()
 (context/'.dockerignore').write_bytes(ignore); (context/'Dockerfile').write_text('FROM scratch\nCOPY . /context/\n',encoding='utf-8')
 dest=P/(mode+'-export');rec=run('docker-context-'+mode,['docker','build','--no-cache','--progress=plain','--output',f'type=local,dest={dest}',str(context)],R)
 rec['dockerignore_sha256']=hashlib.sha256(ignore).hexdigest();rec['excluded_marker_paths']=[x for x in markers if not (dest/'context'/x).exists()];rec['leaked_marker_paths']=[x for x in markers if (dest/'context'/x).exists()];rec['missing_build_inputs']=[x for x in allowed if not (dest/'context'/x).exists()];rec['expected_pass']=rec['exit']==0 and not rec['leaked_marker_paths'] and not rec['missing_build_inputs'];results.append(rec)
# git check-ignore uses the real cleanup file; no sensitive fixture values are created.
paths=['.secrets/cleanroom-marker','.env','.env.local','.env.release','node_modules/probe','dist/probe','coverage/probe','.playwright/probe','playwright-report/probe','test-results/probe','artifacts/research/probe.zip','.idea/workspace.xml','.DS_Store','pgdata/probe','redis-data/probe','storage/probe','test-downloads/probe','tests/test-downloads/probe','runtime.sqlite','raw.zip','artifacts/ui-povod-v1/packages/probe.zip']
checks=[]
for path in paths+['.env.example','.env.release.example','apps/miniapp/src/example.tsx','input/design/reference.png','docs/research/2026-09-18/raw/safe-original.zip']:
 p=subprocess.run(['git','check-ignore','--no-index','-q',path],cwd=R)
 checks.append({'path':path,'ignored':p.returncode==0,'expected_ignored':path in paths,'pass':(p.returncode==0)==(path in paths)})
(O/'context-proof.json').write_text(json.dumps({'synthetic_only':True,'markers':markers,'allowed_markers':allowed,'results':results,'gitignore_checks':checks},indent=2)+'\n',encoding='utf-8')
state=json.loads((O/'state.json').read_text());state['phases']['3']={'status':'PASS' if all(x['pass'] for x in checks) else 'FAIL','evidence':'context-proof.json'};state['phases']['5']={'status':'PASS' if results[-1]['expected_pass'] else 'FAIL','baseline_leaked_markers':len(results[0]['leaked_marker_paths']),'hardened_leaked_markers':len(results[-1]['leaked_marker_paths']),'evidence':'context-proof.json'};(O/'state.json').write_text(json.dumps(state,indent=2)+'\n')
print(json.dumps({'results':results,'gitignore_checks':checks},indent=2))
