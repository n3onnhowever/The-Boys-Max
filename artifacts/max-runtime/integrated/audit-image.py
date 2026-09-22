import subprocess,tarfile,json,re,hashlib,time
from pathlib import Path
O=Path('artifacts/max-runtime/integrated');receipt=json.loads((O/'EXACT_IMAGE.json').read_text());image=receipt['imageId'];name='povod-max-image-audit-'+receipt['sourceSha'][:8]
started=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());created=subprocess.run(['docker','create','--name',name,image],capture_output=True,text=True);assert created.returncode==0,'AUDIT_CREATE_FAILED'
paths=[];forbidden=[];content=[];sizes=0;files=0;scanned=0;privatekeys=[]
marker=b'SYNTHETIC_MAX_INTEGRATION_EXCLUDED_MARKER_20260920'
need=['app/dist/apps/api/main.js','app/dist/apps/worker/main.js','app/dist/scripts/migrate.js','app/dist/certs/russian-trusted-root-ca.crt','app/dist/packages/platform/governor.lua','app/dist/miniapp/index.html','app/package.json','app/package-lock.json']
try:
 p=subprocess.Popen(['docker','export',name],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 with tarfile.open(fileobj=p.stdout,mode='r|*') as archive:
  for entry in archive:
   path=entry.name.lstrip('./');paths.append(path)
   parts=path.split('/')
   if any(x in ['.secrets','.git','.runtime','.run-evidence'] or x=='.env' or x.startswith('.env.') for x in parts):forbidden.append(path)
   if re.match(r'^app/(artifacts|docs|input|tests|apps|packages|modules|scripts|certs|research|screenshots)(/|$)',path):forbidden.append(path)
   if not entry.isfile():continue
   files+=1;sizes+=entry.size
   f=archive.extractfile(entry);tail=b'';matched=set()
   while True:
    b=f.read(1024*1024)
    if not b:break
    data=tail+b;scanned+=len(b)
    for label,value in [('synthetic-exclusion-marker',marker),('MAX_BOT_TOKEN-name',b'MAX_BOT_TOKEN'),('synthetic-test-token',b'SYNTHETIC_TEST_TOKEN'),('synthetic-test-password',b'SYNTHETIC_LOCAL_ONLY')]:
     if value in data:matched.add(label)
    if re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]{64,}',data):matched.add('private-key-material')
    tail=data[-512:]
   for rule in sorted(matched):content.append({'path':path,'rule':rule})
 assert p.wait()==0,'EXPORT_FAILED'
finally:subprocess.run(['docker','rm',name],capture_output=True)
missing=[x for x in need if x not in paths];dev=[x for x in ['app/node_modules/typescript/package.json','app/node_modules/vite/package.json','app/node_modules/tsx/package.json'] if x in paths]
status='PASS' if not forbidden and not content and not missing and not dev else 'FAIL'
result={'status':status,'imageId':image,'sourceSha':receipt['sourceSha'],'started':started,'method':'docker create exact image; stream docker export of unmounted final rootfs; full regular-file byte scan','entries':len(paths),'regularFiles':files,'regularBytes':sizes,'scannedBytes':scanned,'forbiddenPaths':forbidden,'contentFindings':content,'requiredMissing':missing,'developmentDependencyFindings':dev,'requiredRuntimeInputs':need,'productionDependenciesRetained':any(x.startswith('app/node_modules/') for x in paths)}
(O/'IMAGE_CONTENT_AUDIT.json').write_text(json.dumps(result,indent=2)+'\n')
(O/'logs/image-content-paths.txt').write_text('\n'.join(paths)+'\n')
print(json.dumps({k:result[k] for k in ['status','imageId','entries','regularFiles','scannedBytes','forbiddenPaths','contentFindings','requiredMissing','developmentDependencyFindings']}))
raise SystemExit(0 if status=='PASS' else 1)
