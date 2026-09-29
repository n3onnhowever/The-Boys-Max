"""Record exact commands, source hashes, exits and logs for T104 verification."""
import subprocess,time,json,hashlib,sys
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/t104'
def stamp():return datetime.now(timezone.utc).isoformat()
def run(name,args):
 tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
 sources={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in tracked if p and (ROOT/p).is_file()}
 for p in OUT.glob('*.py'): sources[p.relative_to(ROOT).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
 for p in list(OUT.glob('*.ts'))+list(OUT.glob('*.mjs')): sources[p.relative_to(ROOT).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
 manifest=json.dumps(sources,sort_keys=True).encode();h=hashlib.sha256(manifest).hexdigest()
 (OUT/'logs'/f'sources-{h}.json').write_bytes(manifest)
 start=stamp();t=time.perf_counter()
 r=subprocess.run(args,cwd=ROOT,capture_output=True)
 captured=r.stdout+r.stderr
 log=('\n'.join(line.rstrip() for line in captured.decode('utf-8',errors='replace').splitlines()).rstrip()+'\n').encode('utf-8')
 (OUT/'logs'/f'{name}.txt').write_bytes(log)
 path=OUT/'COMMAND_RESULTS.json';data=json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
 data.append({'api_version':'v1.4','response_hashes_ref':'RECEIPT_INDEX.json','name':name,'argv':args,'cwd':str(ROOT),'baseline_sha':'5e4973f24fb74489387b3c29313cfcd1e8401ca7','head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),'started_at_utc':start,'completed_at_utc':stamp(),'duration_seconds':round(time.perf_counter()-t,3),'exit_code':r.returncode,'source_manifest_sha256':h,'log':f'logs/{name}.txt','log_sha256':hashlib.sha256(log).hexdigest(),'captured_output_sha256':hashlib.sha256(captured).hexdigest(),'log_transform':'UTF-8, LF, trailing whitespace/blank EOF removed; command output semantics preserved'})
 path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
 print(name,'exit',r.returncode,'seconds',data[-1]['duration_seconds']);print(log.decode('utf-8',errors='replace')[-1500:]);return r.returncode
if __name__=='__main__':raise SystemExit(run(sys.argv[1],sys.argv[2:]))
