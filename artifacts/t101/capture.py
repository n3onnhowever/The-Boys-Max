from pathlib import Path
import subprocess, json, hashlib, datetime, time, sys, re
ROOT = Path(__file__).resolve().parents[2]
GIT = ['git', '-c', 'safe.directory=D:/Dev/Repos/The-Boys-Max']
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write_json(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def run(task, name, args, timeout=600):
    folder = ROOT/'artifacts'/task
    (folder/'logs').mkdir(parents=True, exist_ok=True)
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    tick = time.monotonic()
    try:
        p = subprocess.run(args, cwd=ROOT, capture_output=True, timeout=timeout)
        out = p.stdout.decode('utf-8','replace') + p.stderr.decode('utf-8','replace')
        code = p.returncode
    except subprocess.TimeoutExpired as e:
        out = (e.stdout or b'').decode('utf-8','replace')+(e.stderr or b'').decode('utf-8','replace')+'\nCOMMAND_TIMEOUT'
        code = None
    except Exception as e: out=str(e); code=None
    out = re.sub(r'(https?://)[^/\s@]+@', r'\1[REDACTED]@', out)
    log = folder/'logs'/(name+'.txt')
    log.write_text(out,encoding='utf-8')
    receipt = {'command':args,'cwd':str(ROOT),'started_at':start,'duration_seconds':round(time.monotonic()-tick,3),'exit_code':code,'log':log.relative_to(ROOT).as_posix()}
    result = folder/'COMMAND_RESULTS.json'
    data = json.loads(result.read_text(encoding='utf-8')) if result.exists() else {}
    data[name]=receipt
    write_json(result,data)
    print(json.dumps(receipt,ensure_ascii=False)); print(out[-3500:])
    return code
if __name__=='__main__':
    task,name,*args=sys.argv[1:]
    raise SystemExit(run(task,name,args) or 0)
