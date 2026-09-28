import type {Candidate,Price,Money,SearchIntent,SemanticContext} from '../search/core/types.ts';
import {parsePrice} from '../search/core/price.ts';
import {validateIntent,draftForManualConfirmation} from '../search/core/search.ts';
import {validateCandidate} from '../ai/provider/validation.ts';
import {rublesToMinor} from '../ai/provider/manual.ts';
import {occurrenceGeoView} from '../maps/component/core/event-adapter.ts';
import type {GeoMapView,GeoSource} from '../maps/component/core/geo.ts';
import type {ParseContext} from '../ai/provider/types.ts';
import type {SearchDraft as UiDraft,PriceView} from '../../apps/miniapp/src/port/contracts.ts';
import type {SourceSnapshot,Terms} from '../../packages/contracts/domain.ts';
import {requireThat} from '../../packages/domain/errors.ts';
import {searchWords} from './text-search.ts';
export const cities=new Map([
 ['msk',{label:'Москва',timezones:['Europe/Moscow']}],
 ['spb',{label:'Санкт-Петербург',timezones:['Europe/Moscow']}]
]);
export function context(now=new Date().toISOString()):SemanticContext {return {now_utc:now,cities,max_future_days:180,freshness_ttl_seconds:3600,inventory_ttl_seconds:300};}
export const blankDraft=():UiDraft=>({text:'',city:'',date:'',startLocal:'',endLocal:'',timeZone:'',excludeCategories:[],includedCategories:[],participants:'',budgetText:'',budgetCurrency:'RUB',priceBasis:'UNKNOWN'});
export const defaultIntent=():SearchIntent=>({city:null,date:null,timezone:null,time_window:null,included_categories:[],excluded_categories:[],interested_count:null,inventory_requirement:{kind:'NOT_REQUESTED'},budget:null,indoor:null,wheelchair_required:null});
export function fromUiDraft(d:UiDraft,ctx:SemanticContext):SearchIntent {
 searchWords(d.text); // Literal catalog text is applied in browse; structured terms remain hard constraints.
 const i=defaultIntent(),city=[...ctx.cities].find(([id,c])=>id===d.city.trim()||c.label.toLocaleLowerCase('ru')===d.city.trim().toLocaleLowerCase('ru'));
 if(d.city.trim()){requireThat(city,'CITY_NEEDS_RESOLUTION',422);i.city={id:city[0],label:city[1].label};}
 i.timezone=d.timeZone.trim()||null;
 if(d.date)i.date={kind:'EXACT',on:d.date};
 if(d.startLocal||d.endLocal){requireThat(d.startLocal&&d.endLocal,'TIME_WINDOW_INCOMPLETE',422);i.time_window={start:d.startLocal,end:d.endLocal,end_day_offset:0,mode:'STARTS_WITHIN'};}
 i.included_categories=d.includedCategories as SearchIntent['included_categories'];
 i.excluded_categories=d.excludeCategories as SearchIntent['excluded_categories'];
 if(d.participants){requireThat(/^[1-9]\d{0,2}$/.test(d.participants),'SEARCH_QUANTITY',422);i.interested_count=Number(d.participants);}
 if(d.budgetText){requireThat(d.priceBasis!=='UNKNOWN','PRICE_BASIS_REQUIRED',422);i.budget={max_minor:rublesToMinor(d.budgetText),currency:d.budgetCurrency,basis:d.priceBasis};}
 return validateIntent(i,ctx);
}
/** Model20 supplies a draft only. Capability and explicit confirmation are subsequent operations. */
export function fromAiCandidate(raw:unknown,parseContext:ParseContext,ctx:SemanticContext) {
 const validation=validateCandidate(raw,parseContext);
 requireThat(validation.schema_ok&&validation.semantic_ok&&validation.candidate?.state==='DRAFT','AI_DRAFT_NEEDS_CLARIFICATION',422);
 const c=validation.candidate!,{party_size,require_available,...rest}=c.intent;
 requireThat(rest.budget===null||rest.budget.basis!=='UNKNOWN','PRICE_BASIS_REQUIRED',422);
 requireThat(require_available!==true||party_size!==null,'INVENTORY_QUANTITY_REQUIRED',422);
 const hard=validateIntent({...rest,interested_count:party_size,inventory_requirement:require_available===true?{kind:'AT_LEAST',quantity:party_size}:{kind:'NOT_REQUESTED'}},ctx);
 return draftForManualConfirmation(hard);
}
function minorLabel(value:string):string {
 const padded=value.padStart(3,'0');return padded.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,' ') + (padded.endsWith('00')?'':','+padded.slice(-2));
}
export function moneyLabel(m:Money):string|null {
 if(m.knownness==='UNKNOWN')return null;
 const currency=m.currency==='RUB'?'₽':m.currency??'валюта не указана';
 if(m.amount.kind==='FREE')return 'Бесплатно';
 return m.amount.kind==='EXACT'?`${minorLabel(m.amount.exact_minor)} ${currency}`:`${minorLabel(m.amount.min_minor)}–${minorLabel(m.amount.max_minor)} ${currency}`;
}
/** Display only, no recalculation of total and no basis/quantity conversion. */
export function priceView(raw:Price):PriceView {
 const p=parsePrice(raw),basis=p.total_price.basis;
 return {baseLabel:(p.quoted_amount_role==='ALL_IN'?'Тариф уже включает обязательные сборы: ':'Базовая цена: ')+(moneyLabel(p.base_price)??'неизвестна'),
  totalLabel:moneyLabel(p.total_price),basisLabel:basis==='PER_PERSON'?'На человека':basis==='GROUP_TOTAL'?'На компанию':'Основание цены неизвестно',fees_known:p.fees_known,warnings:p.warnings.map(w=>w.message)};
}
/** Missing name/city are explicit nulls, never names invented from addresses or IDs. */
export function geoView(c:Candidate,ctx:SemanticContext):GeoMapView {
 const source:GeoSource={kind:c.provenance.data_mode==='LIVE'?'PROVIDER':'UNKNOWN',provider:c.provenance.data_mode==='LIVE'?c.ref.provider_id:null,record_id:c.venue.id,source_url:c.provenance.source_url,observed_at:c.provenance.observed_at,rights_profile_id:c.rights.policy_id};
 const venue={...c.venue,name:null,city:c.city_id?ctx.cities.get(c.city_id)?.label??null:null,
  address:c.venue.address?.replace(/\s+/g,' ').trim().slice(0,300)||null};
 return occurrenceGeoView({...c,venue},{text_source:source,position_source:c.venue.coordinates?source:null,precision:c.venue.coordinate_meaning==='VENUE'?'VENUE':'UNKNOWN',axis_order:'NAMED_LAT_LON',address_status:'UNVERIFIED',disclosure:{basemap:'BLOCK',navigation:'BLOCK'}});
}
export function sourceSnapshot(c:Candidate):SourceSnapshot {
 return structuredClone({ref:c.ref,provenance:c.provenance,price:c.price,venue:c.venue,rights:c.rights,warnings:c.warnings,starts_at:c.starts_at,ends_at:c.ends_at});
}
export function candidateTerms(c:Candidate,ctx:SemanticContext):Terms {
 return {title:c.untrusted_title.slice(0,160),activityIdentity:`${c.ref.provider_id}:${c.ref.event_id}:${c.ref.occurrence_id}`.slice(0,160),startsAt:c.starts_at,endsAt:c.ends_at,timeZone:c.city_id?ctx.cities.get(c.city_id)?.timezones[0]??'UTC':'UTC',place:c.venue.address,participationUrl:c.provenance.source_url,obligations:'',price:structuredClone(c.price),warnings:[...new Set([...c.warnings,...c.price.warnings].map(w=>w.code+': '+w.message))]};
}
export function wallTime(instant:string,zone:string):string {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
 const p=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
/** Reject ambiguous/nonexistent wall times rather than choose a DST offset silently. */
export function uniqueInstant(local:string,zone:string):string {
 requireThat(/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(local),'LOCAL_TIME_FORMAT',422);
 const center=Date.parse(local+':00Z');requireThat(Number.isFinite(center),'LOCAL_TIME_FORMAT',422);
 const offsets=new Set<number>();
 for(let h=-36;h<=36;h+=6){const utc=center+h*3600000;offsets.add(Date.parse(wallTime(new Date(utc).toISOString(),zone)+':00Z')-utc);}
 const matching=[...offsets].map(offset=>new Date(center-offset).toISOString()).filter(value=>wallTime(value,zone)===local);
 requireThat(matching.length===1,'LOCAL_TIME_AMBIGUOUS_OR_MISSING',422);return matching[0]!;
}
