import fs from 'node:fs';
import assert from 'node:assert/strict';
import {normalizeKudaGoRecord,kudagoQuote,normalizePublicPage} from '../../modules/search/core/normalizers.ts';
import {evaluateEligibility} from '../../modules/search/core/eligibility.ts';
const out=new URL('./',import.meta.url);
const read=(name)=>JSON.parse(fs.readFileSync(new URL(name,out),'utf8'));
const gate=read('MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json');
const rights={policy_id:'t104-open',policy_revision:'1',reviewed_at:'2026-09-19T00:00:00Z',review_due_at:'2026-09-20T00:00:00Z',revoked_at:null,display_facts:'UNKNOWN',display_text:'UNKNOWN',display_images:'UNKNOWN',persist_minimal:'UNKNOWN',ad_clearance:'UNKNOWN',evidence_refs:[]};
const ctx=(r)=>({observation_prefix:'t104',fetched_at:new Date(r.queried_at_utc).toISOString(),payload_sha256:r.response_hash,data_mode:'LIVE',rights,city_map:{msk:'moscow'},timezones:{moscow:'Europe/Moscow'},category_map:{},taxonomy_mapping_evidence_ref:null,taxonomy_exhaustive:false,timepad_ticket_units:null});
const seen=new Set();const full=[];
for(const name of fs.readdirSync(new URL('receipts/',out)).filter(n=>n.startsWith('DG-'))){
 const r=read('receipts/'+name);
 for(const e of r.payload?.results??[]){
  if(seen.has(e.id))continue;seen.add(e.id);
  const entry={source_event_id:e.id,receipt:'receipts/'+name,response_hash:r.response_hash,date_count:e.dates?.length??0};
  try{const c=normalizeKudaGoRecord(e,ctx(r));entry.normalized_count=c.length;entry.exact_count=c.filter(x=>x.time_precision==='EXACT_OCCURRENCE').length;entry.status='NORMALIZED';}
  catch(err){entry.status='QUARANTINED';entry.error=err.message;}
  full.push(entry);
 }
}
const evidence=[];const failures=[];
const intent={city:{id:'moscow',label:'Москва'},date:null,timezone:'Europe/Moscow',time_window:null,included_categories:[],excluded_categories:[],interested_count:1,inventory_requirement:{kind:'NOT_REQUESTED'},budget:{max_minor:'0',currency:'RUB',basis:'PER_PERSON'},indoor:null,wheelchair_required:null};
function evaluate(c,r,overrides={}){return evaluateEligibility({...intent,...overrides},c,{now_utc:new Date(r.queried_at_utc).toISOString(),cities:new Map([['moscow',{label:'Москва',timezones:['Europe/Moscow']}]]),max_future_days:366,freshness_ttl_seconds:3600,inventory_ttl_seconds:300});}
function check(name,fn){try{fn();}catch(err){failures.push({name,error:err.message});}}
for(const task of ['DG-09','DG-10','DG-11']){
 const row=gate.tasks.find(x=>x.task_id===task);const receipt=read(row.evidence_files[0]);const event=receipt.payload.results.find(x=>x.id===row.source_event_id);
 const d=row.selected_raw_date??event.dates.find(x=>x.start_date&&x.start_time&&!x.is_startless&&!x.is_endless&&!x.use_place_schedule&&x.schedules?.length===0);
 // Selection of one unmodified date is explicitly an EXPERIMENT; full record result remains above.
 check(task,()=>{
  assert(d,'raw expanded date sample required');const projected={...event,dates:[d]};const c=normalizeKudaGoRecord(projected,ctx(receipt))[0];
  const eligibility=evaluate(c,receipt,task==='DG-10'?{date:{kind:'EXACT',on:d.start_date},time_window:{start:'00:00',end:'22:00',end_day_offset:0,mode:'FULLY_WITHIN'}}:{});
  assert.notEqual(eligibility.status,'PASS');
  if(task==='DG-09'){assert.equal(c.price.source_quote.kind,'TEXT');assert.equal(c.price.total_price.knownness,'UNKNOWN');}
  if(task==='DG-10'){assert.equal(c.ends_at,null);assert.equal(eligibility.checks.find(x=>x.field==='time').status,'UNKNOWN');}
  if(task==='DG-11'){assert.equal(c.venue.coordinates,null);assert.equal(c.status,'UNKNOWN');}
  evidence.push({task_id:task,source_event_id:event.id,response_hash:receipt.response_hash,receipt:row.evidence_files[0],mode:'EXPERIMENT_SINGLE_RAW_DATE; NOT FULL RECORD ACCEPTANCE',raw_date:d,normalized_candidate:c,eligibility});
 });
}
check('conditional-label',()=>{const q=kudagoQuote('вход бесплатный, депозит на еду — 700 рублей',true);assert.equal(q.kind,'TEXT');assert(q.warnings.some(x=>x.code==='FREE_LABEL_CONFLICT'));});
check('malformed-input',()=>{assert.throws(()=>normalizeKudaGoRecord({id:'synthetic-invalid',dates:'malformed'},ctx(read('receipts/DG-04_page_1.json'))));});
const defects=[];
for(const error of ['ARRAY_REQUIRED:dates','INTEGER_REQUIRED:integer','NATIVE_TIME_CONFLICT:payload']){
 const item=full.find(x=>x.error===error);const r=read(item.receipt);const e=r.payload.results.find(x=>x.id===item.source_event_id);
 const defect={...item,raw_input_ref:item.receipt+'#/payload/results[id='+e.id+']',baseline_output:error};
 if(error!=='ARRAY_REQUIRED:dates'){
  for(let i=0;i<e.dates.length;i++){try{normalizeKudaGoRecord({...e,dates:[e.dates[i]]},ctx(r));}catch(err){if(err.message===error){defect.first_failing_date_index=i;defect.raw_date=e.dates[i];break;}}}
 }
 defects.push(defect);
}
check('partial-page',()=>{const r=read('receipts/pagination_1.json');const p=normalizePublicPage(r.payload,{provider_id:'KudaGo',max_items:100,approval_id:'t104-isolated'},null,ctx(r));assert.equal(p.coverage.all_pages_consumed,false);assert.equal(p.coverage.snapshot_consistent,false);evidence.push({task_id:'PARTIAL',response_hash:r.response_hash,coverage:p.coverage,next_cursor:p.next_cursor});});
check('missing-pagination-metadata-synthetic',()=>{const r=read('receipts/pagination_1.json');const p=normalizePublicPage({results:[]},{provider_id:'KudaGo',max_items:100,approval_id:'t104-isolated'},null,ctx(r));assert.equal(p.coverage.all_pages_consumed,false);});
check('stale-source',()=>{const item=evidence.find(x=>x.task_id==='DG-10');const c=structuredClone(item.normalized_candidate);c.provenance.observed_at=new Date(Date.parse(c.provenance.observed_at)-3601000).toISOString();const r=read(item.receipt);const result=evaluate(c,r);assert.equal(result.checks.find(x=>x.field==='freshness').status,'UNKNOWN');assert.notEqual(result.status,'PASS');evidence.push({task_id:'STALE_SIMULATION',synthetic_mutation:'observed_at minus 3601 seconds on real candidate',response_hash:item.response_hash,eligibility:result});});
const errors={};for(const r of full.filter(x=>x.error))errors[r.error]=(errors[r.error]??0)+1;
const result={baseline_sha:gate.baseline_sha,api_version:'v1.4',probe_timestamp:new Date().toISOString(),verifier:'t104-baseline-normalizer-replay/1',normalizer_source:'modules/search/core/normalizers.ts',response_hashes:gate.response_hashes,full_record_summary:{events:full.length,normalized:full.filter(x=>x.status==='NORMALIZED').length,quarantined:full.filter(x=>x.status==='QUARANTINED').length,errors},full_records:full,reproducible_defects:defects,single_date_experiments:evidence,critical_false_pass:evidence.filter(x=>x.eligibility?.status==='PASS').length,conditional_required_NO_PASS_implemented:false,conditional_actual_baseline_result:'UNKNOWN / TEXT or full-record quarantine, not zero-cost PASS',test_failures:failures};
fs.writeFileSync(new URL('NORMALIZER_REPLAY.json',out),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({summary:result.full_record_summary,experiments:evidence.map(x=>({task:x.task_id,status:x.eligibility?.status??x.coverage})),failures},null,2));
assert.equal(failures.length,0,'Replay assertions failed');
