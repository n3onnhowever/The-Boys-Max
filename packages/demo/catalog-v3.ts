import {hash,type SourcePrice,type SourceRecord} from '../domain/event.ts';
import {priceFromQuote} from '../../modules/search/core/price.ts';
import {parseCandidate} from '../../modules/search/core/candidate.ts';
import type {Candidate,PriceQuote} from '../../modules/search/core/types.ts';
import {DEMO_NOTICE} from './constants.ts';
export {DEMO_NOTICE} from './constants.ts';

export const DEMO_VERSION='v3';
export const DEMO_SOURCE_ID='synthetic:povod-demo:v3';
export const DEMO_PROVIDER_ID='ManualProvider';
export const DEMO_REFERENCE_DATE='2026-09-30';
export const DEMO_FETCHED_AT='2026-09-29T21:30:00.000Z';
export const DEMO_RIGHTS_DUE='2027-03-20T00:00:00.000Z';
type Category='CINEMA'|'THEATRE'|'CONCERT'|'MUSEUM'|'SPORT'|'OUTDOOR'|'VOLUNTEER'|'OTHER';
type PriceCase='FREE'|'CONDITIONAL'|'UNKNOWN'|`EXACT:${number}`|`RANGE:${number}-${number}`|`FROM:${number}`;
export type DemoItem={id:string;title:string;category:Category;start:string;venue:string;price:PriceCase};
type Row=[id:string,title:string,category:Category,date:string,time:string,venue:string,price:PriceCase];
/** Fixed, team-authored scenarios. Venue names and all dates are fictional. */
const rows:readonly Row[]=[
 ['morning-shorts','Короткое кино за утренним кофе','CINEMA','2026-09-30','11:00','Световой зал','FREE'],
 ['city-frames','Город в шести кадрах','CINEMA','2026-10-02','14:00','Экранный двор','EXACT:300'],
 ['silent-journey','Путешествие немого кино','CINEMA','2026-10-03','19:30','Световой зал','EXACT:500'],
 ['night-premiere','Ночная программа короткометражек','CINEMA','2026-10-09','22:15','Экранный двор','EXACT:900'],
 ['family-film','Семейный киноальманах','CINEMA','2026-10-16','16:00','Лаборатория историй','RANGE:700-1200'],
 ['animation-lab','Открытый показ анимационных эскизов','CINEMA','2026-10-24','20:00','Световой зал','UNKNOWN'],
 ['paper-theatre','Театр бумажных миров','THEATRE','2026-10-01','10:30','Бумажная сцена','FREE'],
 ['one-act','Три истории в одном акте','THEATRE','2026-10-03','13:00','Бумажная сцена','EXACT:700'],
 ['shadow-stage','Сцена теней и света','THEATRE','2026-10-07','18:30','Лаборатория историй','EXACT:1200'],
 ['night-monologue','Монологи после десяти','THEATRE','2026-10-10','22:30','Камерная сцена','EXACT:2000'],
 ['family-stage','Семейная мастерская театра','THEATRE','2026-10-18','15:00','Бумажная сцена','FROM:500'],
 ['improv-stage','Открытая импровизационная сцена','THEATRE','2026-10-25','19:00','Камерная сцена','CONDITIONAL'],
 ['acoustic-morning','Акустическое утро','CONCERT','2026-10-01','09:30','Музыкальный чердак','FREE'],
 ['strings-day','Струнные истории','CONCERT','2026-10-04','14:00','Музыкальный чердак','EXACT:1500'],
 ['electronic-evening','Вечер электронной музыки','CONCERT','2026-10-08','19:00','Звуковая мастерская','EXACT:2500'],
 ['midnight-jazz','Джаз после десяти','CONCERT','2026-10-11','22:15','Звуковая мастерская','EXACT:3500'],
 ['choir-workshop','Голоса города: концерт и мастерская','CONCERT','2026-10-17','16:00','Музыкальный чердак','RANGE:900-1500'],
 ['synth-sketches','Синтезаторные эскизы','CONCERT','2026-10-27','20:00','Звуковая мастерская','UNKNOWN'],
 ['color-study','Цвет и форма: открытая галерея','MUSEUM','2026-09-30','12:30','Галерея эскизов','FREE'],
 ['little-archive','Маленький архив больших идей','MUSEUM','2026-10-05','11:00','Галерея эскизов','EXACT:500'],
 ['light-collection','Коллекция световых объектов','MUSEUM','2026-10-09','17:00','Павильон цвета','EXACT:900'],
 ['evening-exhibition','Вечерняя выставка движущихся форм','MUSEUM','2026-10-13','19:30','Павильон цвета','EXACT:1200'],
 ['art-route','Маршрут по вымышленной экспозиции','MUSEUM','2026-10-21','14:00','Галерея эскизов','FROM:300'],
 ['archive-night','Ночь в архиве фантазий','MUSEUM','2026-10-28','22:00','Павильон цвета','CONDITIONAL'],
 ['park-warmup','Зарядка в демонстрационном парке','SPORT','2026-09-30','09:00','Площадка движения','FREE'],
 ['table-tennis','Турнир настольного тенниса','SPORT','2026-10-03','12:00','Площадка движения','EXACT:300'],
 ['climbing-basics','Основы скалолазания в зале','SPORT','2026-10-06','16:00','Зал ритма','EXACT:1500'],
 ['team-relay','Городская командная эстафета','SPORT','2026-10-10','18:00','Площадка движения','EXACT:700'],
 ['late-badminton','Поздний бадминтон','SPORT','2026-10-16','22:15','Зал ритма','RANGE:500-900'],
 ['dance-training','Открытая тренировка по танцу','SPORT','2026-10-24','13:00','Зал ритма','UNKNOWN'],
 ['dawn-walk','Прогулка на рассвете','OUTDOOR','2026-10-01','08:00','Тропа облаков','FREE'],
 ['sketch-walk','Прогулка с городскими зарисовками','OUTDOOR','2026-10-04','11:30','Тропа облаков','EXACT:500'],
 ['garden-quest','Квест по воображаемому саду','OUTDOOR','2026-10-07','15:00','Сад маршрутов','EXACT:900'],
 ['sunset-route','Маршрут на закате','OUTDOOR','2026-10-11','18:00','Сад маршрутов','EXACT:1200'],
 ['lantern-walk','Прогулка с фонарями','OUTDOOR','2026-10-17','22:00','Тропа облаков','FROM:300'],
 ['autumn-observation','Наблюдение за осенним небом','OUTDOOR','2026-10-25','13:30','Сад маршрутов','CONDITIONAL'],
 ['helping-hands','Утро добрых дел','VOLUNTEER','2026-09-30','10:00','Штаб добрых идей','FREE'],
 ['book-sorting','Сортировка книг для учебного проекта','VOLUNTEER','2026-10-03','14:00','Штаб добрых идей','FREE'],
 ['green-corner','Уход за демонстрационным зелёным уголком','VOLUNTEER','2026-10-06','17:00','Мастерская участия','FREE'],
 ['evening-helpers','Вечерняя команда поддержки','VOLUNTEER','2026-10-12','19:00','Мастерская участия','FREE'],
 ['night-packaging','Поздняя сборка учебных наборов','VOLUNTEER','2026-10-16','22:00','Штаб добрых идей','FREE'],
 ['community-day','День соседской помощи','VOLUNTEER','2026-10-24','12:00','Мастерская участия','UNKNOWN'],
 ['idea-breakfast','Завтрак необычных идей','OTHER','2026-10-01','10:00','Лаборатория историй','FREE'],
 ['boardgame-day','День настольных игр','OTHER','2026-10-04','13:00','Клуб открытий','EXACT:500'],
 ['craft-evening','Вечер бумажных мастерских','OTHER','2026-10-08','18:30','Клуб открытий','EXACT:2000'],
 ['story-night','Ночь городских историй','OTHER','2026-10-10','22:00','Лаборатория историй','EXACT:5000'],
 ['makers-weekend','Выходные маленьких изобретений','OTHER','2026-10-18','15:00','Клуб открытий','RANGE:300-700'],
 ['ideas-festival','Фестиваль придуманных маршрутов','OTHER','2026-10-28','20:00','Лаборатория историй','CONDITIONAL'],
];
export const DEMO_ITEMS:readonly DemoItem[]=rows.map(([id,title,category,date,time,venue,price])=>({id,title,category,start:`${date}T${time}:00+03:00`,venue,price}));
const basePrice:SourcePrice={kind:'UNKNOWN',currency:null,basis:'UNKNOWN',evidenceScope:'UNKNOWN',scopeAppliesToOccurrence:null,quoteMinMinor:null,quoteMaxMinor:null,feeMode:'UNKNOWN',explicitFree:null,mandatoryExtras:[],conditions:[],rawPriceText:null,evidencePaths:[],feeEvidencePaths:[],freeEvidencePath:null,parsedConfidence:'UNKNOWN'};
const minor=(n:number)=>(n*100).toString();
function parsedPrice(value:PriceCase){
 if(value.startsWith('EXACT:')){const n=Number(value.slice(6));return {kind:'KNOWN' as const,min:minor(n),max:minor(n),label:`${n} ₽`};}
 if(value.startsWith('RANGE:')){const [lo,hi]=value.slice(6).split('-').map(Number);return {kind:'RANGE' as const,min:minor(lo!),max:minor(hi!),label:`${lo}–${hi} ₽`};}
 if(value.startsWith('FROM:')){const n=Number(value.slice(5));return {kind:'FROM' as const,min:minor(n),max:null,label:`от ${n} ₽`};}
 return null;
}
function sourcePrice(value:PriceCase):SourcePrice{
 if(value==='UNKNOWN')return {...basePrice};
 if(value==='CONDITIONAL')return {...basePrice,kind:'KNOWN',currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,quoteMinMinor:'50000',quoteMaxMinor:'50000',conditions:['Демонстрационная условная цена; итог зависит от вымышленного условия'],rawPriceText:'Условно 500 ₽',evidencePaths:['demo.price'],parsedConfidence:'HIGH'};
 if(value==='FREE')return {...basePrice,kind:'FREE',currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,quoteMinMinor:'0',quoteMaxMinor:'0',feeMode:'NONE',explicitFree:true,freeEvidencePath:'demo.price.free',rawPriceText:'Бесплатно в демонстрационном сценарии',evidencePaths:['demo.price'],feeEvidencePaths:['demo.price.no_fees'],parsedConfidence:'HIGH'};
 const p=parsedPrice(value)!;return {...basePrice,kind:p.kind,currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,quoteMinMinor:p.min,quoteMaxMinor:p.max,feeMode:p.kind==='FROM'?'UNKNOWN':'NONE',explicitFree:false,rawPriceText:`${p.label} в демонстрационном сценарии`,evidencePaths:['demo.price'],feeEvidencePaths:p.kind==='FROM'?[]:['demo.price.no_fees'],parsedConfidence:'HIGH'};
}
function candidateQuote(value:PriceCase):PriceQuote{
 const common={basis:'PER_PERSON' as const,currency:'RUB',extras:[],warnings:[],source_field:'demo.price'};
 if(value==='FREE')return {kind:'FREE',...common,fees_known:true,fee_mode:'NONE',fee_evidence_ref:'demo.price.no_fees'};
 const p=parsedPrice(value);
 if(p?.kind==='KNOWN')return {kind:'EXACT',exact_minor:p.min,...common,fees_known:true,fee_mode:'NONE',fee_evidence_ref:'demo.price.no_fees'};
 if(p?.kind==='RANGE')return {kind:'RANGE',min_minor:p.min,max_minor:p.max,...common,fees_known:true,fee_mode:'NONE',fee_evidence_ref:'demo.price.no_fees'};
 if(p?.kind==='FROM')return {kind:'FROM',min_minor:p.min,...common,fees_known:false,fee_mode:'UNKNOWN',fee_evidence_ref:null};
 return {kind:'UNKNOWN',...common,fees_known:false,fee_mode:'UNKNOWN',fee_evidence_ref:null,warnings:value==='CONDITIONAL'?[{code:'DEMO_CONDITIONAL_PRICE',field:'price',message:'Условная цена; итог неизвестен.'}]:[]};
}
export function demoEventId(item:DemoItem){return `demo-v3-${item.id}`;}
export function demoSourceUrl(origin:string,item:DemoItem){return `${origin}/demo/source/v3/${item.id}`;}
export function demoRecord(item:DemoItem,index:number,origin:string):SourceRecord{
 const eventId=demoEventId(item);return {sourceId:DEMO_SOURCE_ID,providerId:DEMO_PROVIDER_ID,dataMode:'SYNTHETIC',providerEventId:eventId,requestId:'povod-demo-v3',recordOrdinal:index,
  fetchedAt:DEMO_FETCHED_AT,sourceUrl:demoSourceUrl(origin,item),responseSha256:hash(['povod-demo-v3',item]),apiVersion:'demo/v3',transformVersion:'demo/v3',rightsRevision:'owned-demo/v3',
  title:item.title,categories:[item.category],categoriesComplete:true,categoryMappingVerified:true,price:sourcePrice(item.price),
  sessions:[{path:'sessions[0]',precision:'EXACT',startsAt:item.start,endsAt:null,timeZone:'Europe/Moscow',nativeSessionId:`demo-v3-${item.id}-session`,nativeIdVerified:true,
   place:{kind:'VENUE',format:'OFFLINE',providerVenueId:`synthetic:${hash(item.venue).slice(0,16)}`,venueName:`Демо-площадка «${item.venue}»`,address:`Демо-площадка «${item.venue}» (вымышленное место, Москва)`,coordinates:null,coordinateMeaning:'UNKNOWN',evidencePaths:['demo.venue']},
   price:null,timePaths:['sessions[0].start'],timeEvidence:{startRaw:item.start},unsupportedReason:null}],lifecycle:'SCHEDULED'};
}
export function demoCandidate(item:DemoItem,index:number):Candidate{
 const eventId=demoEventId(item),observationId=hash(['povod-demo-v3',eventId]).slice(0,8)+'-'+hash(eventId).slice(0,4)+'-4'+hash(eventId).slice(5,8)+'-a'+hash(eventId).slice(9,12)+'-'+hash(eventId).slice(12,24);
 return parseCandidate({schema_version:'max.event-occurrence/3-candidate',ref:{kind:'EXTERNAL',provider_id:DEMO_PROVIDER_ID,event_id:eventId,occurrence_id:`demo-v3-${item.id}-session`,native_occurrence_id:null},
  untrusted_title:item.title,untrusted_description:`Демо-каталог: вымышленное событие на площадке «${item.venue}». Реального мероприятия, адреса, продажи билетов и доступности нет.`,
  city_id:'msk',starts_at:new Date(item.start).toISOString(),ends_at:null,time_precision:'EXACT_OCCURRENCE',categories:{known:[item.category],complete:true,mapping_verified:true},
  price:priceFromQuote(candidateQuote(item.price),observationId),inventory:{remaining:null,observed_at:null},indoor:null,wheelchair_accessible:null,status:'SCHEDULED',listing_state:'PRESENT',provider_health:'UNKNOWN',
  venue:{id:`synthetic:${hash(item.venue).slice(0,16)}`,address:`Демо-площадка «${item.venue}» (вымышленное место, Москва)`,coordinates:null,coordinate_meaning:'UNKNOWN'},
  provenance:{observation_id:observationId,observed_at:DEMO_FETCHED_AT,fetched_at:DEMO_FETCHED_AT,provider_updated_at:null,source_url:null,payload_sha256:hash(['demo/v3',index,item]),transform_version:'demo-v3',field_sources:{date:['demo.start'],price:['demo.price'],place:['demo.venue']},data_mode:'SYNTHETIC'},
  rights:{policy_id:'owned-demo',policy_revision:'v3',reviewed_at:'2026-09-29T21:00:00.000Z',review_due_at:DEMO_RIGHTS_DUE,revoked_at:null,display_facts:'ALLOWED',display_text:'ALLOWED',display_images:'DENIED',persist_minimal:'ALLOWED',ad_clearance:'CLEARED',evidence_refs:['TEAM_AUTHORED_DEMO_V3']},
  warnings:[{code:'FICTIONAL_DEMO',field:'event',message:DEMO_NOTICE}]});
}
