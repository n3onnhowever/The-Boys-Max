import schema from './candidate.schema.json' with {type:'json'};
import type {Candidate, Field, ParseContext, SearchIntent, Validation} from './types.ts';
export {schema};
export const FIELDS = Object.keys(schema.properties.intent.properties) as Field[];
const forbiddenKeys = new Set(['__proto__','prototype','constructor']);
function fail(code:string):never {throw new Error(code);}
/** Strict JSON parser preflight: rejects duplicate/escaped-duplicate keys and prototype pollution.
 * It never repairs markdown, extracts substrings, or coerces values into enum strings. */
export function strictJson(text:string,maxBytes=65536):unknown {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>maxBytes) fail('JSON_SIZE');
  let i=0;
  const ws=()=>{while(i<text.length&&/\s/.test(text[i]!))i++;};
  const str=():string=>{
    const start=i;if(text[i++]!=='"')fail('JSON_STRING');
    while(i<text.length){const ch=text[i++];if(ch==='"')return JSON.parse(text.slice(start,i)) as string;
      if(ch==='\\'){if(i>=text.length)fail('JSON_ESCAPE');i++;}}
    return fail('JSON_UNTERMINATED');
  };
  const value=(depth:number):void=>{
    if(depth>64)fail('JSON_DEPTH');ws();const c=text[i];
    if(c==='{') {i++;ws();const seen=new Set<string>();if(text[i]==='}'){i++;return;}
      while(i<text.length){ws();const key=str();if(seen.has(key))fail('JSON_DUPLICATE_KEY');
        if(forbiddenKeys.has(key))fail('JSON_FORBIDDEN_KEY');seen.add(key);ws();if(text[i++]!==':')fail('JSON_COLON');
        value(depth+1);ws();const stop=text[i++];if(stop==='}')return;if(stop!==',')fail('JSON_OBJECT');}
      fail('JSON_UNTERMINATED');
    } else if(c==='['){i++;ws();if(text[i]===']'){i++;return;}while(i<text.length){value(depth+1);ws();const stop=text[i++];if(stop===']')return;if(stop!==',')fail('JSON_ARRAY');}fail('JSON_UNTERMINATED');
    } else if(c==='"'){str();}
    else {const m=text.slice(i).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/);if(!m)fail('JSON_VALUE');i+=m[0].length;}
  };
  value(0);ws();if(i!==text.length)fail('JSON_TRAILING');return JSON.parse(text);
}
export function equal(a:unknown,b:unknown):boolean {
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((x,i)=>equal(x,b[i]));
  const x=a as Record<string,unknown>, y=b as Record<string,unknown>;const keys=Object.keys(x);
  return keys.length===Object.keys(y).length&&keys.every(k=>Object.hasOwn(y,k)&&equal(x[k],y[k]));
}
/** Deliberately limited to the keywords in candidate.schema.json, not a general JSON Schema engine.
 * Tested against Python jsonschema on generated positive/negative vectors. */
export function schemaErrors(s:unknown,v:unknown,path='$'):string[] {
  const q=s as Record<string,unknown>;const errors:string[]=[];
  if(q.anyOf){const alternatives=q.anyOf as unknown[];if(!alternatives.some(a=>schemaErrors(a,v,path).length===0))errors.push(path+':anyOf');return errors;}
  if(Object.hasOwn(q,'const')&&!equal(q.const,v))errors.push(path+':const');
  if(q.enum&&!(q.enum as unknown[]).some(x=>equal(x,v)))errors.push(path+':enum');
  const t=q.type;
  const matches=t===undefined||(t==='null'?v===null:t==='object'?typeof v==='object'&&v!==null&&!Array.isArray(v):t==='array'?Array.isArray(v):t==='integer'?typeof v==='number'&&Number.isSafeInteger(v):t==='number'?typeof v==='number'&&Number.isFinite(v):typeof v===t);
  if(!matches)return [...errors,path+':type'];
  if(t==='string') {const x=v as string;
    if(q.pattern&&!new RegExp(q.pattern as string).test(x))errors.push(path+':pattern');
    const len=Array.from(x).length;
    if(q.minLength!==undefined&&len<(q.minLength as number))errors.push(path+':minLength');
    if(q.maxLength!==undefined&&len>(q.maxLength as number))errors.push(path+':maxLength');
  }
  if(t==='integer'||t==='number'){
    if(q.minimum!==undefined&&(v as number)<(q.minimum as number))errors.push(path+':minimum');
    if(q.maximum!==undefined&&(v as number)>(q.maximum as number))errors.push(path+':maximum');
  }
  if(t==='array') {const a=v as unknown[];
    if(q.maxItems!==undefined&&a.length>(q.maxItems as number))errors.push(path+':maxItems');
    if(q.uniqueItems&&a.some((x,i)=>a.slice(0,i).some(y=>equal(x,y))))errors.push(path+':uniqueItems');
    a.forEach((x,i)=>errors.push(...schemaErrors(q.items,x,`${path}[${i}]`)));
  }
  if(t==='object') {const o=v as Record<string,unknown>,p=q.properties as Record<string,unknown>;
    for(const key of q.required as string[])if(!Object.hasOwn(o,key))errors.push(path+'.'+key+':required');
    for(const key of Object.keys(o)){if(!Object.hasOwn(p,key)){if(q.additionalProperties===false)errors.push(path+':additionalProperties');}
      else errors.push(...schemaErrors(p[key],o[key],path+'.'+key));}
  }
  return errors;
}
export function validDate(x:string):boolean {
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(x))return false;
  const date=new Date(x+'T00:00:00.000Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===x;
}
export function validZone(x:string):boolean {try {new Intl.DateTimeFormat('en-GB',{timeZone:x}).format();return true;}catch{return false;}}
/** Count possible instants for an explicit local minute, using this runtime's IANA/ICU data.
 * Does not rank or evaluate event times. DST ambiguity is returned, never silently normalized. */
export function wallTimeCount(day:string,time:string,zone:string):number {
  const wall=new Date(day+'T'+time+':00Z').getTime();
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const parts=(instant:number)=>{const p=Object.fromEntries(fmt.formatToParts(new Date(instant)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;};
  const offsets=new Set<number>();
  for(let h=-36;h<=36;h+=3){const t=wall+h*3600000;offsets.add(new Date(parts(t)+'Z').getTime()-t);}
  return [...offsets].filter(offset=>parts(wall-offset)===day+'T'+time+':00').length;
}
export function validateCandidate(value:unknown,context?:ParseContext):Validation {
  const errors=schemaErrors(schema,value);if(errors.length)return {schema_ok:false,semantic_ok:null,errors};
  const c=value as Candidate,x=c.intent;
  const err=(code:string)=>errors.push(code);
  const hasIssue=(field:Field|'request')=>c.issues.some(i=>i.field===field);
  const needs=(field:Field,code:string)=>{if(c.state==='DRAFT'||!hasIssue(field))err(code);};
  for(const field of FIELDS){const empty=x[field]===null||(Array.isArray(x[field])&&(x[field] as unknown[]).length===0);
    if(c.coverage[field]==='NOT_MENTIONED'&&!empty)err('COVERAGE_NOT_MENTIONED:'+field);
    if(c.coverage[field]==='SET'&&empty)err('COVERAGE_SET_EMPTY:'+field);
    if(['CLARIFY','UNSUPPORTED'].includes(c.coverage[field])&&!hasIssue(field))err('COVERAGE_ISSUE_MISSING:'+field);
    if(c.state==='DRAFT'&&['CLARIFY','UNSUPPORTED'].includes(c.coverage[field]))err('DRAFT_UNRESOLVED:'+field);
  }
  if(c.state==='DRAFT'&&c.issues.length)err('DRAFT_HAS_ISSUES');
  if(c.state!=='DRAFT'&&!c.issues.length)err('STATE_REQUIRES_ISSUE');
  if(c.state!=='DRAFT'&&c.read_tool!==null)err('UNRESOLVED_TOOL');
  if(x.city&&context&&!context.cities.some(a=>a.id===x.city!.id&&a.label===x.city!.label))err('CITY_NOT_IN_SERVER_DICTIONARY');
  if(x.timezone&&!validZone(x.timezone))err('INVALID_TIMEZONE');
  if(x.city&&x.timezone&&context){const city=context.cities.find(a=>a.id===x.city!.id);if(city&&city.timezone!==x.timezone)needs('timezone','CITY_ZONE_MISMATCH');}
  if(x.included_categories.some(a=>x.excluded_categories.includes(a)))needs('included_categories','CATEGORY_CONFLICT');
  if(x.budget){if(x.budget.basis==='UNKNOWN')needs('budget','BASIS_UNKNOWN');
    if(x.budget.currency!=='RUB')needs('budget','CURRENCY_UNSUPPORTED');
    if(x.budget.basis==='GROUP_TOTAL'&&x.party_size===null)needs('party_size','GROUP_SIZE_MISSING');}
  if(x.date){const ds=x.date.kind==='EXACT'?[x.date.on]:[x.date.from,x.date.through];
    if(ds.some(d=>!validDate(d)))err('INVALID_CALENDAR_DATE');
    else if(ds.length===2&&ds[0]!>ds[1]!)err('DATE_RANGE_ORDER');
  }
  if(x.time_window){const w=x.time_window;
    if(!x.date)needs('date','WINDOW_DATE_MISSING');
    if(!x.timezone)needs('timezone','WINDOW_ZONE_MISSING');
    if(w.mode==='UNKNOWN')needs('time_window','WINDOW_MODE_UNKNOWN');
    if(w.end_day_offset===0&&w.start>=w.end)needs('time_window','WINDOW_ORDER');
    if(x.date&&x.timezone&&validZone(x.timezone)){
      const start=x.date.kind==='EXACT'?x.date.on:x.date.from,end=x.date.kind==='EXACT'?x.date.on:x.date.through;
      if(validDate(start)&&validDate(end)&&start<=end){
        const days=(new Date(end+'T00:00Z').getTime()-new Date(start+'T00:00Z').getTime())/86400000;
        // Candidate contract is bounded to a year. Larger ranges require explicit downstream support.
        if(days>365)needs('date','DATE_RANGE_UNSUPPORTED');
        else for(let n=0;n<=days;n++){
          const day=new Date(new Date(start+'T00:00Z').getTime()+n*86400000).toISOString().slice(0,10);
          const endDay=new Date(new Date(day+'T00:00Z').getTime()+w.end_day_offset*86400000).toISOString().slice(0,10);
          if(wallTimeCount(day,w.start,x.timezone)!==1||wallTimeCount(endDay,w.end,x.timezone)!==1){needs('time_window','DST_UNRESOLVED');break;}
        }
      }
    }
  }
  if(context?.locked_intent){for(const [field,expected] of Object.entries(context.locked_intent)){
    if(!FIELDS.includes(field as Field)||!equal(x[field as Field],expected))err('HARD_CONSTRAINT_CHANGED:'+field);
  }}
  return errors.length?{schema_ok:true,semantic_ok:false,errors}:{schema_ok:true,semantic_ok:true,errors:[],candidate:c};
}
export function emptyIntent():SearchIntent {return {city:null,date:null,time_window:null,timezone:null,excluded_categories:[],included_categories:[],party_size:null,budget:null,indoor:null,wheelchair_required:null,require_available:null};}
/** A normal form can directly supply typed filters. No fallback LLM and no source-price evaluator. */
export function manualCandidate(intent:unknown,context?:ParseContext):Validation {
  const x=intent as SearchIntent;
  if(!x||typeof x!=='object'||Array.isArray(x))return {schema_ok:false,semantic_ok:null,errors:['FORM_TYPE']};
  const coverage=Object.fromEntries(FIELDS.map(f=>[f,x[f]===null||(Array.isArray(x[f])&&(x[f] as unknown[]).length===0)?'NOT_MENTIONED':'SET']));
  return validateCandidate({version:'ai-candidate/3',state:'DRAFT',intent:x,coverage,issues:[],read_tool:null},context);
}
