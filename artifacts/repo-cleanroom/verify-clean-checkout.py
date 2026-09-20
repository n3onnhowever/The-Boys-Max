import hashlib,json,os,shutil,subprocess,time
from pathlib import Path
R=Path(r'D:\Dev\Repos\The-Boys-Max-repo-cleanroom'); O=R/'artifacts/repo-cleanroom'; W=Path(r'D:\Dev\Repos\The-Boys-Max-repo-cleanroom-verify'); I=O/'install/final'; I.mkdir(parents=True,exist_ok=True)
base='1e4a7a2b454bed87bdcb40559773143c2fc38c9b'; sha=subprocess.check_output(['git','-C',str(W),'rev-parse','HEAD'],text=True).strip()
E={k:v for k,v in os.environ.items() if k.upper() in {'PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','PROGRAMFILES','PROGRAMFILES(X86)','PROGRAMW6432','PROCESSOR_ARCHITECTURE','NUMBER_OF_PROCESSORS','OS','SYSTEMDRIVE','DOCKER_HOST','DOCKER_CONTEXT'}}
for name in ['user.npmrc','global.npmrc']: (I/name).write_text('',encoding='utf-8')
E.update(NPM_CONFIG_USERCONFIG=str(I/'user.npmrc'),NPM_CONFIG_GLOBALCONFIG=str(I/'global.npmrc'),NPM_CONFIG_CACHE=str(I/'npm-cache'),NPM_CONFIG_UPDATE_NOTIFIER='false')
D=I/'docker-config'; D.mkdir(exist_ok=True)
(D/'config.json').write_text(json.dumps({'cliPluginsExtraDirs':[r'C:\Users\admin\.docker\cli-plugins']}),encoding='utf-8')
E.pop('DOCKER_CONTEXT',None); E['DOCKER_CONFIG']=str(D); E['DOCKER_HOST']='npipe:////./pipe/dockerDesktopLinuxEngine'
npm=shutil.which('npm.cmd'); node=shutil.which('node'); records=[]
def save():
 (O/'clean-checkout-results.json').write_text(json.dumps({'base_sha':base,'verified_sha':sha,'proof_path':str(W),'environment_policy':'Only OS/tool location variables retained; no APP/NODE/credential variables; explicit empty npm user/global configs and new cache','npm_executable':npm,'node_executable':node,'records':records},indent=2)+'\n',encoding='utf-8')
def run(label,args,env=None,expected=None,timeout=900):
 started=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()); t=time.monotonic(); log=O/'raw'/f'{label}.txt'; rc=None
 try:
  p=subprocess.run(args,cwd=W,env=env or E,capture_output=True,timeout=timeout); raw=p.stdout+p.stderr;rc=p.returncode
 except subprocess.TimeoutExpired as ex: raw=(ex.stdout or b'')+(ex.stderr or b'')+b'\nCLEANROOM_TIMEOUT\n';rc=124
 log.write_bytes(raw)
 status='PASS' if (rc==0 if expected is None else expected(rc,raw)) else ('BLOCKED_TIMEOUT' if rc==124 else 'FAIL')
 rec=dict(label=label,command=args,cwd=str(W),source_sha=sha,started_utc=started,seconds=round(time.monotonic()-t,2),exit=rc,status=status,log='raw/'+log.name,log_sha256=hashlib.sha256(raw).hexdigest());records.append(rec);save();print(json.dumps({k:rec[k] for k in ['label','status','exit','seconds']}),flush=True);return rec,raw
pre={'status':subprocess.check_output(['git','-C',str(W),'status','--porcelain'],text=True),'node_modules_exists':(W/'node_modules').exists(),'dist_exists':(W/'dist').exists(),'private_local_paths_present':[p for p in ['.secrets','.runtime','.env','.env.release'] if (W/p).exists()],'lock_sha256':hashlib.sha256((W/'package-lock.json').read_bytes()).hexdigest()}
(O/'clean-checkout-preflight.json').write_text(json.dumps(pre,indent=2)+'\n')
assert not pre['status'] and not pre['node_modules_exists'] and not pre['dist_exists'] and not pre['private_local_paths_present']
run('proof-node-version',[node,'--version']);run('proof-npm-version',[npm,'--version'])
run('proof-lock-review',[node,'scripts/review-lock.mjs'])
shutil.copyfile(W/'lock-review.json',O/'lock-review.json')
run('proof-lock-tree',[npm,'ls','--package-lock-only','--all','--json'])
sbom,raw=run('proof-sbom',[npm,'sbom','--package-lock-only','--sbom-format','cyclonedx','--ignore-scripts','--offline'])
if sbom['exit']==0:
 data=json.loads(raw);assert data['bomFormat']=='CycloneDX';(O/'sbom.cdx.json').write_bytes(raw)
run('proof-advisories',[npm,'audit','--package-lock-only','--json','--ignore-scripts'],timeout=120)
install,_=run('proof-npm-ci',[npm,'ci','--ignore-scripts','--no-audit','--no-fund'],timeout=900)
if install['exit']==0:
 run('proof-typecheck',[npm,'run','typecheck']);run('proof-unit',[npm,'run','test:unit']);run('proof-build',[npm,'run','build'])
 run('proof-host-missing-config',[node,'dist/apps/api/main.js'],expected=lambda rc,out:rc!=0 and b'APP_MODE_REQUIRED' in out,timeout=30)
 live=E|{'APP_MODE':'live','COOKIE_PROFILE':'LAX_FIRST_PARTY','PUBLIC_ORIGIN':'https://cleanroom.example.invalid'}
 run('proof-host-missing-secrets',[node,'dist/apps/api/main.js'],env=live,expected=lambda rc,out:rc!=0 and b'MISSING_SESSION_KEY' in out,timeout=30)
run('proof-diff-check',['git','diff','--check'])
image='povod-repo-cleanroom:'+sha[:12]
built,_=run('proof-docker-build',['docker','build','--no-cache','--progress=plain','--iidfile',str(O/'docker-image-id.txt'),'-t',image,'.'],timeout=1200)
if built['exit']==0:
 run('proof-docker-missing-config',['docker','run','--rm','--network','none',image],expected=lambda rc,out:rc!=0 and b'APP_MODE_REQUIRED' in out,timeout=60)
 run('proof-docker-missing-secrets',['docker','run','--rm','--network','none','-e','APP_MODE=live','-e','COOKIE_PROFILE=LAX_FIRST_PARTY','-e','PUBLIC_ORIGIN=https://cleanroom.example.invalid',image],expected=lambda rc,out:rc!=0 and b'MISSING_SESSION_KEY' in out,timeout=60)
 run('proof-base-image-digest',['docker','image','inspect','node:24.20.0-bookworm-slim','--format','{{json .RepoDigests}}'])
run('proof-final-status',['git','status','--short','--branch'])
assert hashlib.sha256((W/'package-lock.json').read_bytes()).hexdigest()==pre['lock_sha256']
state=json.loads((O/'state.json').read_text());state['cleanup_sha']=sha;state['phases']['7']={'status':'PASS' if all(x['status']=='PASS' for x in records if x['label']!='proof-advisories') else 'FAIL','evidence':'clean-checkout-results.json','source_sha':sha,'integration_runtime':'NOT_RUN','external_MAX_provider':'NOT_RUN'};state['phases']['6']={'status':'AUDITED','sbom_status':sbom['status'],'evidence':'lock-review.json'};(O/'state.json').write_text(json.dumps(state,indent=2)+'\n')
