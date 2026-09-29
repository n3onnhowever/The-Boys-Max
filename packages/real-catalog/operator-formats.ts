import type {CuratedFile,CuratedRecord,CuratedSession} from './adapters.ts';
import {exactInstant} from '../domain/event.ts';

const columns=['identity','source_url','source_owner','reviewed_at','source_hash','rights_note','title','category','session_identity','starts_at','ends_at','venue_id','venue_name','address','price_text','fee_status','price_scope'];
function csvRows(input:string):string[][]{
 if(input.length>1024*1024)throw Error('CSV_BOUND_EXCEEDED');
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<input.length;i++){
  const ch=input[i]!;
  if(ch==='"'){if(quoted&&input[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){row.push(field);field='';}
  else if((ch==='\n'||ch==='\r'&&input[i+1]!=='\n')&&!quoted){row.push(field);field='';if(row.some(Boolean))rows.push(row);row=[];}
  else if(ch!=='\r'||quoted)field+=ch;
 }
 if(quoted)throw Error('CSV_QUOTE_UNCLOSED');
 row.push(field);if(row.some(Boolean))rows.push(row);
 return rows;
}
/** One row per verified session; repeated event identities must have identical event facts. */
export function parseCuratedCsv(input:string,asOf:string):CuratedFile{
 const rows=csvRows(input);if(rows.length<2||rows.length>101||columns.some((name,i)=>rows[0]?.[i]!==name)||rows[0]!.length!==columns.length)throw Error('CSV_HEADER_INVALID');
 const records=new Map<string,CuratedRecord>();
 for(const values of rows.slice(1)){
  if(values.length!==columns.length)throw Error('CSV_ROW_WIDTH');
  const r=Object.fromEntries(columns.map((key,i)=>[key,values[i]!])) as Record<string,string>;
  const identity=r.identity!,session:CuratedSession={identity:r.session_identity!,starts_at:r.starts_at!,ends_at:r.ends_at||null,venue_id:r.venue_id||null,venue_name:r.venue_name||null,address:r.address||null,price_text:r.price_text||null,fee_status:r.fee_status as CuratedSession['fee_status'],price_scope:r.price_scope as CuratedSession['price_scope']};
  const prior=records.get(identity);
  if(prior){for(const key of ['source_url','source_owner','reviewed_at','source_hash','rights_note','title','category'] as const)if(prior[key]!==r[key])throw Error('CSV_EVENT_FACT_CONFLICT');prior.sessions.push(session);}
  else records.set(identity,{identity,source_url:r.source_url!,source_owner:r.source_owner!,reviewed_at:r.reviewed_at!,source_hash:r.source_hash!,rights_note:r.rights_note!,title:r.title!,category:r.category as CuratedRecord['category'],sessions:[session]});
 }
 return {schema:'povod.curated-official/1',as_of:asOf,records:[...records.values()]};
}

function icsTime(value:string|undefined,key:string|undefined):string|null{
 if(!value||!key||!/TZID=Europe\/Moscow(?:;|$)/.test(key)||!/^20\d{6}T\d{4}(?:\d{2})?$/.test(value))return null;
 const seconds=value.length===15?value.slice(13,15):'00';
 const iso=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(9,11)}:${value.slice(11,13)}:${seconds}+03:00`;
 return exactInstant(iso,'Europe/Moscow')?iso:null;
}
/** Editorial ICS requires explicit X-POVOD provenance and never treats UID as a source URL. */
export function parseCuratedIcs(input:string,asOf:string):CuratedFile{
 if(input.length>1024*1024||!input.includes('BEGIN:VCALENDAR'))throw Error('ICS_INVALID');
 const lines=input.replace(/\r?\n[ \t]/g,'').split(/\r?\n/),records=new Map<string,CuratedRecord>();let event:Record<string,string>|null=null;
 for(const line of lines){
  if(line==='BEGIN:VEVENT'){event={};continue;}
  if(line==='END:VEVENT'){
   if(!event)throw Error('ICS_STRUCTURE');const e=event;event=null;if(e.STATUS==='CANCELLED')throw Error('ICS_CANCELLATION_REQUIRES_OPERATOR_RECONCILIATION');
   const startKey=Object.keys(e).find(k=>k.startsWith('DTSTART')),endKey=Object.keys(e).find(k=>k.startsWith('DTEND'));
   const start=icsTime(startKey?e[startKey]:undefined,startKey),end=endKey?icsTime(e[endKey],endKey):null;
   if(!start||endKey&&!end||!e.UID)throw Error('ICS_EXACT_TIME_REQUIRED');
   const identity=e['X-POVOD-IDENTITY']||e.UID,sessionIdentity=e['RECURRENCE-ID']?`${e.UID}:${e['RECURRENCE-ID']}`:e.UID;
   const session:CuratedSession={identity:sessionIdentity,starts_at:start,ends_at:end,venue_id:e['X-POVOD-VENUE-ID']||null,venue_name:e.LOCATION||null,address:e['X-POVOD-ADDRESS']||null,price_text:e['X-POVOD-PRICE']||null,fee_status:(e['X-POVOD-FEE-STATUS']||'UNKNOWN') as CuratedSession['fee_status'],price_scope:(e['X-POVOD-PRICE-SCOPE']||'OCCURRENCE') as CuratedSession['price_scope']};
   const source={identity,source_url:e['X-POVOD-SOURCE-URL']||'',source_owner:e['X-POVOD-SOURCE-OWNER']||'',reviewed_at:e['X-POVOD-REVIEWED-AT']||'',source_hash:e['X-POVOD-SOURCE-HASH']||'',rights_note:e['X-POVOD-RIGHTS-NOTE']||'',title:e.SUMMARY||'',category:(e['X-POVOD-CATEGORY']||'OTHER') as CuratedRecord['category']};
   const prior=records.get(identity);
   if(prior){for(const key of ['source_url','source_owner','reviewed_at','source_hash','rights_note','title','category'] as const)if(prior[key]!==source[key])throw Error('ICS_EVENT_FACT_CONFLICT');prior.sessions.push(session);}
   else records.set(identity,{...source,sessions:[session]});continue;
  }
  if(event){const colon=line.indexOf(':');if(colon>0)event[line.slice(0,colon)]=line.slice(colon+1);}
 }
 return {schema:'povod.curated-official/1',as_of:asOf,records:[...records.values()]};
}
