import {type Basis,type Candidate,type Category,type Page,type PriceQuote,type ProviderQuery,type Rights,type Warning} from './types.ts';
import {arr,copy,fail,id,integer,minorString,obj,sourceLink,utc} from './guard.ts';
import {parseCandidate} from './candidate.ts';
import {priceFromQuote,warning} from './price.ts';
import {dateEpoch,clock,wallInstants} from './time.ts';
/** Every option below is SERVER configuration or HTTP observation metadata, never model data. */
export interface NormalizationContext {
 observation_prefix:string;fetched_at:string;payload_sha256:string|null;data_mode:'LIVE'|'SYNTHETIC';rights:Rights;
 city_map:Readonly<Record<string,string>>;timezones:Readonly<Record<string,string>>;
 category_map:Readonly<Record<string,Category>>;taxonomy_mapping_evidence_ref:string|null;taxonomy_exhaustive:boolean;
 /** Null until source currency/basis is evidenced. Not inferred from a Moscow city filter. */
 timepad_ticket_units:{currency:'RUB';basis:Basis;evidence_ref:string}|null;
}
function nativeId(v:unknown):string {if(typeof v==='number')return id(String(integer(v,1,Number.MAX_SAFE_INTEGER)));return id(v);}
function shortText(v:unknown,n:number):string {return typeof v==='string'?v.slice(0,n):'';}
function optionalObject(v:unknown):Record<string,unknown>|null {return v===null||v===undefined?null:obj(v);}
function observedCity(external:unknown,ctx:NormalizationContext):string|null {return typeof external==='string'&&Object.hasOwn(ctx.city_map,external)?ctx.city_map[external]??null:null;}
function nativeEpoch(v:unknown):string|null {if(v===null||v===undefined)return null;return new Date(integer(v,946684800,4102444799)*1000).toISOString();}
/** ISO offset required: dates without a timezone are not silently interpreted as UTC/local. */
export function nativeInstant(v:unknown):string|null {
 if(v===null||v===undefined)return null;if(typeof v!=='string')fail('NATIVE_TIME_TYPE');
 const m=/^(20\d{2}-\d{2}-\d{2})T(\d{2}:\d{2}):(\d{2})(Z|([+-])(\d{2}):(\d{2}))$/.exec(v);
 if(!m)fail('NATIVE_TIME_OFFSET_REQUIRED');const seconds=integer(Number(m[3]),0,59),naive=dateEpoch(m[1])+clock(m[2])*60000+seconds*1000;
 let offset=0;if(m[4]!=='Z'){const hours=integer(Number(m[6]),0,14),mins=integer(Number(m[7]),0,59);if(hours===14&&mins!==0)fail('NATIVE_TIME_OFFSET_RANGE');offset=(hours*60+mins)*60000*(m[5]==='+'?1:-1);}
 const result=new Date(naive-offset).toISOString();utc(result);return result;
}
function taxonomy(raw:unknown,provider:'KudaGo'|'Timepad',ctx:NormalizationContext):Candidate['categories'] {
 if(!Array.isArray(raw))return {known:[],complete:false,mapping_verified:!!ctx.taxonomy_mapping_evidence_ref};
 const ids=arr(raw,'categories',100).map(v=>provider==='KudaGo'?(typeof v==='string'?v:typeof obj(v).slug==='string'?obj(v).slug as string:null):nativeId(obj(v).id));
 const mapped=ids.map(k=>k!==null&&Object.hasOwn(ctx.category_map,k)?ctx.category_map[k]:null);
 return {known:[...new Set(mapped.filter((x):x is Category=>x!==null))],complete:!!ctx.taxonomy_mapping_evidence_ref&&ctx.taxonomy_exhaustive&&mapped.every(x=>x!==null),mapping_verified:!!ctx.taxonomy_mapping_evidence_ref};
}
function blank(provider:'KudaGo'|'Timepad',eventId:string,occurrenceId:string,idx:number,raw:Record<string,unknown>,ctx:NormalizationContext):Candidate {
 id(ctx.observation_prefix);utc(ctx.fetched_at);const obs=id(`${ctx.observation_prefix}:${provider}:${eventId}:${idx}`);
 return {schema_version:'max.event-occurrence/3-candidate',ref:{kind:'EXTERNAL',provider_id:provider,event_id:eventId,occurrence_id:id(occurrenceId),native_occurrence_id:null},untrusted_title:shortText(provider==='KudaGo'?raw.title:raw.name,200),untrusted_description:'',city_id:null,starts_at:null,ends_at:null,time_precision:'UNKNOWN',categories:taxonomy(raw.categories,provider,ctx),
  price:priceFromQuote({kind:'UNKNOWN',source_field:provider==='KudaGo'?'price':'ticket_types',fees_known:false},obs),inventory:{remaining:null,observed_at:null},indoor:null,wheelchair_accessible:null,status:'UNKNOWN',listing_state:'PRESENT',provider_health:'OK',venue:{id:null,address:null,coordinates:null,coordinate_meaning:'UNKNOWN'},
  provenance:{observation_id:obs,observed_at:ctx.fetched_at,fetched_at:ctx.fetched_at,provider_updated_at:null,source_url:sourceLink((provider==='KudaGo'?raw.site_url:raw.url)??null,provider),payload_sha256:ctx.payload_sha256,transform_version:'source-normalizer.3-candidate',field_sources:{identity:['id'],time:[provider==='KudaGo'?`dates[${idx}]`:'starts_at,ends_at'],price:[provider==='KudaGo'?'price,is_free':'ticket_types[].price'],categories:['categories'],city:['location']},data_mode:ctx.data_mode},rights:copy(ctx.rights),warnings:[warning('LIFECYCLE_NOT_PROVIDED','status','Публичная запись не содержит проверенного статуса отмены/переноса.'),warning('DERIVED_OCCURRENCE_ID','ref','Отдельный ID сеанса не предоставлен: используется производный идентификатор; изменение расписания требует сопоставления.')]};
}
/** Narrow grammar only. Conditions not matched exactly remain source text, never low guessed price. */
export function kudagoQuote(rawPrice:unknown,isFree:unknown):PriceQuote {
 if(isFree!==undefined&&typeof isFree!=='boolean')fail('NATIVE_FREE_FLAG_TYPE');if(rawPrice!==undefined&&rawPrice!==null&&typeof rawPrice!=='string')fail('NATIVE_PRICE_TEXT_TYPE');
 const label=typeof rawPrice==='string'?rawPrice.trim().slice(0,2000):'';
 const q:PriceQuote={kind:'TEXT',basis:'UNKNOWN',currency:null,raw_label:label||null,source_field:'price,is_free',fees_known:false,fee_mode:'UNKNOWN',extras:[],warnings:[]};
 if(isFree===true){if(label&& !/^(бесплатно|вход свободный)$/iu.test(label)){q.warnings.push(warning('FREE_LABEL_CONFLICT','price','Флаг бесплатности не согласован с текстом условий; требуется проверка.'));return q;}q.kind='FREE';return q;}
 const m=/^(от )?(0|[1-9]\d{0,9})(?:[–-](0|[1-9]\d{0,9}))?\s*(₽|руб\.?)(?:\s*(\/чел\.?|за человека|за группу))?$/iu.exec(label);
 if(m&&!(m[1]&&m[3])){q.kind=m[1]?'FROM':m[3]?'RANGE':'EXACT';q.currency='RUB';q.basis=m[5]?m[5].toLowerCase()==='за группу'?'GROUP_TOTAL':'PER_PERSON':'UNKNOWN';const lo=minorString(BigInt(m[2]!)*100n);
  if(q.kind==='EXACT')q.exact_minor=lo;else q.min_minor=lo;if(m[3])q.max_minor=minorString(BigInt(m[3])*100n);}
 return q;
}
function exactExpandedTime(d:Record<string,unknown>,prefix:'start'|'end',zone:string):string|null {
 const date=d[`${prefix}_date`],time=d[`${prefix}_time`];if(date===null||date===undefined||time===null||time===undefined)return null;
 if(typeof date!=='string'||typeof time!=='string'||!/^\d{2}:\d{2}:\d{2}$/.test(time))fail('EXPANDED_TIME_TYPE');
 const seconds=integer(Number(time.slice(6)),0,59),points=wallInstants(date,time.slice(0,5),zone);
 if(points.length!==1)return null;const result=new Date(points[0]!+seconds*1000).toISOString();const epoch=nativeEpoch(d[prefix]);
 if(epoch!==null&&epoch!==result)fail('NATIVE_TIME_CONFLICT');return result;
}
export function normalizeKudaGoRecord(raw:unknown,ctx:NormalizationContext):Candidate[] {
 const r=obj(raw),eventId=nativeId(r.id),location=optionalObject(r.location),city=observedCity(typeof r.location==='string'?r.location:location?.slug,ctx),zone=city?ctx.timezones[city]:null;
 const dates=r.dates===undefined?[]:arr(r.dates,'dates',50);const records=dates.length?dates:[{}];
 return records.map((entry,index)=>{const d=obj(entry),start=nativeEpoch(d.start),key=start?'start:'+String(utc(start)/1000):'unresolved:'+index,c=blank('KudaGo',eventId,key,index,r,ctx);
  c.city_id=city;c.starts_at=start;c.price=priceFromQuote(kudagoQuote(r.price,r.is_free),c.provenance.observation_id);
  // Missing recurrence flags do NOT prove a concrete session.
  const exact=zone&&d.is_continuous===false&&d.is_endless===false&&d.is_startless===false&&d.use_place_schedule===false&&Array.isArray(d.schedules)&&d.schedules.length===0;
  if(exact){const knownStart=exactExpandedTime(d,'start',zone);if(knownStart!==null){c.starts_at=knownStart;c.ends_at=exactExpandedTime(d,'end',zone);c.time_precision='EXACT_OCCURRENCE';}}
  else if(start!==null)c.time_precision='EVENT_SPAN';
  const place=optionalObject(r.place);if(place){c.venue.id=place.id===undefined?null:nativeId(place.id);c.venue.address=typeof place.address==='string'?place.address.slice(0,500)||null:null;
   const coords=optionalObject(place.coords);if(coords&&typeof coords.lat==='number'&&typeof coords.lon==='number'){c.venue.coordinates={lat:coords.lat,lon:coords.lon};c.venue.coordinate_meaning='VENUE';}}
  return parseCandidate(c);
 });
}
function decimalMinor(v:unknown):string {
 if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000000000000)fail('NATIVE_PRICE_NUMBER');
 const s=v.toString();if(!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s))fail('NATIVE_PRICE_PRECISION');const [whole,frac='']=s.split('.');return minorString(BigInt(whole!)*100n+BigInt((frac+'00').slice(0,2)));
}
export function normalizeTimepadRecord(raw:unknown,ctx:NormalizationContext):Candidate[] {
 const r=obj(raw),eventId=nativeId(r.id),start=nativeInstant(r.starts_at),end=nativeInstant(r.ends_at),c=blank('Timepad',eventId,start?'start:'+String(utc(start)/1000):'unresolved',0,r,ctx);
 c.starts_at=start;c.ends_at=end;c.time_precision=start?'EXACT_OCCURRENCE':'UNKNOWN';
 const loc=optionalObject(r.location);c.city_id=observedCity(loc?.city,ctx);if(loc){c.venue.address=typeof loc.address==='string'?loc.address.slice(0,500)||null:null;
  // Array coordinate order is not assumed from vague documentation; map owner 21 verifies.
  if(Array.isArray(loc.coordinates))c.warnings.push(warning('COORDINATE_ORDER_UNVERIFIED','venue.coordinates','Порядок координат источника не проверен живым ответом; сохранён адрес без точки.'));}
 const types=r.ticket_types===undefined?[]:arr(r.ticket_types,'ticket_types',30).map(objType=>obj(objType));
 if(types.length){
  const rawLabel=JSON.stringify(types.map(t=>({id:nativeId(t.id),price:typeof t.price==='number'&&Number.isFinite(t.price)?t.price:null}))).slice(0,2000);
  let quote:PriceQuote={kind:'TEXT',basis:'UNKNOWN',currency:null,source_field:'ticket_types[].price',raw_label:rawLabel,fees_known:false,fee_mode:'UNKNOWN',extras:[],warnings:[]};
  const units=ctx.timepad_ticket_units;
  if(units&&units.currency==='RUB'&&units.evidence_ref&&types.every(t=>t.is_active===true&&t.is_promocode_locked===false&&typeof t.price==='number')){
   const prices=types.map(t=>BigInt(decimalMinor(t.price))),lo=prices.reduce((a,b)=>a<b?a:b),hi=prices.reduce((a,b)=>a>b?a:b);
   quote={...quote,kind:lo===hi?'EXACT':'RANGE',basis:units.basis,currency:units.currency,...(lo===hi?{exact_minor:minorString(lo)}:{min_minor:minorString(lo),max_minor:minorString(hi)})};
   (c.provenance.field_sources.price??=[]).push(units.evidence_ref);
  }else quote.warnings.push(warning('SOURCE_PRICE_UNITS_UNVERIFIED','price','Валюта, основание или доступность предложений требуют отдельного доказательства.'));
  c.price=priceFromQuote(quote,c.provenance.observation_id);
 }
 c.warnings.push(warning('INVENTORY_NOT_AGGREGATED','inventory','Лимит мероприятия и остатки разных типов билетов не суммируются в подтверждённую доступность.'));
 return [parseCandidate(c)];
}
/** Unknown extra source fields (HTML, widgets, personal links) are ignored, never executed. */
export function normalizePublicPage(raw:unknown,q:ProviderQuery,cursor:string|null,ctx:NormalizationContext):Page {
 const p=obj(raw),records=arr(q.provider_id==='KudaGo'?p.results:p.values,'records',100),warnings:Warning[]=[],items:Candidate[]=[];
 for(const record of records){try{const normalized=q.provider_id==='KudaGo'?normalizeKudaGoRecord(record,ctx):normalizeTimepadRecord(record,ctx);items.push(...normalized);}catch{warnings.push(warning('SOURCE_RECORD_QUARANTINED','record','Запись не прошла строгую нормализацию; её содержимое не выводится в ошибке.'));}}
 let next:string|null=null;
 if(q.provider_id==='KudaGo'){
  // Presence of next means "another page", never permission to fetch the returned URL.
  if(p.next!==null&&p.next!==undefined){if(typeof p.next!=='string')fail('NATIVE_NEXT_TYPE');next=String(Number(cursor??'1')+1);}
 }else {const total=integer(p.total,0,Number.MAX_SAFE_INTEGER),offset=Number(cursor??'0');if(offset+records.length<total&&records.length)next=String(offset+records.length);}
 const truncated=items.length>q.max_items,exhaustionKnown=q.provider_id==='KudaGo'?Object.hasOwn(p,'next')&&p.next===null:Number(cursor??'0')+records.length===p.total;return {items:items.slice(0,q.max_items),next_cursor:next,coverage:{scope_id:id(q.approval_id),all_pages_consumed:next===null&&exhaustionKnown&&!truncated,snapshot_consistent:false,truncated},warnings};
}
