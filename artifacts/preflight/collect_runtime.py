from pathlib import Path
import subprocess,json,re,hashlib,datetime,shutil
r=Path.cwd();e=r/'artifacts/preflight'; logs=e/'logs';logs.mkdir(exist_ok=True)
def redact(s):
 s=re.sub(r'(https?://)[^/\s@]+@',r'\1[REDACTED]@',s)
 return s
def run(name,args):
 try:
  p=subprocess.run(args,cwd=r,capture_output=True,timeout=50); out=p.stdout.decode('utf-8','replace')+p.stderr.decode('utf-8','replace'); code=p.returncode
 except Exception as ex:out=str(ex);code=None
 out=redact(out);(logs/(name+'.txt')).write_text(out,encoding='utf-8');return {'command':args,'exit_code':code,'log':f'artifacts/preflight/logs/{name}.txt','output':out}
git=['git','-c','safe.directory=D:/Dev/Repos/The-Boys-Max']
checks={}
for name,args in [('head',git+['rev-parse','HEAD']),('branch',git+['branch','--show-current']),('remotes',git+['remote','-v']),('tracked-files',git+['ls-files']),('git-config-names',git+['config','--name-only','--list']),('hooks-path',git+['config','--get','core.hooksPath']),('node',['node','--version']),('npm',['npm.cmd','--version']),('docker',['docker','--version']),('compose',['docker','compose','version']),('docker-runtime',['docker','info','--format','{{.ServerVersion}}']),('psql',['psql','--version']),('unit',['npm.cmd','run','test:unit']),('typecheck',['npm.cmd','run','typecheck']),('build',['npm.cmd','run','build'])]:
 checks[name]=run(name,args);print(name,checks[name]['exit_code'],checks[name]['output'][-450:])
(e/'COMMAND_RESULTS.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
