import {hash,type SourcePrice,type SourceRecord} from '../domain/event.ts';
import {priceFromQuote} from '../../modules/search/core/price.ts';
import {parseCandidate} from '../../modules/search/core/candidate.ts';
import type {Candidate,PriceQuote} from '../../modules/search/core/types.ts';
import {DEMO_NOTICE} from './constants.ts';
export {DEMO_NOTICE} from './constants.ts';

export const DEMO_VERSION='v1';
export const DEMO_SOURCE_ID='synthetic:povod-demo:v1';
export const DEMO_PROVIDER_ID='ManualProvider';
export const DEMO_REFERENCE_DATE='2026-09-25';
export const DEMO_FETCHED_AT='2026-09-24T18:00:00.000Z';
export const DEMO_RIGHTS_DUE='2027-03-20T00:00:00.000Z';

type DemoItem={id:string;title:string;category:'CONCERT'|'THEATRE'|'MUSEUM'|'CINEMA'|'SPORT'|'OUTDOOR';start:string;end:string|null;price:'UNKNOWN'|'CONDITIONAL'|'KNOWN'|'FREE';};
/** Imagined formats and places only. Dates are fixed; expiry is deliberate. */
export const DEMO_ITEMS:readonly DemoItem[]=[
 {id:'sound-lab',title:'Вымышленная лаборатория звука',category:'CONCERT',start:'2026-10-17T18:00:00+03:00',end:'2026-10-17T20:00:00+03:00',price:'UNKNOWN'},
 {id:'paper-stage',title:'Вымышленный бумажный театр',category:'THEATRE',start:'2026-10-24T16:00:00+03:00',end:null,price:'CONDITIONAL'},
 {id:'light-forms',title:'Вымышленная выставка световых форм',category:'MUSEUM',start:'2026-11-07T12:00:00+03:00',end:'2026-11-07T15:00:00+03:00',price:'FREE'},
 {id:'short-films',title:'Вымышленный вечер короткого кино',category:'CINEMA',start:'2026-11-21T19:00:00+03:00',end:'2026-11-21T21:00:00+03:00',price:'KNOWN'},
 {id:'urban-moves',title:'Вымышленный городской забег',category:'SPORT',start:'2027-01-16T11:00:00+03:00',end:null,price:'UNKNOWN'},
 {id:'winter-walk',title:'Вымышленная зимняя прогулка',category:'OUTDOOR',start:'2027-02-13T13:00:00+03:00',end:'2027-02-13T15:00:00+03:00',price:'CONDITIONAL'},
];
const basePrice:SourcePrice={kind:'UNKNOWN',currency:null,basis:'UNKNOWN',evidenceScope:'UNKNOWN',scopeAppliesToOccurrence:null,quoteMinMinor:null,quoteMaxMinor:null,feeMode:'UNKNOWN',explicitFree:null,mandatoryExtras:[],conditions:[],rawPriceText:null,evidencePaths:[],feeEvidencePaths:[],freeEvidencePath:null,parsedConfidence:'UNKNOWN'};
function sourcePrice(kind:DemoItem['price']):SourcePrice {
 if(kind==='UNKNOWN')return {...basePrice};
 if(kind==='CONDITIONAL')return {...basePrice,kind:'KNOWN',currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,quoteMinMinor:'50000',quoteMaxMinor:'50000',conditions:['Условная цена демонстрационного сценария; продаж нет'],rawPriceText:'Условно 500 ₽',evidencePaths:['demo.price'],parsedConfidence:'HIGH'};
 if(kind==='FREE')return {...basePrice,kind:'FREE',currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,quoteMinMinor:'0',quoteMaxMinor:'0',feeMode:'NONE',explicitFree:true,freeEvidencePath:'demo.price.free',rawPriceText:'Бесплатно в вымышленном сценарии',evidencePaths:['demo.price'],feeEvidencePaths:['demo.price.no_fees'],parsedConfidence:'HIGH'};
 return {...basePrice,kind:'KNOWN',currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,quoteMinMinor:'60000',quoteMaxMinor:'60000',feeMode:'NONE',explicitFree:false,rawPriceText:'600 ₽ в вымышленном сценарии',evidencePaths:['demo.price'],feeEvidencePaths:['demo.price.no_fees'],parsedConfidence:'HIGH'};
}
export function demoEventId(item:DemoItem){return `demo-v1-${item.id}`;}
export function demoSourceUrl(origin:string,item:DemoItem){return `${origin}/demo/source/${item.id}`;}
export function demoRecord(item:DemoItem,index:number,origin:string):SourceRecord {
 const eventId=demoEventId(item),price=sourcePrice(item.price);
 return {sourceId:DEMO_SOURCE_ID,providerId:DEMO_PROVIDER_ID,dataMode:'SYNTHETIC',providerEventId:eventId,requestId:'povod-demo-v1',recordOrdinal:index,
  fetchedAt:DEMO_FETCHED_AT,sourceUrl:demoSourceUrl(origin,item),responseSha256:hash(['povod-demo-v1',item]),apiVersion:'demo/v1',transformVersion:'demo/v1',rightsRevision:'owned-demo/v1',
  title:item.title,categories:[item.category],categoriesComplete:true,categoryMappingVerified:true,price,
  sessions:[{path:'sessions[0]',precision:'EXACT',startsAt:item.start,endsAt:item.end,timeZone:'Europe/Moscow',nativeSessionId:`demo-v1-${item.id}-session`,nativeIdVerified:true,
   place:{kind:'UNKNOWN',format:'OFFLINE',providerVenueId:null,venueName:null,address:null,coordinates:null,coordinateMeaning:'UNKNOWN',evidencePaths:[]},
   price:null,timePaths:['sessions[0].start'],timeEvidence:{startRaw:item.start},unsupportedReason:null}],lifecycle:'SCHEDULED'};
}
function candidateQuote(kind:DemoItem['price']):PriceQuote {
 const common={basis:'PER_PERSON' as const,currency:'RUB',extras:[],warnings:[],source_field:'demo.price'};
 if(kind==='FREE')return {kind:'FREE',...common,fees_known:true,fee_mode:'NONE',fee_evidence_ref:'demo.price.no_fees'};
 if(kind==='KNOWN')return {kind:'EXACT',exact_minor:'60000',...common,fees_known:true,fee_mode:'NONE',fee_evidence_ref:'demo.price.no_fees'};
 // Conditional T105 prices do not have a proven payable ceiling in the legacy search projection.
 return {kind:'UNKNOWN',...common,fees_known:false,fee_mode:'UNKNOWN',fee_evidence_ref:null,warnings:kind==='CONDITIONAL'?[{code:'DEMO_CONDITIONAL_PRICE',field:'price',message:'Условная цена; итог неизвестен.'}]:[]};
}
export function demoCandidate(item:DemoItem,index:number):Candidate {
 const eventId=demoEventId(item),observationId=hash(['povod-demo-v1',eventId]).slice(0,8)+'-'+hash(eventId).slice(0,4)+'-4'+hash(eventId).slice(5,8)+'-a'+hash(eventId).slice(9,12)+'-'+hash(eventId).slice(12,24);
 return parseCandidate({schema_version:'max.event-occurrence/3-candidate',ref:{kind:'EXTERNAL',provider_id:DEMO_PROVIDER_ID,event_id:eventId,occurrence_id:`demo-v1-${item.id}-session`,native_occurrence_id:null},
  untrusted_title:item.title,untrusted_description:'Вымышленное событие для демонстрации поиска и сохранения. Реальных выступлений, мест проведения и продажи билетов нет.',
  city_id:'msk',starts_at:new Date(item.start).toISOString(),ends_at:item.end?new Date(item.end).toISOString():null,time_precision:'EXACT_OCCURRENCE',categories:{known:[item.category],complete:true,mapping_verified:true},
  price:priceFromQuote(candidateQuote(item.price),observationId),inventory:{remaining:null,observed_at:null},indoor:null,wheelchair_accessible:null,status:'SCHEDULED',listing_state:'PRESENT',provider_health:'UNKNOWN',
  venue:{id:null,address:null,coordinates:null,coordinate_meaning:'UNKNOWN'},provenance:{observation_id:observationId,observed_at:DEMO_FETCHED_AT,fetched_at:DEMO_FETCHED_AT,provider_updated_at:null,source_url:null,payload_sha256:hash(['demo/v1',index,item]),transform_version:'demo-v1',field_sources:{date:['demo.start'],price:['demo.price'],place:['demo.place']},data_mode:'SYNTHETIC'},
  rights:{policy_id:'owned-demo',policy_revision:'v1',reviewed_at:'2026-09-24T00:00:00.000Z',review_due_at:DEMO_RIGHTS_DUE,revoked_at:null,display_facts:'ALLOWED',display_text:'ALLOWED',display_images:'DENIED',persist_minimal:'ALLOWED',ad_clearance:'CLEARED',evidence_refs:['TEAM_AUTHORED_DEMO_V1']},
  warnings:[{code:'FICTIONAL_DEMO',field:'event',message:DEMO_NOTICE}]});
}
