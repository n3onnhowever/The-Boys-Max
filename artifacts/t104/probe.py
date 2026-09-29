"""T104 isolated official-public-API evidence collector; stdlib only; no ingestion."""
from __future__ import annotations
import hashlib,json,time,urllib.request,urllib.parse,urllib.error
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/t104'
BASELINE='5e4973f24fb74489387b3c29313cfcd1e8401ca7'
BASE='https://kudago.com/public-api/v1.4'
VERSION='t104-probe/1'
FIELDS='id,title,dates,place,location,categories,price,is_free,site_url,publication_date'
def now(): return datetime.now(timezone.utc).isoformat()
def sha(b): return hashlib.sha256(b).hexdigest()
def save(name,data):
 p=OUT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,indent=None if name.startswith('receipts/') else 2,separators=(',',':') if name.startswith('receipts/') else None)+'\n',encoding='utf-8',newline='\n')
def meta(): return dict(baseline_sha=BASELINE,api_version='v1.4',verifier=VERSION,probe_timestamp=now())
def sanitize_event(e):
 out={k:v for k,v in e.items() if k in FIELDS.split(',')}
 if isinstance(out.get('place'),dict): out['place']={k:v for k,v in out['place'].items() if k in ['id','title','address','coords','location','subway','is_stub']}
 if isinstance(out.get('location'),dict): out['location']={k:v for k,v in out['location'].items() if k in ['slug','name','timezone','currency']}
 return out
def fetch(name,path,params=None,kind='api'):
 url=path if path.startswith('https://') else BASE+path
 if params: url+='?'+urllib.parse.urlencode(params)
 parsed=urllib.parse.urlparse(url)
 assert parsed.scheme=='https' and parsed.hostname in ['kudago.com','docs.kudago.com']
 time.sleep(1.2)
 receipt={**meta(),'request_url':url,'request_parameters':params or {},'queried_at_utc':now(),'provider':'KudaGo','timeout_seconds':25,'response_hash':None,'http_status':None,'headers':{},'transport_error':None}
 start=time.perf_counter();body=None;payload=None
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Povod-T104-DataGate/1.0','Accept':'application/json' if kind=='api' else 'text/html'})
  try: r=urllib.request.urlopen(req,timeout=25)
  except urllib.error.HTTPError as err: r=err
  with r:
   body=r.read();receipt['http_status']=r.status;receipt['final_url']=r.url
   receipt['headers']={k.lower():v for k,v in r.headers.items() if k.lower() in ['date','content-type','content-length','cache-control','expires','etag','last-modified','age','vary','retry-after','server','via'] or 'ratelimit' in k.lower() or 'rate-limit' in k.lower()}
  receipt['response_hash']=sha(body);receipt['response_bytes']=len(body)
  if kind=='api':
   try: payload=json.loads(body)
   except (ValueError,UnicodeError): receipt['decode_error']='NON_JSON_BODY_NOT_RETAINED'
 except Exception as err: receipt['transport_error']=type(err).__name__+': '+str(err)
 receipt['latency_ms']=round((time.perf_counter()-start)*1000,2)
 if isinstance(payload,dict):
  receipt['payload_field_names']=sorted(payload)
  if isinstance(payload.get('dates'),list): receipt['date_field_names']=sorted({k for d in payload['dates'] for k in d})
  if isinstance(payload.get('results'),list):
   receipt['payload']={k:payload.get(k) for k in ['count','next','previous']}
   receipt['payload']['results']=[sanitize_event(e) for e in payload['results']]
  elif 'id' in payload and ('dates' in payload or 'site_url' in payload): receipt['payload']=sanitize_event(payload)
  else: receipt['payload']=payload
 elif isinstance(payload,list): receipt['payload']=payload
 receipt['retention']='Sanitized factual fields only; raw HTTP entity SHA256 before JSON parsing; no images/body/description/cookies retained.'
 save('receipts/'+name+'.json',receipt)
 print(name,receipt['http_status'],receipt['latency_ms'],'ms',receipt.get('transport_error') or '',flush=True)
 return receipt,body
if __name__=='__main__':
 import sys
 if sys.argv[1:] == ['bootstrap']:
  fetch('categories','/event-categories/',{'lang':'ru'})
  fetch('moscow','/locations/msk/',{'fields':'slug,name,timezone,currency'})
  fetch('first_moscow','/events/',{'location':'msk','actual_since':'2026-09-19T00:00:00+03:00','actual_until':'2026-09-20T00:00:00+03:00','page_size':10,'fields':FIELDS,'expand':'dates,place,location','order_by':'id','text_format':'text'})
  fetch('official_docs','https://docs.kudago.com/api/',kind='docs')
