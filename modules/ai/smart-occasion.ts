import {z} from 'zod';
import {CATEGORIES,type Candidate,type Category,type Eligibility,type SearchIntent} from '../search/core/types.ts';
import {dateEpoch,localDate,plusDays} from '../search/core/time.ts';
import {defaultIntent,context} from '../integration/projections.ts';
import {validateIntent} from '../search/core/search.ts';
import type {SearchDraft} from '../../apps/miniapp/src/port/contracts.ts';

export const SMART_INTENT_VERSION='smart-occasion-intent/1' as const;
const hard=z.enum(['DATE','TIME','CATEGORY','BUDGET','FREE','CITY']);
const soft=z.enum(['NEARBY','MOOD','SOCIAL_CONTEXT','INTEREST']);
const date=z.union([z.iso.date(),z.enum(['TODAY','TOMORROW','WEEKEND'])]);
export const smartIntentSchema=z.strictObject({
 query_text:z.string().max(240),date_from:date.nullable(),date_to:date.nullable(),
 daypart:z.enum(['MORNING','DAY','EVENING','NIGHT']).nullable(),
 categories:z.array(z.enum(CATEGORIES)).max(8),interests:z.array(z.string().trim().min(1).max(40)).max(8),
 budget_max:z.number().int().min(0).max(1000000).nullable(),free_only:z.boolean(),
 city:z.string().trim().min(1).max(80).nullable(),radius_preference:z.enum(['NEARBY','ANY']).nullable(),
 social_context:z.enum(['SOLO','PAIR','GROUP']).nullable(),party_size:z.number().int().min(1).max(100).nullable(),
 mood_tags:z.array(z.string().trim().min(1).max(40)).max(8),
 hard_constraints:z.array(hard).max(6),soft_preferences:z.array(soft).max(4),
 clarification_required:z.boolean(),clarification_question:z.string().trim().min(1).max(200).nullable()
});
export type SmartIntent=z.infer<typeof smartIntentSchema>;
export type BudgetBasis='PER_PERSON'|'GROUP_TOTAL';
export interface SmartProposal {schema_version:typeof SMART_INTENT_VERSION;draft:SmartIntent;clarification:{code:'BUDGET_BASIS'|'UNSUPPORTED_CITY'|'HARD_AMBIGUITY';question:string}|null}
const cityNames:Readonly<Record<string,string>>={'москва':'msk','moscow':'msk','санкт-петербург':'spb','санкт петербург':'spb','спб':'spb'};
const dayparts={MORNING:['06:00','12:00'],DAY:['12:00','18:00'],EVENING:['18:00','23:00'],NIGHT:['23:00','06:00']} as const;
const categoryEvidence:Readonly<Record<Category,RegExp>>={CINEMA:/кино|фильм/iu,THEATRE:/театр|спектакл/iu,CONCERT:/концерт|музык/iu,MUSEUM:/выстав|музе/iu,SPORT:/спорт|матч/iu,OUTDOOR:/прогул|парк/iu,VOLUNTEER:/волонт/iu,OTHER:/другое/iu};
const interestEvidence:Readonly<Record<string,RegExp>>={'выставки':/выстав|музе/iu,'искусство':/искусств|худож/iu,'музыка':/музык|концерт/iu,'театр':/театр|спектакл/iu,'кино':/кино|фильм/iu,'спорт':/спорт|матч/iu};
const norm=(s:string)=>s.toLocaleLowerCase('ru-RU').replaceAll('ё','е').trim();
function resolvedDate(value:string,now:string):{from:string;to:string}{
 const today=localDate(now,'Europe/Moscow');
 if(value==='TODAY')return {from:today,to:today};
 if(value==='TOMORROW'){const d=plusDays(today,1);return {from:d,to:d};}
 if(value==='WEEKEND'){
  const weekday=new Date(dateEpoch(today)).getUTCDay();
  if(weekday===0)return {from:today,to:today};
  const untilSaturday=(6-weekday+7)%7;
  const saturday=plusDays(today,untilSaturday);
  return {from:saturday,to:plusDays(saturday,1)};
 }
 dateEpoch(value);return {from:value,to:value};
}
export function reviewDates(proposal:SmartProposal,now:string):{dateFrom:string|null;dateTo:string|null}{
 const d=proposal.draft;if(!d.date_from)return {dateFrom:null,dateTo:null};
 return {dateFrom:resolvedDate(d.date_from,now).from,dateTo:resolvedDate(d.date_to??d.date_from,now).to};
}
/** All canonical values are resolved here, never accepted as model IDs. */
export function validateSmartProposal(raw:unknown,request:string,now:string):SmartProposal{
 const d={...smartIntentSchema.parse(typeof raw==='string'?JSON.parse(raw) as unknown:raw),query_text:request};
 if(request.length<1||request.length>240)throw new Error('AI_INPUT_LENGTH');
 if(d.free_only&&d.budget_max!==null)throw new Error('AI_BUDGET_CONFLICT');
 if(d.date_to&&!d.date_from||d.daypart&&!d.date_from)throw new Error('AI_DATE_REQUIRED');
 if(d.date_from&&d.date_to&&['TODAY','TOMORROW','WEEKEND'].includes(d.date_from)&&d.date_from!==d.date_to)throw new Error('AI_DATE_CONFLICT');
 if(d.date_from&&d.date_to&&!['TODAY','TOMORROW','WEEKEND'].includes(d.date_from)&&!['TODAY','TOMORROW','WEEKEND'].includes(d.date_to)&&dateEpoch(d.date_to)<dateEpoch(d.date_from))throw new Error('AI_DATE_ORDER');
 if(d.date_from){const from=resolvedDate(d.date_from,now).from,to=resolvedDate(d.date_to??d.date_from,now).to,today=localDate(now,'Europe/Moscow');
  if(dateEpoch(from)<dateEpoch(today)||dateEpoch(to)<dateEpoch(from)||dateEpoch(to)-dateEpoch(from)>30*86400000||dateEpoch(to)>dateEpoch(today)+180*86400000)throw new Error('AI_DATE_BOUNDS');}
 const wording=norm(request);
 if(wording.includes('сегодня')&&d.date_from&&d.date_from!=='TODAY'||wording.includes('завтра')&&d.date_from&&d.date_from!=='TOMORROW'||wording.includes('выходн')&&d.date_from&&d.date_from!=='WEEKEND')throw new Error('AI_DATE_TOKEN_REQUIRED');
 if(d.daypart&&!({MORNING:/утр/iu,DAY:/дн|днем|днём/iu,EVENING:/вечер/iu,NIGHT:/ноч/iu}[d.daypart].test(request)))throw new Error('AI_UNREQUESTED_TIME');
 if(d.party_size===2&&!/вдвоем|вдвоём|на двоих|для двоих/iu.test(request))throw new Error('AI_UNREQUESTED_PARTY_SIZE');
 if(d.social_context==='PAIR'&&d.party_size!==2||d.social_context==='SOLO'&&d.party_size!==null&&d.party_size!==1)throw new Error('AI_SOCIAL_CONFLICT');
 if(new Set(d.categories).size!==d.categories.length||new Set(d.hard_constraints).size!==d.hard_constraints.length||new Set(d.soft_preferences).size!==d.soft_preferences.length)throw new Error('AI_DUPLICATE');
 const budgetMention=/(?:^|\s)(?:до|не дороже|не больше|максимум|бюджет)\s*(\d[\d\s]{0,8})/iu.exec(request);
 const explicitlyFree=/бесплатн|даром/iu.test(request);
 if(d.budget_max!==null&&(!budgetMention||Number(budgetMention[1]!.replace(/\s/g,''))!==d.budget_max)||d.free_only&&!explicitlyFree)throw new Error('AI_UNREQUESTED_PRICE');
 if(d.hard_constraints.includes('BUDGET')!==Boolean(d.budget_max!==null)||d.hard_constraints.includes('FREE')!==d.free_only)throw new Error('AI_HARD_MISMATCH');
 if(d.hard_constraints.includes('CATEGORY')!==Boolean(d.categories.length)||d.hard_constraints.includes('DATE')!==Boolean(d.date_from)||d.hard_constraints.includes('TIME')!==Boolean(d.daypart)||d.hard_constraints.includes('CITY')!==Boolean(d.city))throw new Error('AI_HARD_MISMATCH');
 if(d.categories.some(category=>!categoryEvidence[category].test(request)))throw new Error('AI_UNREQUESTED_CATEGORY');
 if(d.interests.some(value=>!wording.includes(norm(value))&&!interestEvidence[norm(value)]?.test(request)))throw new Error('AI_UNREQUESTED_INTEREST');
 if(d.date_from&&!/сегодня|завтра|выходн|\d{4}-\d{2}-\d{2}/iu.test(request))throw new Error('AI_UNREQUESTED_DATE');
 if(d.date_from&&/^20\d{2}-/.test(d.date_from)&&!request.includes(d.date_from))throw new Error('AI_UNREQUESTED_DATE');
 if(d.city){const city=norm(d.city),mentioned=city==='москва'||city==='moscow'?/москв|moscow/iu.test(request):city==='спб'||city.includes('петербург')?/санкт[- ]петербург|петербурге|спб/iu.test(request):wording.includes(city);if(!mentioned)throw new Error('AI_UNREQUESTED_CITY');}
 if(d.city&&!['москва','moscow'].includes(norm(d.city)))return {schema_version:SMART_INTENT_VERSION,draft:d,clarification:{code:'UNSUPPORTED_CITY',question:'Сейчас доступны подтверждённые события только в Москве. Изменить город на Москву?'}};
 if(d.budget_max!==null&&d.party_size!==null&&d.party_size>1)return {schema_version:SMART_INTENT_VERSION,draft:d,clarification:{code:'BUDGET_BASIS',question:`${d.budget_max} ₽ — на ${d.party_size===2?'двоих':'всех'} или на человека?`}};
 if(d.clarification_required)return {schema_version:SMART_INTENT_VERSION,draft:d,clarification:{code:'HARD_AMBIGUITY',question:'Уточните, какое условие поиска для вас обязательно.'}};
 if(d.city&&cityNames[norm(d.city)]!=='msk')throw new Error('AI_UNSUPPORTED_CITY');
 return {schema_version:SMART_INTENT_VERSION,draft:d,clarification:null};
}
export function smartToSearch(proposal:SmartProposal,basis:BudgetBasis|null,now:string):{intent:SearchIntent;draft:SearchDraft}{
 if(proposal.clarification?.code!=='BUDGET_BASIS'&&proposal.clarification)throw new Error('AI_CLARIFICATION_REQUIRED');
 const d=proposal.draft;
 if(d.budget_max!==null&&d.party_size!==null&&d.party_size>1&&!basis)throw new Error('AI_BUDGET_BASIS_REQUIRED');
 const i=defaultIntent();i.city=d.city?{id:'msk',label:'Москва'}:null;i.timezone='Europe/Moscow';
 if(d.date_from){const from=resolvedDate(d.date_from,now).from,to=resolvedDate(d.date_to??d.date_from,now).to;
  i.date=from===to?{kind:'EXACT',on:from}:{kind:'RANGE',from,through:to};}
 if(d.daypart){const [start,end]=dayparts[d.daypart];i.time_window={start,end,end_day_offset:d.daypart==='NIGHT'?1:0,mode:'STARTS_WITHIN'};}
 i.included_categories=d.categories as Category[];i.interested_count=d.party_size;
 if(d.budget_max!==null)i.budget={max_minor:String(d.budget_max*100),currency:'RUB',basis:basis??'PER_PERSON'};
 if(d.free_only)i.budget={max_minor:'0',currency:'RUB',basis:'PER_PERSON'};
 validateIntent(i,context(now));
 const draft:SearchDraft={text:'',city:i.city?.id??'',date:i.date?.kind==='EXACT'?i.date.on:i.date?.from??'',dateThrough:i.date?.kind==='RANGE'?i.date.through:undefined,freeOnly:d.free_only,smartInterests:d.interests,startLocal:i.time_window?.start??'',endLocal:i.time_window?.end??'',timeZone:'Europe/Moscow',excludeCategories:[],includedCategories:[...i.included_categories],participants:i.interested_count?String(i.interested_count):'',budgetText:i.budget?String(Number(i.budget.max_minor)/100):'',budgetCurrency:'RUB',priceBasis:i.budget?.basis??'UNKNOWN'};
 return {intent:i,draft};
}
export type ReasonCode='CATEGORY_MATCH'|'TIME_MATCH'|'BUDGET_FIT'|'INTEREST_MATCH';
const reasonCopy:Readonly<Record<ReasonCode,string>>={CATEGORY_MATCH:'Подходит по выбранной категории',TIME_MATCH:'Подходит по выбранному времени',BUDGET_FIT:'Цена укладывается в бюджет',INTEREST_MATCH:'Соответствует сохранённому интересу'};
export function allowedReasons(candidate:Candidate,eligibility:Eligibility,request:SearchIntent,savedInterests:readonly string[],requestedInterests:readonly string[]=[]):{code:ReasonCode;text:string;observation_id:string;check:string;source:'request'|'saved_preference'}[]{
 if(eligibility.status!=='PASS')return [];
 const pass=(field:string)=>eligibility.checks.some(c=>c.field===field&&c.status==='PASS');
 const codes:ReasonCode[]=[];
 if(request.included_categories.length&&candidate.categories.mapping_verified&&pass('included_categories'))codes.push('CATEGORY_MATCH');
 if(request.time_window&&pass('time'))codes.push('TIME_MATCH');
 if(request.budget&&pass('budget'))codes.push('BUDGET_FIT');
 if([...savedInterests,...requestedInterests].some(v=>v==='Выставки')&&candidate.categories.mapping_verified&&candidate.categories.known.includes('MUSEUM'))codes.push('INTEREST_MATCH');
 return codes.map(code=>({code,text:reasonCopy[code],observation_id:candidate.provenance.observation_id,check:code==='CATEGORY_MATCH'?'included_categories:PASS':code==='TIME_MATCH'?'time:PASS':code==='BUDGET_FIT'?'budget:PASS':'interest_category:PASS',source:code==='INTEREST_MATCH'&&!requestedInterests.includes('Выставки')?'saved_preference' as const:'request' as const}));
}
export function selectAllowedReasons(raw:unknown,allowed:ReturnType<typeof allowedReasons>){
 if(!Array.isArray(raw)||raw.length>3||raw.some(v=>typeof v!=='string'||!allowed.some(a=>a.code===v)))throw new Error('AI_REASON_INVALID');
 return allowed.filter(a=>raw.includes(a.code));
}
