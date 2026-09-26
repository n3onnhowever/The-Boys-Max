import {hash,exactInstant,plainText,safeSourceUrl,type SourcePrice,type SourceRecord,type SourceSession} from '../domain/event.ts';
import {kudagoPrice} from '../../modules/search/core/kudago-t105.ts';

export type Admission='ACCEPT'|'QUARANTINE';
export type Staged<T>={status:Admission;reason:string|null;record:T|null};
export type KudaGoManualAdmission={provider_event_id:string;source_url:string;response_sha256:string;reviewed_at:string;page_review_sha256:string;rights_note:string;factual_display_approved:true};
const unknownPrice=(raw:string|null=null):SourcePrice=>({kind:'UNKNOWN',currency:null,basis:'UNKNOWN',evidenceScope:'UNKNOWN',scopeAppliesToOccurrence:null,quoteMinMinor:null,quoteMaxMinor:null,feeMode:'UNKNOWN',explicitFree:null,mandatoryExtras:[],conditions:[],rawPriceText:raw,evidencePaths:raw?['price']:[],feeEvidencePaths:[],freeEvidencePath:null,parsedConfidence:'UNKNOWN'});
const unknownPlace=()=>({kind:'UNKNOWN' as const,format:'UNKNOWN' as const,providerVenueId:null,venueName:null,address:null,coordinates:null,coordinateMeaning:'UNKNOWN' as const,evidencePaths:[]});
const object=(v:unknown):Record<string,unknown>|null=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const id=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?String(v):plainText(v,256);
const epoch=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=946684800&&v<4102444800?new Date(v*1000).toISOString():null;

/** Absence of a marker is UNKNOWN, never proof of advertising clearance. */
export function classifyKudaGoAdvertising(raw:unknown,receipt?:KudaGoManualAdmission,responseSha256?:string):Staged<unknown>{
 const r=object(raw);
 if(!r)return {status:'QUARANTINE',reason:'RECORD_SHAPE',record:null};
 const serialized=JSON.stringify(r);if(serialized.length>4*1024*1024)return {status:'QUARANTINE',reason:'RECORD_BYTES_EXCEEDED',record:null};
 const evidence=JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>/^(ad|ads|advert|advertising|erid|reklama|is_ad|is_advertising)$/i.test(k))));
 if(/(?:true|erid|реклама|advert)/iu.test(evidence)||/"(?:erid|is_ad|is_advertising|reklama)"\s*:/iu.test(serialized)||/\bреклама\b/iu.test(serialized))return {status:'QUARANTINE',reason:'EXPLICIT_AD_EVIDENCE',record:null};
 if(receipt){
  const recordId=id(r.id),sourceUrl=safeSourceUrl(r.site_url,['kudago.com','www.kudago.com']);
  if(recordId===receipt.provider_event_id&&sourceUrl===receipt.source_url&&responseSha256===receipt.response_sha256&&
   /^[a-f0-9]{64}$/.test(receipt.response_sha256)&&/^[a-f0-9]{64}$/.test(receipt.page_review_sha256)&&
   exactInstant(receipt.reviewed_at,'UTC')!==null&&plainText(receipt.rights_note,500)&&receipt.factual_display_approved===true)
   return {status:'ACCEPT',reason:null,record:raw};
  return {status:'QUARANTINE',reason:'ADMISSION_MANIFEST_MISMATCH',record:null};
 }
 return {status:'QUARANTINE',reason:'AD_STATUS_UNPROVEN',record:null};
}

export type CuratedSession={identity:string;starts_at:string;ends_at:string|null;venue_id:string|null;venue_name:string|null;address:string|null;price_text:string|null;fee_status:'UNKNOWN'|'NONE'|'INCLUDED';price_scope:'EVENT'|'OCCURRENCE';};
export type CuratedRecord={identity:string;source_url:string;source_owner:string;reviewed_at:string;source_hash:string;rights_note:string;title:string;category:'CINEMA'|'THEATRE'|'CONCERT'|'MUSEUM'|'SPORT'|'OUTDOOR'|'OTHER';sessions:CuratedSession[];};
export type CuratedFile={schema:'povod.curated-official/1';as_of:string;records:CuratedRecord[]};
const minor=(v:string)=>(BigInt(v)*100n).toString();
export function factualPrice(raw:string|null,scope:'EVENT'|'OCCURRENCE',feeStatus:'UNKNOWN'|'NONE'|'INCLUDED'):SourcePrice{
 const p=unknownPrice(raw);
 if(raw===null)return p;
 const t=raw.trim();
 let kind:SourcePrice['kind']='UNKNOWN',lo:string|null=null,hi:string|null=null,free=false;
 let m:RegExpExecArray|null;
 if((m=/^от\s+([1-9]\d{0,8})\s*(?:руб\.?|рублей|₽)$/iu.exec(t))){kind='FROM';lo=minor(m[1]!);}
 else if((m=/^([1-9]\d{0,8})\s*[–—-]\s*([1-9]\d{0,8})\s*(?:руб\.?|рублей|₽)$/iu.exec(t))&&BigInt(m[2]!)>BigInt(m[1]!)){kind='RANGE';lo=minor(m[1]!);hi=minor(m[2]!);}
 else if((m=/^([1-9]\d{0,8})\s*(?:руб\.?|рублей|₽)$/iu.exec(t))){kind='KNOWN';lo=hi=minor(m[1]!);}
 else if(/^(бесплатно|вход свободный)$/iu.test(t)){kind='FREE';lo=hi='0';free=true;}
 const feesKnown=feeStatus!=='UNKNOWN';
 return {...p,kind,currency:kind==='UNKNOWN'?null:'RUB',basis:kind==='UNKNOWN'?'UNKNOWN':'PER_PERSON',evidenceScope:scope,scopeAppliesToOccurrence:scope==='OCCURRENCE',quoteMinMinor:lo,quoteMaxMinor:hi,feeMode:feeStatus,explicitFree:free?true:null,rawPriceText:t,evidencePaths:['price_text'],feeEvidencePaths:feesKnown?['fee_status']:[],freeEvidencePath:free?'price_text':null,parsedConfidence:kind==='UNKNOWN'?'UNKNOWN':'HIGH'};
}
export function curatedOfficialImport(file:unknown,allowedHosts:readonly string[]):{accepted:SourceRecord[];quarantined:{index:number;reason:string}[]}{
 const f=object(file);if(f?.schema!=='povod.curated-official/1'||typeof f.as_of!=='string'||exactInstant(f.as_of,'UTC')===null||!f.as_of.endsWith('Z')||!Array.isArray(f.records)||f.records.length>100)throw Error('CURATED_FILE_INVALID');
 const accepted:SourceRecord[]=[],quarantined:{index:number;reason:string}[]=[],seen=new Set<string>();
 for(const [index,value] of f.records.entries()){
  try{
   const r=object(value);if(!r)throw Error('RECORD_SHAPE');
   const identity=plainText(r.identity,128),url=safeSourceUrl(r.source_url,allowedHosts),owner=plainText(r.source_owner,200),rights=plainText(r.rights_note,500);
   const title=plainText(r.title,300),reviewed=exactInstant(r.reviewed_at,'UTC');
   if(!identity||!url||!url.startsWith('https://')||!owner||!rights||!title||!reviewed||!/^[a-f0-9]{64}$/.test(String(r.source_hash)))throw Error('EVIDENCE_INVALID');
   if(seen.has(identity))throw Error('DUPLICATE_IDENTITY');seen.add(identity);
   if(!['CINEMA','THEATRE','CONCERT','MUSEUM','SPORT','OUTDOOR','OTHER'].includes(String(r.category)))throw Error('CATEGORY_INVALID');
   if(!Array.isArray(r.sessions)||r.sessions.length>100)throw Error('SESSIONS_INVALID');
   const sessions:SourceSession[]=r.sessions.map((entry:unknown,j:number)=>{
    const s=object(entry);if(!s)throw Error('SESSION_SHAPE');
    const sid=plainText(s.identity,128),start=exactInstant(s.starts_at,'Europe/Moscow'),end=s.ends_at===null?null:exactInstant(s.ends_at,'Europe/Moscow');
    if(!sid||!start||Date.parse(start)<Date.parse(String(f.as_of))||s.ends_at!==null&&(!end||Date.parse(end)<=Date.parse(start)))throw Error('SESSION_TIME_INVALID');
    if(!['EVENT','OCCURRENCE'].includes(String(s.price_scope))||!['UNKNOWN','NONE','INCLUDED'].includes(String(s.fee_status)))throw Error('PRICE_EVIDENCE_INVALID');
    const venueId=s.venue_id===null?null:plainText(s.venue_id,128),venueName=s.venue_name===null?null:plainText(s.venue_name,300),address=s.address===null?null:plainText(s.address,500);
    if((s.venue_id!==null&&!venueId)||(s.venue_name!==null&&!venueName)||(s.address!==null&&!address))throw Error('PLACE_INVALID');
    const raw=s.price_text===null?null:plainText(s.price_text,300);if(s.price_text!==null&&!raw)throw Error('PRICE_TEXT_INVALID');
    return {path:`sessions[${j}]`,precision:'EXACT',startsAt:start,endsAt:end,timeZone:'Europe/Moscow',nativeSessionId:sid,nativeIdVerified:true,
     place:{kind:venueId||venueName?'VENUE':address?'PARTIAL_ADDRESS':'UNKNOWN',format:'OFFLINE',providerVenueId:venueId,venueName,address,coordinates:null,coordinateMeaning:'UNKNOWN',evidencePaths:venueName||address?['venue_name','address']:[]},
     price:factualPrice(raw,s.price_scope as 'EVENT'|'OCCURRENCE',s.fee_status as 'UNKNOWN'|'NONE'|'INCLUDED'),timePaths:[`sessions[${j}].starts_at`],timeEvidence:{sourceHash:String(r.source_hash).slice(0,64)},unsupportedReason:null};
   });
   if(new Set(sessions.map(s=>s.nativeSessionId)).size!==sessions.length)throw Error('DUPLICATE_SESSION');
   accepted.push({sourceId:'real:curated-official:v1',providerId:'ManualProvider',dataMode:'LIVE',providerEventId:identity,requestId:`curated-v1:${identity}`,recordOrdinal:index,
    fetchedAt:reviewed,sourceUrl:url,responseSha256:String(r.source_hash),apiVersion:'curated/1',transformVersion:'curated-official/1',rightsRevision:'factual-primary/v1',
    title,categories:[String(r.category)],categoriesComplete:true,categoryMappingVerified:true,price:unknownPrice(),sessions,lifecycle:'SCHEDULED'});
  }catch(error){quarantined.push({index,reason:String((error as Error).message)});}
 }
 return {accepted,quarantined};
}

/** A registry range stays a source fact, with no fabricated daily Occurrences. */
export function moscowSportCalendarAdapter(row:{registry_id:string;title:string;sport:string;venue:string|null;starts_on:string;ends_on:string;organizer:string;source_url:string;document_hash:string},reviewedAt:string):SourceRecord{
 if(!/^\d{1,10}$/.test(row.registry_id)||!/^2026-\d\d-\d\d$/.test(row.starts_on)||!/^2026-\d\d-\d\d$/.test(row.ends_on)||Date.parse(row.ends_on)<Date.parse(row.starts_on)||!safeSourceUrl(row.source_url,['www.mos.ru','mos.ru']))throw Error('SPORT_EVIDENCE_INVALID');
 if(!plainText(row.title,300)||!plainText(row.sport,200)||!plainText(row.organizer,300)||!/^[a-f0-9]{64}$/i.test(row.document_hash))throw Error('SPORT_FIELDS_INVALID');
 return {sourceId:'real:moscow-sport-ekp:2026',providerId:'ManualProvider',dataMode:'LIVE',providerEventId:row.registry_id,requestId:`ekp-2026:${row.document_hash.slice(0,12)}`,recordOrdinal:0,fetchedAt:reviewedAt,sourceUrl:row.source_url,responseSha256:row.document_hash.toLowerCase(),apiVersion:'EKP/2026',transformVersion:'moscow-sport-range/1',rightsRevision:'official-facts/v1',title:row.title,categories:['SPORT'],categoriesComplete:true,categoryMappingVerified:true,price:unknownPrice(),sessions:[],lifecycle:'UNKNOWN'};
}

/** Preserve showing ID. The movie page is the nearest source when there is no showing URL. */
export function kudagoMovieShowingAdapter(raw:unknown,movie:unknown,ctx:{fetchedAt:string;responseSha256:string;requestId:string}):SourceRecord{
 const r=object(raw),m=object(movie),p=object(r?.place),movieId=id(m?.id),showingId=id(r?.id),start=epoch(r?.datetime);
 const url=safeSourceUrl(m?.site_url,['kudago.com','www.kudago.com']);
 if(!r||!m||!movieId||!showingId||!start||!url||!plainText(m.title,300))throw Error('MOVIE_SHOWING_EVIDENCE_INVALID');
 const rawPrice=typeof r.price==='string'?r.price:null;
 const parsed=kudagoPrice(rawPrice,null);
 const range=/^([1-9]\d{0,8})\s*[–—-]\s*([1-9]\d{0,8})\s*(?:руб\.?|рублей|₽)$/iu.exec(rawPrice??'');
 const price:SourcePrice=range?{...parsed,kind:'RANGE',currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,quoteMinMinor:minor(range[1]!),quoteMaxMinor:minor(range[2]!),evidencePaths:['price'],parsedConfidence:'HIGH'}:
  {...parsed,evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,basis:parsed.kind==='UNKNOWN'?'UNKNOWN':'PER_PERSON'};
 return {sourceId:'real:kudago-movies-reviewed:v1',providerId:'KudaGo',dataMode:'LIVE',providerEventId:movieId,requestId:ctx.requestId,recordOrdinal:0,fetchedAt:ctx.fetchedAt,sourceUrl:url,responseSha256:ctx.responseSha256,apiVersion:'1.4',transformVersion:'kudago-movie-showing/1',rightsRevision:'kudago-open-reviewed/v1',title:String(m.title),categories:['CINEMA'],categoriesComplete:true,categoryMappingVerified:true,price:unknownPrice(),sessions:[{path:'showing',precision:'EXACT',startsAt:start,endsAt:null,timeZone:'Europe/Moscow',nativeSessionId:showingId,nativeIdVerified:true,
  place:{kind:p?.id||p?.title?'VENUE':'UNKNOWN',format:'OFFLINE',providerVenueId:id(p?.id),venueName:typeof p?.title==='string'?p.title:null,address:typeof p?.address==='string'?p.address:null,coordinates:null,coordinateMeaning:'UNKNOWN',evidencePaths:p?['place.id','place.title','place.address']:[]},
  price,timePaths:['datetime'],timeEvidence:{showingId,sourceGranularity:'MOVIE_PAGE'},unsupportedReason:null}],lifecycle:'UNKNOWN'};
}

/** Minimal bounded RSS extraction; publication time is intentionally never a session. */
export function officialRssAdapter(xml:string,feedUrl:string){
 if(xml.length>1024*1024||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('RSS_BOUND_OR_DTD');
 const items=[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,100);
 const field=(s:string,name:string)=>{const v=new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`,'i').exec(s)?.[1];return v?.replace(/^<!\[CDATA\[|\]\]>$/g,'').trim()??null;};
 return items.map((m,i)=>{const link=field(m[1]!,'link'),guid=field(m[1]!,'guid');return {identity:guid||hash([feedUrl,link]),title:field(m[1]!,'title'),link,pubDate:field(m[1]!,'pubDate'),start:null,ordinal:i};});
}

export function officialIcsAdapter(ics:string){
 if(ics.length>1024*1024||!ics.includes('BEGIN:VCALENDAR'))throw Error('ICS_INVALID');
 const lines=ics.replace(/\r\n[ \t]/g,'').split(/\r?\n/);const events:Record<string,string>[]=[];let current:Record<string,string>|null=null;
 for(const line of lines){if(line==='BEGIN:VEVENT'){current={};continue;}if(line==='END:VEVENT'){if(current)events.push(current);current=null;continue;}if(current){const n=line.indexOf(':');if(n>0)current[line.slice(0,n)]=line.slice(n+1);}}
 return events.slice(0,100).map(e=>{const startKey=Object.keys(e).find(k=>k.startsWith('DTSTART')),endKey=Object.keys(e).find(k=>k.startsWith('DTEND'));
  const zone=startKey?.match(/TZID=([^;:]+)/)?.[1]??null,start=startKey?e[startKey]:null,end=endKey?e[endKey]:null;
  const exact=zone==='Europe/Moscow'&&/^20\d{6}T\d{4}(?:\d{2})?$/.test(start??'');
  const iso=exact?`${start!.slice(0,4)}-${start!.slice(4,6)}-${start!.slice(6,8)}T${start!.slice(9,11)}:${start!.slice(11,13)}:${start!.length===15?start!.slice(13,15):'00'}+03:00`:null;
  const endZone=endKey?.match(/TZID=([^;:]+)/)?.[1]??null,endExact=endZone==='Europe/Moscow'&&/^20\d{6}T\d{4}(?:\d{2})?$/.test(end??'');
  const endIso=endExact?`${end!.slice(0,4)}-${end!.slice(4,6)}-${end!.slice(6,8)}T${end!.slice(9,11)}:${end!.slice(11,13)}:${end!.length===15?end!.slice(13,15):'00'}+03:00`:null;
  const cancelled=e.STATUS==='CANCELLED';
  return {uid:e.UID??null,recurrenceId:Object.entries(e).find(([k])=>k.startsWith('RECURRENCE-ID'))?.[1]??null,status:e.STATUS??'UNKNOWN',title:e.SUMMARY??null,start:!cancelled&&iso&&exactInstant(iso,zone)?iso:null,end:!cancelled&&endIso&&exactInstant(endIso,endZone)?endIso:null,location:e.LOCATION??null,price:null};});
}
