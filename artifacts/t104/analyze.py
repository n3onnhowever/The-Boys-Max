"""Conservative T104 experiment, NOT the production contract or importer."""
import re,json,hashlib
from datetime import datetime,timezone,timedelta
from pathlib import Path
from probe import OUT,BASELINE,meta,save
TZ=timezone(timedelta(hours=3))
CURRENCY='(?:рублей|рубля|рубль|руб\\.?|₽)'
def price(raw,is_free):
 text=raw if isinstance(raw,str) else '';s=text.strip().lower().replace('\u00a0',' ')
 p={'price_kind':'unknown','raw_price_text':raw,'amount_min':None,'amount_max':None,'mandatory_extra_min':None,'currency':None,'is_free_claimed_by_source':is_free,'parsed_confidence':'unknown','evidence_scope':'EVENT','occurrence_binding':'UNKNOWN','fee_known':None,'payable_total':'UNKNOWN','basis':'UNKNOWN'}
 # This exact observed deposit grammar is a bounded experiment, not a general fee parser.
 m=re.fullmatch(r'вход бесплатный, депозит на еду\s*[—–-]\s*(\d+)\s*'+CURRENCY,s)
 if m:p.update(price_kind='conditional',amount_min=0,mandatory_extra_min=int(m[1]),currency='RUB',parsed_confidence='observed_literal')
 elif (is_free is True and not s) or re.fullmatch(r'(бесплатно|вход свободный|вход бесплатный)',s):p.update(price_kind='free',amount_min=0,amount_max=0,parsed_confidence='source_claim')
 else:
  m=re.fullmatch(r'(?:от )?(\d+)\s*(?:до|[–-])\s*(\d+)\s*'+CURRENCY,s)
  if m and int(m[1])<=int(m[2]):p.update(price_kind='range',amount_min=int(m[1]),amount_max=int(m[2]),currency='RUB',parsed_confidence='literal')
  else:
   m=re.fullmatch(r'(от )?(\d+)\s*'+CURRENCY+r'(?:\s+за (?:1 человека|одного участника|человека))?',s)
   if m:p.update(price_kind='from' if m[1] else 'exact',amount_min=int(m[2]),amount_max=None if m[1] else int(m[2]),currency='RUB',parsed_confidence='literal',basis='PER_PERSON' if ' за ' in s else 'UNKNOWN')
 # Free is a source base-price claim only; payable_total and mandatory fees remain UNKNOWN.
 return p
def instant(day,clock):
 if not day or not clock:return None
 try:return datetime.fromisoformat(day+'T'+clock).replace(tzinfo=TZ).astimezone(timezone.utc).isoformat()
 except ValueError:return None
def occurrence(d,e):
 exact=all(d.get(k) is False for k in ['is_continuous','is_endless','is_startless','use_place_schedule']) and d.get('schedules')==[]
 start=instant(d.get('start_date'),d.get('start_time'));end=instant(d.get('end_date'),d.get('end_time'))
 reasons=[]
 if not exact:reasons.append('RECURRENCE_OR_RANGE_UNRESOLVED')
 if d.get('end_date') and d.get('start_date')!=d.get('end_date'):
  exact=False;reasons.append('MULTIDAY_RANGE_NOT_DAILY_SESSIONS')
 if start and d.get('start') is not None and datetime.fromisoformat(start).timestamp()!=d['start']:
  exact=False;reasons.append('START_EPOCH_CONFLICT')
 if end and d.get('end') is not None and datetime.fromisoformat(end).timestamp()!=d['end']:
  end=None;reasons.append('END_EPOCH_CONFLICT')
 if start and end and end<=start:end=None;reasons.append('END_ORDER_UNPROVEN')
 if end is None:reasons.append('END_UNKNOWN')
 place=e.get('place') or {};coords=place.get('coords')
 valid=isinstance(coords,dict) and all(isinstance(coords.get(k),(int,float)) for k in ['lat','lon']) and -90<=coords['lat']<=90 and -180<=coords['lon']<=180
 return {'source_occurrence_id':None,'starts_at':start if exact else None,'ends_at':end if exact else None,'time_precision':'EXACT_OCCURRENCE' if exact and start else 'UNKNOWN','raw_span_start':start,'raw_span_end':end,'timezone':'Europe/Moscow','venue_id':place.get('id'),'address':place.get('address'),'coordinates':coords if valid else None,'location_known':valid,'lifecycle_status':'UNKNOWN','reasons':reasons}
def budget(p,cap):
 if cap is None:return 'PASS','NOT_REQUESTED'
 if p['mandatory_extra_min'] is not None and p['mandatory_extra_min']>cap:return 'NO_PASS','MANDATORY_DEPOSIT_EXCEEDS_BUDGET'
 if p['amount_min'] is not None and p['amount_min']>cap:return 'NO_PASS','SOURCE_LOWER_BOUND_EXCEEDS_BUDGET'
 return 'UNKNOWN','EVENT_PRICE_NOT_CONFIRMED_OCCURRENCE_TOTAL'
def relevant(d,day):
 a=d.get('start_date');b=d.get('end_date')
 if a==day:return True
 if a and a>day:return False
 if b and b<day:return False
 return bool(d.get('schedules') or d.get('is_startless') or d.get('is_endless') or (a and b and a<=day<=b))
def read(name):return json.loads((OUT/'receipts'/f'{name}.json').read_text(encoding='utf-8'))
def receipt_fields(r,e=None):
 e=e or {}
 return {**{k:r.get(k) for k in ['queried_at_utc','provider','api_version','request_url','request_parameters','http_status','latency_ms','response_hash','headers','baseline_sha','verifier']},'source_event_id':e.get('id'),'source_url':e.get('site_url'),'raw_dates':e.get('dates'),'raw_place':e.get('place'),'raw_location':e.get('location'),'raw_coordinates':(e.get('place') or {}).get('coords'),'raw_price':e.get('price'),'raw_is_free':e.get('is_free'),'raw_category':e.get('categories'),'normalized_event':{'provider':'KudaGo','source_event_id':e.get('id'),'title':e.get('title'),'categories':e.get('categories'),'source_url':e.get('site_url'),'fetched_at':r.get('queried_at_utc'),'provider_updated_at':None,'status':'UNKNOWN'} if e else None,'normalized_price':price(e.get('price'),e.get('is_free')) if e else None}
# Literal frozen start windows; no movement of dates. DG03 additionally needs end <=22.
SPECS=[('DG-01','2026-09-17',19*60,1440,1000,202293),('DG-02','2026-09-17',18*60,1440,2000,199924),('DG-03','2026-09-17',18*60,22*60,2000,210582),('DG-04','2026-09-19',15*60,19*60,1000,202293),('DG-05','2026-09-19',18*60,1440,2500,203229),('DG-06','2026-09-19',21*60,1440,2000,209577),('DG-07','2026-09-19',11*60,20*60,0,210889),('DG-08','2026-09-20',18*60,1440,2000,203209),('DG-09','2026-09-20',20*60,20*60,0,190707)]
def analyze():
 collection=json.loads((OUT/'COLLECTION.json').read_text(encoding='utf-8'));rows=[];all_events={};price_samples={};audit=[]
 for task,day,lo,hi,cap,preferred in SPECS:
  info=next(x for x in collection['queries'] if x['task']==task);receipts=[read(n) for n in info['pages']]
  entries=[(r,e) for r in receipts for e in r.get('payload',{}).get('results',[])]
  evaluations=[]
  for r,e in entries:
   all_events[e['id']]=(r,e);p=price(e.get('price'),e.get('is_free'));price_samples.setdefault(p['price_kind'],(r,e))
   dates=[d for d in e.get('dates',[]) if relevant(d,day)]
   for d in dates:
    o=occurrence(d,e);checks=[]
    if o['starts_at']:
     t=datetime.fromisoformat(o['starts_at']).astimezone(TZ);minute=t.hour*60+t.minute+t.second/60
     checks.append(('time','PASS' if t.date().isoformat()==day and (minute>lo if task in ['DG-01','DG-02','DG-05','DG-06','DG-08'] else minute>=lo) and minute<=hi else 'NO_PASS'))
     checks.append(('future','PASS' if datetime.fromisoformat(o['starts_at'])>datetime.fromisoformat(r['queried_at_utc']) else 'NO_PASS'))
    else:checks.extend([('time','UNKNOWN'),('future','UNKNOWN')])
    if task=='DG-03':checks.append(('end_before','UNKNOWN' if o['ends_at'] is None else 'PASS' if datetime.fromisoformat(o['ends_at']).astimezone(TZ).isoformat()[:16]<=day+'T22:00' else 'NO_PASS'))
    verdict,reason=budget(p,cap);checks.append(('budget',verdict))
    checks.append(('city','PASS' if (e.get('location') or {}).get('slug')=='msk' else 'UNKNOWN'))
    checks.append(('source','PASS' if e.get('site_url') else 'UNKNOWN'))
    required_category=r['request_parameters'].get('categories')
    checks.append(('category','PASS' if required_category is None or required_category in (e.get('categories') or []) else 'NO_PASS' if isinstance(e.get('categories'),list) else 'UNKNOWN'))
    result='NO_PASS' if any(s=='NO_PASS' for _,s in checks) else 'UNKNOWN' if any(s=='UNKNOWN' for _,s in checks) else 'PASS'
    evaluations.append({'source_event_id':e['id'],'date':d,'normalized_occurrence':o,'checks':dict(checks),'price_reason':reason,'result':result})
  er=next(((r,e) for r,e in entries if e['id']==preferred),entries[0] if entries else (receipts[0],{}));r,e=er
  selected=[x for x in evaluations if x['source_event_id']==e.get('id')]
  # Gate measures live suitability; past frozen days cannot be revived by a current fetch.
  past=day<datetime.fromisoformat(r['queried_at_utc']).astimezone(TZ).date().isoformat()
  if any(rr['http_status']!=200 for rr in receipts):status='ERROR';reason='API_REQUEST_FAILED'
  elif task=='DG-09' and e.get('id')==190707 and budget(price(e.get('price'),e.get('is_free')),0)[0]=='NO_PASS':status='NO_PASS';reason='MANDATORY_DEPOSIT_EXCEEDS_ZERO; exact recurring session remains unconfirmed'
  elif past:status='NO_PASS';reason='FROZEN_DAY_ALREADY_PAST_AT_FETCH; historical payload does not prove live future suitability'
  elif any(x['result']=='PASS' for x in evaluations):status='PASS';reason='VERIFIED_SUITABLE'
  elif not info['complete'] or any(x['result']=='UNKNOWN' for x in evaluations):status='UNKNOWN';reason='NO_CONFIRMED_OCCURRENCE_TOTAL_OR_EXACT_SESSION'
  else:status='NO_PASS';reason='NO_CONFIRMED_MATCH_IN_COMPLETE_QUERY'
  row={**receipt_fields(r,e),'task_id':task,'hard_constraints':{'city':'msk','day':day,'timezone':'Europe/Moscow','category':r['request_parameters'].get('categories'),'start_lower_boundary':'exclusive' if task in ['DG-01','DG-02','DG-05','DG-06','DG-08'] else 'inclusive','start_minute_min':lo,'start_minute_max':hi,'budget_max_rub':cap,'future_at_fetch_required':True,'must_end_before':'22:00' if task=='DG-03' else None},'result':status,'suitable_occurrence_verified':status=='PASS','reason':reason,'normalized_occurrence':[x['normalized_occurrence'] for x in selected],'notes':['Experiment only; legal gate evaluated separately.','Provider event-level price is not an occurrence-specific all-in offer.','Full relevant candidate evaluation is in CANDIDATE_AUDIT.json.'],'query_coverage':info,'evidence_files':['receipts/'+n+'.json' for n in info['pages']]}
  rows.append(row);audit.append({'task_id':task,'evaluations':evaluations})
 # Current null-end and missing-place examples from fresh, explicitly bounded sample.
 scan=read('DG-10_11_page_1');events=scan.get('payload',{}).get('results',[])
 for e in events:all_events[e['id']]=(scan,e);price_samples.setdefault(price(e.get('price'),e.get('is_free'))['price_kind'],(scan,e))
 for task in ['DG-10','DG-11']:
  selected=None
  for e in events:
   for d in e.get('dates',[]):
    o=occurrence(d,e)
    if o['starts_at'] and datetime.fromisoformat(o['starts_at'])>datetime.fromisoformat(scan['queried_at_utc']) and ((task=='DG-10' and d.get('end_time') is None) or (task=='DG-11' and e.get('place') is None)):
     selected=(e,d,o);break
   if selected:break
  if selected:
   e,d,o=selected
   rows.append({**receipt_fields(scan,e),'task_id':task,'hard_constraints':{'must_end_before':'22:00'} if task=='DG-10' else {'no_invented_coordinates':True,'no_invented_cancellation_status':True},'result':'PASS','suitable_occurrence_verified':False,'suitability_result':'UNKNOWN','normalized_occurrence':o,'selected_raw_date':d,'reason':'SAFETY_TEST_PASSED; UNKNOWN preserved; not a suitable-occurrence count','notes':['PASS denotes executed safety behavior only.','UI hiding/map CTA is NOT_RUN; experiment proves data behavior.'],'evidence_files':['receipts/DG-10_11_page_1.json']})
  else:rows.append({**receipt_fields(scan),'task_id':task,'hard_constraints':{},'result':'UNKNOWN','suitable_occurrence_verified':False,'normalized_occurrence':None,'reason':'NO_CURRENT_SAMPLE_IN_BOUNDED_SCAN','notes':[]})
 r=read('DG-12_page_1');p=r.get('payload',{});empty=r['http_status']==200 and p.get('count')==0 and p.get('results')==[] and p.get('next') is None
 rows.append({**receipt_fields(r),'task_id':'DG-12','hard_constraints':{'city':'msk','day':'2026-09-20','category':'theater','free':True,'start_after':'23:30','auto_relax':False},'result':'PASS' if empty else 'UNKNOWN','suitable_occurrence_verified':False,'normalized_occurrence':[],'matching_occurrences':[],'reason':'SAFETY_TEST_PASSED; exact empty response, no relaxed requests' if empty else 'EMPTY_NOT_PROVEN','notes':['PASS denotes no-result behavior, not a suitable occurrence.'],'evidence_files':['receipts/DG-12_page_1.json']})
 rows.sort(key=lambda r:r['task_id']);counts={s:sum(r['result']==s for r in rows) for s in ['PASS','NO_PASS','UNKNOWN','ERROR']}
 summary={'task_status_counts':counts,'final_status_count':len(rows),'verified_suitable_task_count':sum(r['suitable_occurrence_verified'] for r in rows),'critical_false_pass':sum(x['result']=='PASS' and x['task_id']=='DG-09' for x in rows),'critical_false_pass_scope':'T104 experiment; production replay independently recorded','DATA_RUNTIME_GATE':'FAIL','LEGAL_MANUAL_GATE':'OPEN','provider_status':'CONDITIONAL_PRIMARY / NOT APPROVED','moscow_activation':False}
 runtime_conditions={'all_12_final_statuses':len(rows)==12 and all(r['result'] in counts for r in rows),'at_least_8_verified_suitable':summary['verified_suitable_task_count']>=8,'zero_observed_critical_false_pass':summary['critical_false_pass']==0,'required_safety_cases_evidenced':next(r for r in rows if r['task_id']=='DG-09')['result']=='NO_PASS' and all(r['result']=='PASS' for r in rows if r['task_id'] in ['DG-10','DG-11','DG-12'])}
 summary['runtime_conditions']=runtime_conditions
 summary['DATA_RUNTIME_GATE']='PASS' if all(runtime_conditions.values()) else 'FAIL'
 out={**meta(),'response_hashes':{n.name:json.loads(n.read_text(encoding='utf-8')).get('response_hash') for n in sorted((OUT/'receipts').glob('*.json'))},'status_semantics':'DG01-09 are suitability verdicts; DG10-12 PASS tests safety only, never coverage. Past frozen dates are not shifted.','summary':summary,'tasks':rows}
 save('MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json',out);save('CANDIDATE_AUDIT.json',{**meta(),'response_hashes':out['response_hashes'],'tasks':audit})
 save('PRICE_SAMPLES.json',{**meta(),'samples':{k:{**receipt_fields(r,e),'normalized_occurrence':None} for k,(r,e) in price_samples.items()}})
 print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':analyze()
