import {type Binding,type Category,CATEGORIES,INTENT_FIELDS,type IntentField,type SearchDraft,type SearchIntent,type SearchScope,type SemanticContext,VERSION} from './types.ts';
import {arr,bool,copy,currency,en,fail,id,integer,keys,minor,nullableText,obj,stringArray,text,utc} from './guard.ts';
import {clock,dateEpoch,intervals,localDate,validZone} from './time.ts';
export function parseScope(value:unknown):SearchScope {
 const s=obj(value,'scope');const kind=en(s.kind,['PERSONAL','PLAN_PRIVATE'] as const);
 keys(s,kind==='PERSONAL'?['kind','search_context_id']:['kind','search_context_id','plan_id']);
 const search_context_id=id(s.search_context_id);return kind==='PERSONAL'?{kind,search_context_id}:{kind,search_context_id,plan_id:id(s.plan_id)};
}
export function parseBinding(value:unknown,scope:SearchScope):Binding {
 const b=obj(value,'binding');keys(b,['acl_revision','search_context_revision','plan']);
 const acl_revision=integer(b.acl_revision,0,2147483647),search_context_revision=integer(b.search_context_revision,0,2147483647);
 if(scope.kind==='PERSONAL'){if(b.plan!==null)fail('PERSONAL_BINDING_HAS_PLAN');return {acl_revision,search_context_revision,plan:null};}
 const p=obj(b.plan);keys(p,['config_revision','electorate_version','selection_revision','candidate_set_revision']);
 return {acl_revision,search_context_revision,plan:{config_revision:integer(p.config_revision,0,2147483647),electorate_version:integer(p.electorate_version,0,2147483647),selection_revision:integer(p.selection_revision,0,2147483647),candidate_set_revision:integer(p.candidate_set_revision,0,2147483647)}};
}
export function parseIntent(value:unknown):SearchIntent {
 const i=obj(value,'intent');keys(i,INTENT_FIELDS);let city:SearchIntent['city']=null,date:SearchIntent['date']=null,w:SearchIntent['time_window']=null,budget:SearchIntent['budget']=null;
 if(i.city!==null){const c=obj(i.city);keys(c,['id','label']);city={id:id(c.id),label:text(c.label,'city.label',100)};}
 if(i.date!==null){const d=obj(i.date);const kind=en(d.kind,['EXACT','RANGE'] as const);keys(d,kind==='EXACT'?['kind','on']:['kind','from','through']);
  date=kind==='EXACT'?{kind,on:text(d.on,'date',10)}:{kind,from:text(d.from,'date',10),through:text(d.through,'date',10)};}
 const timezone=nullableText(i.timezone,'timezone',80);
 if(i.time_window!==null){const t=obj(i.time_window);keys(t,['start','end','end_day_offset','mode']);
  w={start:text(t.start,'time_window.start',5),end:text(t.end,'time_window.end',5),end_day_offset:integer(t.end_day_offset,0,1) as 0|1,mode:en(t.mode,['STARTS_WITHIN','FULLY_WITHIN','UNKNOWN'] as const)};}
 const categories=(v:unknown):Category[]=>stringArray(v,'categories',8).map(x=>en(x,CATEGORIES));
 const interested_count=i.interested_count===null?null:integer(i.interested_count,1,1000,'interested_count');
 const inv=obj(i.inventory_requirement);const k=en(inv.kind,['NOT_REQUESTED','AT_LEAST'] as const);keys(inv,k==='NOT_REQUESTED'?['kind']:['kind','quantity']);
 const inventory_requirement:SearchIntent['inventory_requirement']=k==='NOT_REQUESTED'?{kind:k}:{kind:k,quantity:integer(inv.quantity,1,1000,'quantity')};
 if(i.budget!==null){const b=obj(i.budget);keys(b,['max_minor','currency','basis']);minor(b.max_minor);const cur=currency(b.currency);if(cur===null)fail('BUDGET_CURRENCY_REQUIRED','budget');budget={max_minor:b.max_minor as string,currency:cur,basis:en(b.basis,['PER_PERSON','GROUP_TOTAL'] as const)};}
 return {city,date,timezone,time_window:w,included_categories:categories(i.included_categories),excluded_categories:categories(i.excluded_categories),interested_count,inventory_requirement,budget,
  indoor:i.indoor===null?null:bool(i.indoor,'indoor'),wheelchair_required:i.wheelchair_required===null?null:bool(i.wheelchair_required,'wheelchair_required')};
}
export function validateIntent(raw:unknown,ctx:SemanticContext):SearchIntent {
 const i=parseIntent(raw);utc(ctx.now_utc);integer(ctx.max_future_days,1,366,'max_future_days');
 if(i.timezone!==null&&!validZone(i.timezone))fail('INVALID_TIMEZONE','timezone');
 if(i.city!==null){const c=ctx.cities.get(i.city.id);if(!c||c.label!==i.city.label)fail('CITY_NEEDS_RESOLUTION','city');if(!i.timezone||!c.timezones.includes(i.timezone))fail('CITY_TIMEZONE_CLARIFY','timezone');}
 if(i.time_window!==null){clock(i.time_window.start);clock(i.time_window.end);if(i.date===null)fail('DATE_REQUIRED_FOR_WINDOW','date');if(i.time_window.mode==='UNKNOWN')fail('WINDOW_MODE_REQUIRED','time_window');}
 if(i.date!==null){if(!i.timezone)fail('TIMEZONE_REQUIRED','timezone');const from=i.date.kind==='EXACT'?i.date.on:i.date.from,through=i.date.kind==='EXACT'?i.date.on:i.date.through;
  const f=dateEpoch(from),t=dateEpoch(through),today=dateEpoch(localDate(ctx.now_utc,i.timezone));
  if(f<today||t>today+ctx.max_future_days*86400000)fail('DATE_HORIZON','date');if(t<f||t-f>30*86400000)fail('DATE_RANGE_BOUND','date');}
 if(i.included_categories.some(c=>i.excluded_categories.includes(c)))fail('CATEGORY_CONFLICT','included_categories');
 if(i.budget?.currency!=='RUB'&&i.budget!==null)fail('BUDGET_CURRENCY_UNSUPPORTED','budget');
 intervals(i);return i;
}
export function activeField(i:SearchIntent,f:IntentField):boolean {
 if(f==='inventory_requirement')return i.inventory_requirement.kind==='AT_LEAST';
 const x=i[f];return x!==null&&(!Array.isArray(x)||x.length>0);
}
export function parseDraft(raw:unknown,ctx:SemanticContext):SearchDraft {
 const d=obj(raw,'draft');keys(d,['schema_version','state','intent','coverage','issues']);if(d.schema_version!==VERSION)fail('SEARCH_WIRE_VERSION_REQUIRED');
 const state=en(d.state,['DRAFT','NEEDS_CLARIFICATION','REFUSED'] as const),intent=validateIntent(d.intent,ctx),c=obj(d.coverage);keys(c,INTENT_FIELDS);
 const coverage={} as SearchDraft['coverage'];for(const f of INTENT_FIELDS)coverage[f]=en(c[f],['SET','NOT_MENTIONED','CLARIFY','UNSUPPORTED'] as const);
 const issues=arr(d.issues,'issues',11).map(v=>{const x=obj(v);keys(x,['field','code','question']);return {field:en(x.field,INTENT_FIELDS),code:id(x.code),question:text(x.question,'question',500)};});
 if(new Set(issues.map(x=>x.field)).size!==issues.length)fail('DUPLICATE_ISSUE');
 for(const f of INTENT_FIELDS){const disposition=coverage[f],has=activeField(intent,f),issue=issues.find(x=>x.field===f);
  if((disposition==='SET'&&!has)||(disposition==='NOT_MENTIONED'&&has))fail('COVERAGE_VALUE_CONFLICT',f);
  if(['CLARIFY','UNSUPPORTED'].includes(disposition)&&!issue)fail('QUESTION_REQUIRED',f);
  if(issue&&!['CLARIFY','UNSUPPORTED'].includes(disposition))fail('ISSUE_STATE_CONFLICT',f);
 }
 if(state!=='DRAFT'||issues.length)fail('NEEDS_CLARIFICATION','draft');
 return {schema_version:VERSION,state,intent,coverage,issues};
}
/** Migration produces an unapproved draft. Old party_size no longer implies inventory. */
export function migrateAiV2Draft(raw:unknown):SearchDraft {
 const d=obj(raw);keys(d,['version','state','intent','coverage','issues']);if(d.version!=='search-intent/2')fail('LEGACY_SEARCH_VERSION_REQUIRED');
 const i=obj(d.intent),oldFields=INTENT_FIELDS.filter(f=>f!=='interested_count'&&f!=='inventory_requirement').concat([]) as string[];oldFields.push('party_size');keys(i,oldFields);
 const intent=parseIntent({...Object.fromEntries(Object.entries(i).filter(([k])=>k!=='party_size')),interested_count:i.party_size,inventory_requirement:{kind:'NOT_REQUESTED'}});
 const c=obj(d.coverage);keys(c,oldFields);const coverage={} as SearchDraft['coverage'];
 for(const f of INTENT_FIELDS)coverage[f]=f==='inventory_requirement'?'NOT_MENTIONED':en(c[f==='interested_count'?'party_size':f],['SET','NOT_MENTIONED','CLARIFY','UNSUPPORTED'] as const);
 const issues=arr(d.issues).map(v=>{const x=obj(v);keys(x,['field','code','question']);const f=text(x.field);return {field:en(f==='party_size'?'interested_count':f,INTENT_FIELDS),code:id(x.code),question:text(x.question)};});
 return {schema_version:VERSION,state:en(d.state,['DRAFT','NEEDS_CLARIFICATION','REFUSED'] as const),intent,coverage,issues};
}
export function draftForManualConfirmation(intent:SearchIntent):SearchDraft {
 return {schema_version:VERSION,state:'DRAFT',intent:copy(intent),coverage:Object.fromEntries(INTENT_FIELDS.map(f=>[f,activeField(intent,f)?'SET':'NOT_MENTIONED'])) as SearchDraft['coverage'],issues:[]};
}
