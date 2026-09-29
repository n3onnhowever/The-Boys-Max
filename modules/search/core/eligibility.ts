import {type Candidate,type Check,type Eligibility,type Rights,type SearchIntent,type SemanticContext,type Verdict,type Warning} from './types.ts';
import {copy,freeze,integer,minor,utc} from './guard.ts';
import {parseCandidate,parseRights} from './candidate.ts';
import {bounds,warning} from './price.ts';
import {validateIntent} from './search.ts';
import {intervals} from './time.ts';
export function rightsCheck(raw:Rights,operation:'display_facts'|'display_text'|'display_images'|'persist_minimal',now:string):Check {
 const r=parseRights(raw),field='rights.'+operation;
 if(r[operation]==='DENIED'||r.revoked_at!==null||r.ad_clearance==='BLOCKED')return {field,status:'FAIL',reason:'RIGHTS_DENIED'};
 if(r[operation]!=='ALLOWED'||r.ad_clearance!=='CLEARED'||!r.evidence_refs.length||utc(r.reviewed_at)>utc(now)||utc(r.review_due_at)<=utc(now))return {field,status:'UNKNOWN',reason:'RIGHTS_UNVERIFIED'};
 return {field,status:'PASS',reason:'RIGHTS_OPERATION_CLEARED'};
}
function budgetCheck(i:SearchIntent,c:Candidate):Check {
 const b=i.budget!,price=c.price,m=price.total_price,base={field:'budget'};
 if(b.max_minor==='0'&&price.fees_known&&m.knownness==='KNOWN'&&m.amount.kind==='FREE')return {...base,status:'PASS',reason:'CONFIRMED_FREE'};
 if(m.knownness==='UNKNOWN')return {...base,status:'UNKNOWN',reason:'PAYABLE_TOTAL_UNKNOWN'};
 if(m.basis==='UNKNOWN')return {...base,status:'UNKNOWN',reason:'PRICE_BASIS_UNKNOWN'};
 if(m.currency!==b.currency)return {...base,status:'UNKNOWN',reason:'CURRENCY_NOT_COMPARABLE'};
 let [lo,hi]=bounds(m)!,cap=minor(b.max_minor);
 const quotedSize=price.provenance.group_size_at_quote;
 if(m.basis==='GROUP_TOTAL'&&quotedSize!==null&&i.interested_count!==null&&quotedSize!==i.interested_count)return {...base,status:'UNKNOWN',reason:'GROUP_QUANTITY_MISMATCH'};
 if(m.basis!==b.basis){
  if(i.interested_count===null)return {...base,status:'UNKNOWN',reason:'BUDGET_QUANTITY_REQUIRED'};
  const n=BigInt(i.interested_count);
  if(m.basis==='PER_PERSON'){lo*=n;hi*=n;}
  else {if(quotedSize===null||quotedSize!==i.interested_count)return {...base,status:'UNKNOWN',reason:'GROUP_QUANTITY_UNSPECIFIED'};cap*=n;}
 }
 if(lo>cap)return {...base,status:'FAIL',reason:'BUDGET_EXCEEDED'};
 if(hi<=cap)return {...base,status:'PASS',reason:'BUDGET_WITHIN'};
 return {...base,status:'UNKNOWN',reason:'PRICE_RANGE_OVERLAPS_BUDGET'};
}
/** Sole final evaluator shared by AI/EVENTS/UI. No descriptions, LLM scores or network calls. */
export function evaluateEligibility(hard:unknown,raw:unknown,ctx:SemanticContext):Eligibility {
 const c=parseCandidate(raw),i=validateIntent(hard,ctx),checks:Check[]=[],warnings:Warning[]=[...copy(c.warnings),...copy(c.price.warnings)];
 const add=(field:string,status:Verdict,reason:string)=>checks.push({field,status,reason});
 integer(ctx.freshness_ttl_seconds,1,86400,'freshness_ttl_seconds');integer(ctx.inventory_ttl_seconds,1,3600,'inventory_ttl_seconds');
 const now=utc(ctx.now_utc),observed=utc(c.provenance.observed_at),age=now-observed;
 add('lifecycle',c.status==='CANCELLED'?'FAIL':c.status==='SCHEDULED'?'PASS':'UNKNOWN',c.status==='CANCELLED'?'EVENT_CANCELLED':c.status==='SCHEDULED'?'EVENT_SCHEDULED':c.status==='POSTPONED'?'EVENT_POSTPONED':'EVENT_STATUS_UNKNOWN');
 // W26-PC001: personal default is future discovery, not merely a fresh listing.
 // Ongoing entry is not inferred from an end time; no invented end for an already-started event.
 if(c.starts_at===null||c.time_precision!=='EXACT_OCCURRENCE')
  add('occurrence_lifecycle','UNKNOWN','OCCURRENCE_TIME_UNPROVEN');
 else if(c.ends_at!==null&&utc(c.ends_at)<=now)
  add('occurrence_lifecycle','FAIL','OCCURRENCE_ENDED');
 else if(utc(c.starts_at)>now)
  add('occurrence_lifecycle','PASS','OCCURRENCE_UPCOMING');
 else add('occurrence_lifecycle','UNKNOWN',c.ends_at===null?'START_PASSED_END_UNKNOWN':'ONGOING_ENTRY_UNVERIFIED');
 add('freshness',age<0||age>=ctx.freshness_ttl_seconds*1000?'UNKNOWN':'PASS',age<0?'FUTURE_OBSERVATION':age>=ctx.freshness_ttl_seconds*1000?'SOURCE_STALE':'SOURCE_FRESH');
 add('listing',c.listing_state==='PRESENT'?'PASS':'UNKNOWN',c.listing_state==='PRESENT'?'LISTING_OBSERVED':'LISTING_NOT_OBSERVED');
 add('provider_health',c.provider_health==='OK'?'PASS':'UNKNOWN',c.provider_health==='OK'?'PROVIDER_OK':'PROVIDER_UNREACHABLE_OR_UNKNOWN');
 add('provenance',(c.provenance.source_url!==null||c.ref.provider_id==='ManualProvider')&&Object.keys(c.provenance.field_sources).length>0?'PASS':'UNKNOWN',(c.provenance.source_url!==null||c.ref.provider_id==='ManualProvider')&&Object.keys(c.provenance.field_sources).length>0?'SOURCE_REFERENCED':'PROVENANCE_INCOMPLETE');
 checks.push(rightsCheck(c.rights,'display_facts',ctx.now_utc));
 if(i.city)add('city',c.city_id===null?'UNKNOWN':c.city_id===i.city.id?'PASS':'FAIL',c.city_id===null?'CITY_UNKNOWN':c.city_id===i.city.id?'CITY_MATCH':'CITY_MISMATCH');
 const cats=c.categories;
 if(i.excluded_categories.length){const excluded=cats.mapping_verified&&i.excluded_categories.some(x=>cats.known.includes(x));add('excluded_categories',excluded?'FAIL':cats.mapping_verified&&cats.complete?'PASS':'UNKNOWN',excluded?'EXCLUDED_CATEGORY':cats.mapping_verified&&cats.complete?'EXCLUSION_SATISFIED':'EXCLUSION_NOT_PROVEN');}
 if(i.included_categories.length){const included=cats.mapping_verified&&i.included_categories.some(x=>cats.known.includes(x));add('included_categories',included?'PASS':cats.mapping_verified&&cats.complete?'FAIL':'UNKNOWN',included?'CATEGORY_MATCH':cats.mapping_verified&&cats.complete?'INCLUDED_CATEGORY_MISSING':'INCLUSION_NOT_PROVEN');}
 const windows=intervals(i);
 if(windows.length){
  if(c.starts_at===null||c.time_precision!=='EXACT_OCCURRENCE')add('time','UNKNOWN',c.starts_at===null?'START_TIME_UNKNOWN':'OCCURRENCE_TIME_UNPROVEN');
  else {const start=utc(c.starts_at),end=c.ends_at===null?null:utc(c.ends_at),startWindows=windows.filter(w=>start>=w.start&&start<w.end);
   if(startWindows.some(w=>w.mode==='STARTS_WITHIN'||end!==null&&end<=w.end))add('time','PASS','TIME_MATCH');
   else if(startWindows.length&&end===null)add('time','UNKNOWN','END_TIME_UNKNOWN');
   else add('time','FAIL','OUTSIDE_TIME_WINDOW');}
 }
 if(i.interested_count!==null){add('interested_count','PASS','COUNT_CONTEXT_ONLY');if(i.inventory_requirement.kind==='NOT_REQUESTED'&&c.inventory.remaining===null)warnings.push(warning('INVENTORY_NOT_CHECKED','inventory','Число желающих не подтверждает наличие билетов.'));}
 if(i.inventory_requirement.kind==='AT_LEAST'){
  const stock=c.inventory,stockAge=stock.observed_at===null?null:now-utc(stock.observed_at);
  if(stock.remaining===null||stockAge===null)add('inventory_requirement','UNKNOWN','INVENTORY_UNKNOWN');
  else if(stockAge<0||stockAge>=ctx.inventory_ttl_seconds*1000)add('inventory_requirement','UNKNOWN','INVENTORY_STALE');
  else add('inventory_requirement',stock.remaining>=i.inventory_requirement.quantity?'PASS':'FAIL',stock.remaining>=i.inventory_requirement.quantity?'INVENTORY_OBSERVED_SUFFICIENT':'INSUFFICIENT_PLACES');
 }
 if(i.budget!==null)checks.push(budgetCheck(i,c));
 if(i.indoor!==null)add('indoor',c.indoor===null?'UNKNOWN':c.indoor===i.indoor?'PASS':'FAIL',c.indoor===null?'INDOOR_UNKNOWN':c.indoor===i.indoor?'INDOOR_MATCH':'INDOOR_MISMATCH');
 if(i.wheelchair_required===true)add('wheelchair_required',c.wheelchair_accessible===null?'UNKNOWN':c.wheelchair_accessible?'PASS':'FAIL',c.wheelchair_accessible===null?'ACCESSIBILITY_UNKNOWN':c.wheelchair_accessible?'ACCESSIBILITY_MATCH':'ACCESSIBILITY_MISMATCH');
 const status:Verdict=checks.some(x=>x.status==='FAIL')?'FAIL':checks.some(x=>x.status==='UNKNOWN')?'UNKNOWN':'PASS';
 const uniqueWarnings=warnings.filter((w,index)=>warnings.findIndex(x=>x.code===w.code&&x.field===w.field&&x.message===w.message)===index);
 return freeze({schema_version:'max.eligibility/3-candidate',policy_version:'eligibility-policy/3-candidate',status,checks,warnings:uniqueWarnings,evaluated_at:ctx.now_utc});
}
