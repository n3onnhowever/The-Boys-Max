import {
  NORMALIZATION_VERSION, exactInstant, hash, occurrenceAlias, plainText, safeSourceUrl, validZone,
  type EventProposal, type FragmentOutcome, type NormalizedRecord, type OccurrenceProposal,
  type Place, type Price, type Reason, type SourcePlace, type SourcePrice, type SourceRecord,
} from './event.ts';

export type NormalizationPolicy = {allowedHosts:readonly string[]; allowLive:boolean};
const minor=(value:unknown):string|null=>typeof value==='string'&&/^(0|[1-9]\d{0,17})$/.test(value)?value:null;
const sum=(a:string,b:string):string=>{const value=(BigInt(a)+BigInt(b)).toString();if(minor(value)===null)throw Error('PRICE_AMOUNT_OVERFLOW');return value;};
const reason=(code:string,path:string,raw?:unknown):Reason=>({code,path,...(raw===undefined?{}:{fieldHash:hash(raw)})});
const unknownPrice=(input:SourcePrice|null|undefined):Price=>{
  const p=input&&typeof input==='object'?input:null;
  return {
    kind:'UNKNOWN',currency:typeof p?.currency==='string'&&/^[A-Z]{3}$/.test(p.currency)?p.currency:null,
    basis:['PER_PERSON','GROUP_TOTAL','UNKNOWN'].includes(p?.basis??'')?p!.basis:'UNKNOWN',
    evidenceScope:['EVENT','OCCURRENCE','UNKNOWN'].includes(p?.evidenceScope??'')?p!.evidenceScope:'UNKNOWN',
    scopeAppliesToOccurrence:typeof p?.scopeAppliesToOccurrence==='boolean'?p.scopeAppliesToOccurrence:null,
    quoteMinMinor:null,quoteMaxMinor:null,mandatoryExtraMinMinor:null,totalMinMinor:null,totalMaxMinor:null,
    feeMode:'UNKNOWN',feesKnown:false,
    rawPriceText:typeof p?.rawPriceText==='string'?plainText(p.rawPriceText,4096):null,
    isFreeClaimedBySource:typeof p?.explicitFree==='boolean'?p.explicitFree:null,
    conditions:[],parsedConfidence:'UNKNOWN',
    evidencePaths:Array.isArray(p?.evidencePaths)?p.evidencePaths.filter(v=>plainText(v,200)!==null).slice(0,20):[],
    feeEvidencePaths:Array.isArray(p?.feeEvidencePaths)?p.feeEvidencePaths.filter(v=>plainText(v,200)!==null).slice(0,20):[],
    freeEvidencePath:typeof p?.freeEvidencePath==='string'?plainText(p.freeEvidencePath,200):null,
  };
};
export function normalizePrice(input:SourcePrice|null):Price {
  if(!input)return unknownPrice(null);
  if(typeof input!=='object'||typeof input.rawPriceText!=='string'&&input.rawPriceText!==null||!Array.isArray(input.evidencePaths)||!Array.isArray(input.feeEvidencePaths)||!Array.isArray(input.mandatoryExtras)||!Array.isArray(input.conditions))throw Error('PRICE_SHAPE_INVALID');
  const raw=input.rawPriceText===null||input.rawPriceText.trim()===''?null:plainText(input.rawPriceText,4096);
  if(input.rawPriceText!==null&&input.rawPriceText.trim()!==''&&raw===null)throw Error('PRICE_TEXT_INVALID');
  if(input.evidencePaths.length>20||input.evidencePaths.some(p=>plainText(p,200)===null)||input.feeEvidencePaths.length>20||input.feeEvidencePaths.some(p=>plainText(p,200)===null))throw Error('PRICE_EVIDENCE_INVALID');
  if(input.freeEvidencePath!==null&&plainText(input.freeEvidencePath,200)===null)throw Error('FREE_EVIDENCE_INVALID');
  if(input.feeMode!=='UNKNOWN'&&input.feeEvidencePaths.length===0)throw Error('FEE_EVIDENCE_MISSING');
  if(!['KNOWN','FREE','FROM','RANGE','UNKNOWN'].includes(input.kind)||
     !['PER_PERSON','GROUP_TOTAL','UNKNOWN'].includes(input.basis)||
     !['EVENT','OCCURRENCE','UNKNOWN'].includes(input.evidenceScope)||
     !['UNKNOWN','NONE','INCLUDED','ITEMIZED'].includes(input.feeMode))throw Error('PRICE_SHAPE_INVALID');
  if(input.currency!==null&&!/^[A-Z]{3}$/.test(input.currency))throw Error('PRICE_CURRENCY_INVALID');
  if(input.scopeAppliesToOccurrence!==null&&typeof input.scopeAppliesToOccurrence!=='boolean')throw Error('PRICE_SCOPE_INVALID');
  if(input.explicitFree!==null&&typeof input.explicitFree!=='boolean')throw Error('PRICE_FREE_EVIDENCE_INVALID');
  if(input.mandatoryExtras.length>20||input.conditions.length>20)throw Error('PRICE_BOUND_EXCEEDED');
  if(input.feeMode==='NONE'&&input.mandatoryExtras.length>0)throw Error('PRICE_FEE_CONFLICT');
  if(!['HIGH','MEDIUM','LOW','UNKNOWN'].includes(input.parsedConfidence))throw Error('PRICE_CONFIDENCE_INVALID');
  const conditions=input.conditions.map(c=>plainText(c,512));
  if(conditions.some(c=>c===null))throw Error('PRICE_CONDITION_INVALID');
  let extra='0';
  for(const item of input.mandatoryExtras){
    if(!plainText(item.label,200)||!plainText(item.path,200))throw Error('PRICE_EXTRA_EVIDENCE_INVALID');
    if(item.minMinor!==null){const amount=minor(item.minMinor);if(amount===null)throw Error('PRICE_AMOUNT_INVALID');extra=sum(extra,amount);}
  }
  const min=input.quoteMinMinor===null?null:minor(input.quoteMinMinor),max=input.quoteMaxMinor===null?null:minor(input.quoteMaxMinor);
  if((input.quoteMinMinor!==null&&min===null)||(input.quoteMaxMinor!==null&&max===null))throw Error('PRICE_AMOUNT_INVALID');
  if(input.kind==='KNOWN'&&(min===null||max!==min))throw Error('PRICE_KNOWN_SHAPE');
  if(input.kind==='FROM'&&(min===null||max!==null))throw Error('PRICE_FROM_SHAPE');
  if(input.kind==='RANGE'&&(min===null||max===null||BigInt(max)<=BigInt(min)))throw Error('PRICE_RANGE_SHAPE');
  if(input.kind==='FREE'&&(min!=='0'||max!=='0'||input.explicitFree!==true||input.freeEvidencePath===null))throw Error('PRICE_FREE_SHAPE');
  if(input.kind==='UNKNOWN'&&(min!==null||max!==null))throw Error('PRICE_UNKNOWN_SHAPE');
  if((min!==null||max!==null)&&input.evidencePaths.length===0)throw Error('PRICE_EVIDENCE_MISSING');
  const conditional=conditions.length>0;
  const feesKnown=input.feeMode!=='UNKNOWN';
  let kind:Price['kind']=conditional?'CONDITIONAL':input.kind;
  if(kind==='FREE'&&(!feesKnown||input.scopeAppliesToOccurrence!==true||input.mandatoryExtras.length>0||input.currency===null||input.basis==='UNKNOWN'))kind='UNKNOWN';
  // A source free flag is a quote claim, not proof of payable zero.
  const quoteMin=kind==='UNKNOWN'?null:min,quoteMax=kind==='UNKNOWN'?null:max;
  const comparable=input.scopeAppliesToOccurrence===true&&input.basis!=='UNKNOWN'&&input.currency!==null;
  const extraKnown=input.mandatoryExtras.every(e=>e.minMinor!==null);
  const addExtra=input.feeMode==='INCLUDED'?'0':extra;
  const totalMin=comparable&&quoteMin!==null&&extraKnown?sum(quoteMin,addExtra):null;
  const totalMax=comparable&&feesKnown&&!conditional&&quoteMax!==null&&extraKnown?sum(quoteMax,addExtra):null;
  return {
    kind,currency:input.currency,basis:input.basis,evidenceScope:input.evidenceScope,
    scopeAppliesToOccurrence:input.scopeAppliesToOccurrence,quoteMinMinor:quoteMin,quoteMaxMinor:quoteMax,
    mandatoryExtraMinMinor:input.mandatoryExtras.length&&extraKnown?extra:null,totalMinMinor:totalMin,totalMaxMinor:totalMax,
    feeMode:input.feeMode,feesKnown,rawPriceText:raw,isFreeClaimedBySource:input.explicitFree,
    conditions:conditions as string[],parsedConfidence:input.parsedConfidence,evidencePaths:input.evidencePaths,
    feeEvidencePaths:input.feeEvidencePaths,freeEvidencePath:input.freeEvidencePath,
  };
}
export function normalizePlace(input:SourcePlace|null|undefined):{place:Place; reasons:Reason[]} {
  if(!input||typeof input!=='object')return {place:{kind:'UNKNOWN',format:'UNKNOWN',providerVenueId:null,venueName:null,address:null,coordinates:null,coordinateMeaning:'UNKNOWN',evidencePaths:[]},reasons:[reason('PLACE_SHAPE_INVALID','place')]};
  const reasons:Reason[]=[];
  const providerVenueId=input.providerVenueId===null?null:plainText(input.providerVenueId,256);
  const venueName=input.venueName===null?null:plainText(input.venueName,300);
  const address=input.address===null?null:plainText(input.address,1000);
  if((input.providerVenueId!==null&&!providerVenueId)||(input.venueName!==null&&!venueName)||(input.address!==null&&!address))reasons.push(reason('PLACE_TEXT_INVALID','place'));
  let coordinates=input.coordinates&&typeof input.coordinates==='object'?input.coordinates:null;
  if(input.coordinates!==null&&input.coordinates!==undefined&&coordinates===null)reasons.push(reason('COORDINATES_INVALID','place.coordinates'));
  if(coordinates!==null&&(!Number.isFinite(coordinates.lat)||!Number.isFinite(coordinates.lon)||coordinates.lat < -90||coordinates.lat>90||coordinates.lon < -180||coordinates.lon>180)){
    coordinates=null;reasons.push(reason('COORDINATES_INVALID','place.coordinates'));
  }
  const kind=input.kind==='ONLINE'?'ONLINE':providerVenueId||venueName?'VENUE':address?'PARTIAL_ADDRESS':'UNKNOWN';
  let format:Place['format']=input.format==='ONLINE'?'ONLINE':input.format==='OFFLINE'?'OFFLINE':'UNKNOWN';
  const evidencePaths=Array.isArray(input.evidencePaths)?input.evidencePaths.filter(v=>plainText(v,200)!==null).slice(0,20):[];
  if(kind==='ONLINE'&&(providerVenueId||venueName||address||coordinates||evidencePaths.length===0)){
    reasons.push(reason('ONLINE_PLACE_CONFLICT','place'));format='UNKNOWN';
  }
  if(kind==='VENUE'&&format==='ONLINE'){reasons.push(reason('PLACE_FORMAT_CONFLICT','place.format'));format='UNKNOWN';}
  let coordinateMeaning:Place['coordinateMeaning']='UNKNOWN';
  if(coordinates){
    if(input.coordinateMeaning==='VENUE'||input.coordinateMeaning==='MEETING_POINT')coordinateMeaning=input.coordinateMeaning;
    else reasons.push(reason('COORDINATE_MEANING_UNKNOWN','place.coordinateMeaning'));
  }
  const onlineConflict=reasons.some(r=>r.code==='ONLINE_PLACE_CONFLICT');
  const place:Place={
    kind:onlineConflict?'UNKNOWN':kind,format,
    providerVenueId:onlineConflict?null:providerVenueId,venueName:onlineConflict?null:venueName,address:onlineConflict?null:address,
    coordinates:onlineConflict?null:coordinates,coordinateMeaning:onlineConflict?'UNKNOWN':coordinateMeaning,evidencePaths,
  };
  return {place,reasons};
}
function sourceRecord(raw:unknown,policy:NormalizationPolicy):SourceRecord {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('RECORD_SHAPE_INVALID');
  const r=raw as SourceRecord;
  const sourceId=plainText(r.sourceId,256),providerId=plainText(r.providerId,128),providerEventId=plainText(r.providerEventId,256),
    requestId=plainText(r.requestId,256),title=plainText(r.title,300),transformVersion=plainText(r.transformVersion,100),
    rightsRevision=plainText(r.rightsRevision,128),apiVersion=plainText(r.apiVersion,64);
  if(!sourceId||!providerId||!providerEventId||!requestId||!title||!transformVersion||!rightsRevision||!apiVersion)throw Error('REQUIRED_FIELD_INVALID');
  if(r.dataMode!=='SYNTHETIC'&&r.dataMode!=='LIVE')throw Error('DATA_MODE_INVALID');
  if(r.dataMode==='LIVE'&&!policy.allowLive)throw Error('LIVE_ADMISSION_DISABLED');
  if(!Number.isInteger(r.recordOrdinal)||r.recordOrdinal<0||r.recordOrdinal>1_000_000)throw Error('ORDINAL_INVALID');
  if(exactInstant(r.fetchedAt,'UTC')===null||!r.fetchedAt.endsWith('Z'))throw Error('FETCHED_AT_INVALID');
  if(!/^[a-f0-9]{64}$/.test(r.responseSha256))throw Error('RESPONSE_HASH_INVALID');
  const sourceUrl=r.sourceUrl===null?null:safeSourceUrl(r.sourceUrl,policy.allowedHosts);
  if(r.sourceUrl!==null&&sourceUrl===null)throw Error('SOURCE_URL_UNSAFE');
  if(r.dataMode==='LIVE'&&sourceUrl===null)throw Error('SOURCE_URL_MISSING');
  if(!Array.isArray(r.categories)||r.categories.length>32||r.categories.some(c=>!plainText(c,100)))throw Error('CATEGORIES_INVALID');
  if(typeof r.categoriesComplete!=='boolean'||typeof r.categoryMappingVerified!=='boolean'||r.categoriesComplete&&!r.categoryMappingVerified)throw Error('CATEGORY_EVIDENCE_INVALID');
  if(!Array.isArray(r.sessions)||r.sessions.length>5000)throw Error('SESSION_BOUND_EXCEEDED');
  if(!['UNKNOWN','SCHEDULED','POSTPONED','CANCELLED'].includes(r.lifecycle))throw Error('LIFECYCLE_INVALID');
  return {...r,sourceId,providerId,providerEventId,requestId,title,transformVersion,rightsRevision,apiVersion,sourceUrl};
}
function semanticPrice(p:Price){const {rawPriceText:_,evidencePaths:__,parsedConfidence:___,...semantic}=p;return semantic;}
export function semanticEvent(event:Pick<EventProposal,'title'|'categories'|'categoriesComplete'|'categoryMappingVerified'|'sourceUrl'>):string{return hash([event.title,[...event.categories].sort(),event.categoriesComplete,event.categoryMappingVerified,event.sourceUrl]);}
export function semanticOccurrence(o:OccurrenceProposal):string {
  const {evidencePaths:_,...place}=o.place;
  return hash([o.startsAt,o.endsAt,o.timeZone,place,semanticPrice(o.price),o.lifecycle,o.confirmation,o.listing]);
}
export function normalizeRecord(raw:unknown,policy:NormalizationPolicy):NormalizedRecord {
  let record:SourceRecord;
  try{record=sourceRecord(raw,policy);}catch(error){
    const code=String((error as Error).message);
    return {outcome:code==='LIVE_ADMISSION_DISABLED'?'REJECT':'QUARANTINE',event:null,occurrences:[],fragments:[],reasons:[reason(code,'$')],projectionSha256:null};
  }
  const base={
    sourceId:record.sourceId,providerId:record.providerId,providerEventId:record.providerEventId,dataMode:record.dataMode,
    requestId:record.requestId,recordOrdinal:record.recordOrdinal,fetchedAt:record.fetchedAt,sourceUrl:record.sourceUrl,
    responseSha256:record.responseSha256,transformVersion:record.transformVersion+'+'+NORMALIZATION_VERSION,rightsRevision:record.rightsRevision,
    timePaths:[],placePaths:[],
  };
  const event:EventProposal={sourceId:record.sourceId,providerEventId:record.providerEventId,title:record.title,categories:[...new Set(record.categories)],categoriesComplete:record.categoriesComplete,categoryMappingVerified:record.categoryMappingVerified,sourceUrl:record.sourceUrl,provenance:base};
  const reasons:Reason[]=[],fragments:FragmentOutcome[]=[],occurrences:OccurrenceProposal[]=[];
  let eventPrice:Price;
  try{eventPrice=normalizePrice(record.price);}catch(error){eventPrice=unknownPrice(record.price);reasons.push(reason(String((error as Error).message),'price'));}
  const seen=new Map<string,{index:number;semantic:string}>(),conflicted=new Set<string>();
  for(const session of record.sessions){
    const path=plainText(session?.path,200)??'sessions[?]';
    if(!session||typeof session!=='object'||path==='sessions[?]'||typeof session.nativeIdVerified!=='boolean'){fragments.push({path,outcome:'QUARANTINE',reasons:[reason('SESSION_SHAPE_INVALID',path)],aliasValue:null});continue;}
    try{
    if(session.precision!=='EXACT'){fragments.push({path,outcome:'UNSUPPORTED',reasons:[reason(session.precision==='SPAN'?'EVENT_SPAN_UNSUPPORTED':'SCHEDULE_UNSUPPORTED',path)],aliasValue:null});continue;}
    const start=exactInstant(session.startsAt,session.timeZone);
    if(start===null){fragments.push({path,outcome:'QUARANTINE',reasons:[reason('START_INVALID',path+'.startsAt',session.startsAt)],aliasValue:null});continue;}
    let end:string|null=null;const localReasons:Reason[]=[];
    if(session.endsAt!==null){
      end=exactInstant(session.endsAt,session.timeZone);
      if(end===null||Date.parse(end)<=Date.parse(start)){localReasons.push(reason('END_INVALID',path+'.endsAt',session.endsAt));end=null;}
    }
    const {place,reasons:placeReasons}=normalizePlace(session.place);localReasons.push(...placeReasons);
    let price=eventPrice;
    if(session.price!==null){try{price=normalizePrice(session.price);}catch(error){price=unknownPrice(session.price);localReasons.push(reason(String((error as Error).message),path+'.price'));}}
    const nativeSessionId=session.nativeIdVerified?plainText(session.nativeSessionId,256):null;
    if(session.nativeIdVerified&&nativeSessionId===null){fragments.push({path,outcome:'QUARANTINE',reasons:[reason('NATIVE_SESSION_ID_INVALID',path)],aliasValue:null});continue;}
    const timePaths=Array.isArray(session.timePaths)?session.timePaths.filter(v=>plainText(v,200)!==null).slice(0,20):[];
    if(timePaths.length===0)localReasons.push(reason('TIME_EVIDENCE_MISSING',path));
    const timeEvidence:Record<string,string|null>={};
    if(session.timeEvidence&&typeof session.timeEvidence==='object'&&!Array.isArray(session.timeEvidence)&&Object.keys(session.timeEvidence).length<=10){
      for(const [key,value] of Object.entries(session.timeEvidence)){
        if(!plainText(key,80)||value!==null&&(typeof value!=='string'||plainText(value,80)===null)){localReasons.push(reason('TIME_EVIDENCE_INVALID',path));continue;}
        timeEvidence[key]=value;
      }
    }else if(session.timeEvidence!==undefined)localReasons.push(reason('TIME_EVIDENCE_INVALID',path));
    const proposal:OccurrenceProposal={
      aliasType:'ANON',aliasValue:'',nativeSessionId,startsAt:start,endsAt:end,timeZone:session.timeZone!,
      place,price,timeEvidence,lifecycle:record.lifecycle,confirmation:'CONFIRMED',listing:'PRESENT',
      path,timePaths,
    };
    const alias=occurrenceAlias(proposal);proposal.aliasType=alias.type;proposal.aliasValue=alias.value;
    const key=alias.type+':'+alias.value,semantic=semanticOccurrence(proposal),previous=seen.get(key);
    if(conflicted.has(key)){fragments.push({path,outcome:'QUARANTINE',reasons:[reason('ALIAS_FACT_CONFLICT',path)],aliasValue:key});continue;}
    if(previous){
      if(previous.semantic===semantic)fragments.push({path,outcome:'DUPLICATE',reasons:[],aliasValue:key});
      else{
        occurrences.splice(previous.index,1);
        seen.delete(key);conflicted.add(key);
        for(const entry of seen.values())if(entry.index>previous.index)entry.index--;
        const prior=fragments.find(f=>f.aliasValue===key&&f.outcome!=='DUPLICATE');
        if(prior){prior.outcome='QUARANTINE';prior.reasons.push(reason('ALIAS_FACT_CONFLICT',prior.path));}
        fragments.push({path,outcome:'QUARANTINE',reasons:[reason('ALIAS_FACT_CONFLICT',path)],aliasValue:key});
      }
      continue;
    }
    seen.set(key,{index:occurrences.length,semantic});
    occurrences.push(proposal);
    fragments.push({path,outcome:localReasons.length?'PARTIAL_ACCEPT':'ACCEPT',reasons:localReasons,aliasValue:key});
    }catch{fragments.push({path,outcome:'QUARANTINE',reasons:[reason('SESSION_NORMALIZATION_FAILED',path)],aliasValue:null});}
  }
  const partial=reasons.length>0||fragments.some(f=>!['ACCEPT','DUPLICATE'].includes(f.outcome));
  const projectionSha256=hash([semanticEvent(event),occurrences.map(semanticOccurrence).sort()]);
  return {outcome:partial?'PARTIAL_ACCEPT':'ACCEPT',event,occurrences,fragments,reasons,projectionSha256};
}
/** Page validation is bounded and isolates one bad record from its siblings. */
export function normalizePage(records:readonly unknown[],policy:NormalizationPolicy):NormalizedRecord[] {
  if(records.length>500)throw Error('PAGE_RECORD_BOUND_EXCEEDED');
  if(records.reduce<number>((n,raw)=>n+(raw&&typeof raw==='object'&&Array.isArray((raw as {sessions?:unknown}).sessions)?(raw as {sessions:unknown[]}).sessions.length:0),0)>5000)throw Error('PAGE_FRAGMENT_BOUND_EXCEEDED');
  const result=records.map(raw=>{try{return normalizeRecord(raw,policy);}catch{return {outcome:'QUARANTINE' as const,event:null,occurrences:[],fragments:[],reasons:[reason('RECORD_NORMALIZATION_FAILED','$')],projectionSha256:null};}});
  const seen=new Map<string,{indices:number[];hash:string}>(),conflicted=new Set<string>();
  for(let i=0;i<result.length;i++){
    const row=result[i]!;if(!row.event)continue;
    const key=row.event.sourceId+':'+row.event.providerEventId,prior=seen.get(key);
    if(conflicted.has(key)){row.outcome='QUARANTINE';row.event=null;row.occurrences=[];row.reasons.push(reason('PROVIDER_EVENT_CONFLICT','$'));continue;}
    if(!prior){seen.set(key,{indices:[i],hash:row.projectionSha256!});continue;}
    if(prior.hash===row.projectionSha256){prior.indices.push(i);row.outcome='PARTIAL_ACCEPT';row.occurrences=[];row.reasons.push(reason('DUPLICATE_SOURCE_ROW','$'));continue;}
    conflicted.add(key);
    for(const idx of [...prior.indices,i]){const conflict=result[idx]!;conflict.outcome='QUARANTINE';conflict.event=null;conflict.occurrences=[];conflict.reasons.push(reason('PROVIDER_EVENT_CONFLICT','$'));}
  }
  return result;
}



/** Three-valued hard budget check; lower bounds can disprove, only complete ceilings can prove. */
export function budgetVerdict(price:Price,maxMinor:string,currency:string):'PASS'|'FAIL'|'UNKNOWN' {
  if(minor(maxMinor)===null||!/^[A-Z]{3}$/.test(currency))throw Error('BUDGET_INVALID');
  if(price.scopeAppliesToOccurrence!==true||price.basis!=='PER_PERSON'||price.currency!==currency)return 'UNKNOWN';
  if(price.totalMinMinor!==null&&BigInt(price.totalMinMinor)>BigInt(maxMinor))return 'FAIL';
  if(price.totalMaxMinor!==null&&price.feesKnown&&price.conditions.length===0&&BigInt(price.totalMaxMinor)<=BigInt(maxMinor))return 'PASS';
  return 'UNKNOWN';
}
