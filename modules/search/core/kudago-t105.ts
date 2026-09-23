import {hash,plainText,type SourcePlace,type SourcePrice,type SourceRecord,type SourceSession} from '../../../packages/domain/event.ts';
import {normalizePage,type NormalizationPolicy} from '../../../packages/domain/event-normalizer.ts';

type Raw = Record<string,unknown>;
const object=(value:unknown):Raw|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Raw:null;
const nativeId=(value:unknown):string|null=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?String(value):plainText(value,256);
const epoch=(value:unknown):string|null=>{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<946684800||value>4102444799)return null;
  return new Date(value*1000).toISOString();
};
const rubles=(value:string):string=>(BigInt(value)*100n).toString();
const unknownPrice=(raw:string|null,free:boolean|null):SourcePrice=>({
  kind:'UNKNOWN',currency:null,basis:'UNKNOWN',evidenceScope:'EVENT',scopeAppliesToOccurrence:null,
  quoteMinMinor:null,quoteMaxMinor:null,feeMode:'UNKNOWN',explicitFree:free,mandatoryExtras:[],
  conditions:[],rawPriceText:raw,evidencePaths:raw!==null||free!==null?['price','is_free']:[],
  feeEvidencePaths:[],freeEvidencePath:free===true?'is_free':null,
  parsedConfidence:'UNKNOWN',
});
/** A reviewed narrow source grammar. No claim of payable total or occurrence binding. */
export function kudagoPrice(rawValue:unknown,freeValue:unknown):SourcePrice {
  const raw=typeof rawValue==='string'?rawValue.trim():null,free=typeof freeValue==='boolean'?freeValue:null;
  const price=unknownPrice(raw,free);
  if(raw!==null&&raw.length>4096)return {...price,rawPriceText:null,evidencePaths:['price'],parsedConfidence:'UNKNOWN'};
  const text=raw??'';
  const deposit=/^вход бесплатный,\s*депозит(?: на [^—-]{1,80})?\s*[—-]\s*(0|[1-9]\d{0,9})\s*(?:рублей|руб\.?|₽)$/iu.exec(text);
  if(deposit){
    return {...price,kind:'FREE',currency:'RUB',quoteMinMinor:'0',quoteMaxMinor:'0',explicitFree:true,freeEvidencePath:'price',
      mandatoryExtras:[{label:'Обязательный депозит',minMinor:rubles(deposit[1]!),path:'price'}],
      conditions:['Обязательный депозит: '+deposit[1]+' ₽'],parsedConfidence:'HIGH'};
  }
  if(free===true&&(!text||/^(бесплатно|вход свободный)$/iu.test(text)))
    return {...price,kind:'FREE',currency:'RUB',quoteMinMinor:'0',quoteMaxMinor:'0',parsedConfidence:'MEDIUM'};
  const exact=/^(0|[1-9]\d{0,9})\s*(?:рублей|руб\.?|₽)$/iu.exec(text);
  if(exact)return {...price,kind:'KNOWN',currency:'RUB',quoteMinMinor:rubles(exact[1]!),quoteMaxMinor:rubles(exact[1]!),parsedConfidence:'HIGH'};
  const from=/^от\s+(0|[1-9]\d{0,9})\s*(?:рублей|руб\.?|₽)$/iu.exec(text);
  if(from)return {...price,kind:'FROM',currency:'RUB',quoteMinMinor:rubles(from[1]!),parsedConfidence:'HIGH'};
  const range=/^от\s+(0|[1-9]\d{0,9})\s+до\s+(0|[1-9]\d{0,9})\s*(?:рублей|руб\.?|₽)$/iu.exec(text);
  if(range&&BigInt(range[2]!)>BigInt(range[1]!))return {...price,kind:'RANGE',currency:'RUB',quoteMinMinor:rubles(range[1]!),quoteMaxMinor:rubles(range[2]!),parsedConfidence:'HIGH'};
  return price;
}
function place(raw:unknown):SourcePlace {
  const p=object(raw),coords=object(p?.coords);
  const name=typeof p?.title==='string'?p.title:null,address=typeof p?.address==='string'?p.address:null;
  const point=typeof coords?.lat==='number'&&typeof coords?.lon==='number'?{lat:coords.lat,lon:coords.lon}:null;
  return {
    kind:p&&(p.id!==undefined||name)?'VENUE':address?'PARTIAL_ADDRESS':'UNKNOWN',
    format:'UNKNOWN',providerVenueId:nativeId(p?.id),venueName:name,address,coordinates:point,
    coordinateMeaning:point?'VENUE':'UNKNOWN',evidencePaths:p?['place.id','place.title','place.address','place.coords']:['place'],
  };
}
function expandedMatches(epochIso:string,day:unknown,time:unknown,zone:string):boolean {
  if(typeof day!=='string'||typeof time!=='string'||!/^20\d\d-\d\d-\d\d$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time))return false;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(Date.parse(epochIso));
  const get=(part:string)=>parts.find(p=>p.type===part)?.value;
  return day===get('year')+'-'+get('month')+'-'+get('day')&&time===get('hour')+':'+get('minute')+':'+get('second');
}
export type KudaGoContext = {
  sourceId:string; dataMode:'SYNTHETIC'|'LIVE'; requestId:string; fetchedAt:string; responseSha256:string;
  rightsRevision:string; timeZone:string; categoryMap:Readonly<Record<string,string>>; categoryEvidenceRef?:string;
};
export function adaptKudaGoRecord(raw:unknown,ordinal:number,ctx:KudaGoContext):SourceRecord {
  const r=object(raw);if(!r)throw Error('PROVIDER_RECORD_SHAPE');
  const dates=Array.isArray(r.dates)?r.dates:null;
  if(!dates)throw Error('PROVIDER_DATES_SHAPE');
  if(dates.length>5000)throw Error('SESSION_BOUND_EXCEEDED');
  const sharedPlace=place(r.place),price=kudagoPrice(r.price,r.is_free);
  const sessions:SourceSession[]=dates.map((entry,index)=>{
    const d=object(entry),path='dates['+index+']';
    if(!d)return {path,precision:'EXACT',startsAt:null,endsAt:null,timeZone:ctx.timeZone,nativeSessionId:null,nativeIdVerified:false,place:sharedPlace,price:null,timePaths:[path],unsupportedReason:null};
    const start=epoch(d.start),end=epoch(d.end);
    const flags=['is_continuous','is_endless','is_startless','use_place_schedule'];
    const supported=flags.every(flag=>d[flag]===false)&&Array.isArray(d.schedules)&&d.schedules.length===0;
    let precision:SourceSession['precision']=supported?'EXACT':'RECURRING';
    if(!supported&&d.is_continuous===true)precision='SPAN';
    if(start&&end&&Date.parse(end)-Date.parse(start)>24*3600000)precision='SPAN';
    const startConflict=start&&d.start_date!==undefined&&d.start_time!==undefined&&!expandedMatches(start,d.start_date,d.start_time,ctx.timeZone);
    const endProvided=d.end_date!==null&&d.end_date!==undefined&&d.end_time!==null&&d.end_time!==undefined;
    const endConflict=end&&endProvided&&!expandedMatches(end,d.end_date,d.end_time,ctx.timeZone);
    return {
      path,precision,startsAt:startConflict?null:start,endsAt:endConflict?'invalid':endProvided?end:null,
      timeZone:ctx.timeZone,nativeSessionId:null,nativeIdVerified:false,place:sharedPlace,price:null,
      timePaths:[path+'.start',path+'.start_date',path+'.start_time',path+'.end',path+'.end_date',path+'.end_time'],
      timeEvidence:{startEpoch:typeof d.start==='number'?String(d.start):null,endEpoch:typeof d.end==='number'?String(d.end):null,
        expandedStartDate:typeof d.start_date==='string'?d.start_date:null,expandedStartTime:typeof d.start_time==='string'?d.start_time:null,
        expandedEndDate:typeof d.end_date==='string'?d.end_date:null,expandedEndTime:typeof d.end_time==='string'?d.end_time:null},
      unsupportedReason:precision==='SPAN'?'EVENT_SPAN_UNSUPPORTED':'SCHEDULE_UNSUPPORTED',
    };
  });
  const rawCategories=Array.isArray(r.categories)?r.categories:null;
  const categories=rawCategories?rawCategories.flatMap(value=>{
    const key=typeof value==='string'?value:object(value)?.slug;
    return typeof key==='string'&&Object.hasOwn(ctx.categoryMap,key)?[ctx.categoryMap[key]!]:[];
  }):[];
  return {
    sourceId:ctx.sourceId,providerId:'KudaGo',dataMode:ctx.dataMode,providerEventId:nativeId(r.id)??'',
    requestId:ctx.requestId,recordOrdinal:ordinal,fetchedAt:ctx.fetchedAt,sourceUrl:typeof r.site_url==='string'?r.site_url:null,
    responseSha256:ctx.responseSha256,apiVersion:'1.4',transformVersion:'kudago-t105/1',rightsRevision:ctx.rightsRevision,
    title:typeof r.title==='string'?r.title:'',categories,categoryMappingVerified:!!ctx.categoryEvidenceRef,
    categoriesComplete:!!ctx.categoryEvidenceRef&&rawCategories!==null&&rawCategories.length===categories.length,
    price,sessions,lifecycle:'UNKNOWN',
  };
}
/** A page can be parsed from a bounded HTTP body; one malformed Event does not abort siblings. */
export function parseKudaGoPage(body:Uint8Array,ctx:KudaGoContext,policy:NormalizationPolicy){
  if(body.byteLength>4*1024*1024)throw Error('PAGE_BYTES_EXCEEDED');
  const page=object(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body)));
  if(!page||!Array.isArray(page.results)||page.results.length>500||!Number.isSafeInteger(page.count)||Number(page.count)<0||!(page.next===null||typeof page.next==='string'))throw Error('PAGE_ENVELOPE_INVALID');
  const adapted=page.results.map((record,index)=>{try{return adaptKudaGoRecord(record,index,ctx);}catch{return {sourceId:ctx.sourceId,providerId:'KudaGo',dataMode:ctx.dataMode,providerEventId:'',requestId:ctx.requestId,recordOrdinal:index};}});
  return {sourceRecords:adapted,records:normalizePage(adapted,policy),queryExhausted:page.next===null,snapshotConsistent:false,rawCount:page.results.length};
}
