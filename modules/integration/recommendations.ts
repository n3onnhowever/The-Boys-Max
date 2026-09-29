import type {Candidate} from '../search/core/types.ts';
import type {Preferences} from '../../packages/persistence/social.ts';
import {normalizeSearchText} from './text-search.ts';

export type RecommendationReason='INTEREST'|'BUDGET'|'TIME';
export interface Recommendation {score:number;reasons:RecommendationReason[];interest:string|null}

const categoryInterest:Readonly<Record<string,readonly string[]>>={
 CONCERT:['Музыка'],THEATRE:['Театр'],CINEMA:['Кино'],MUSEUM:['Выставки','Искусство'],SPORT:['Спорт']
};
const timeHours:Readonly<Record<Exclude<Preferences['preferredTime'],'ANY'>,readonly [number,number]>>={MORNING:[6,12],DAY:[12,18],EVENING:[18,23],NIGHT:[23,6]};

/** Ranking evidence only. Admission, hard filters and UNKNOWN facts are owned elsewhere. */
export function recommendationFor(candidate:Candidate,prefs:Preferences):Recommendation {
 const reasons:RecommendationReason[]=[];
 const title=normalizeSearchText(candidate.untrusted_title);
 const interest=prefs.interests.find(raw=>{
  const value=normalizeSearchText(raw);if(!value)return false;
  return title.includes(value)||candidate.categories.known.some(category=>(categoryInterest[category]??[]).some(label=>normalizeSearchText(label)===value));
 })??null;
 if(interest)reasons.push('INTEREST');
 const total=candidate.price.total_price;
 if(prefs.budgetRub!==null&&candidate.price.fees_known&&total.knownness==='KNOWN'&&total.currency==='RUB'&&total.basis==='PER_PERSON'){
  const upper=total.amount.kind==='FREE'?0n:BigInt(total.amount.kind==='EXACT'?total.amount.exact_minor:total.amount.max_minor);
  if(upper<=BigInt(prefs.budgetRub)*100n)reasons.push('BUDGET');
 }
 if(prefs.preferredTime!=='ANY'&&candidate.starts_at&&candidate.time_precision==='EXACT_OCCURRENCE'){
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',hourCycle:'h23'}).format(new Date(candidate.starts_at)));
  const [from,to]=timeHours[prefs.preferredTime];
  if(from<to?hour>=from&&hour<to:hour>=from||hour<to)reasons.push('TIME');
 }
 return {score:(interest?4:0)+(reasons.includes('BUDGET')?2:0)+(reasons.includes('TIME')?1:0),reasons,interest};
}

function interpretedInterestScore(candidate:Candidate,interests:readonly string[]):number {
 if(!candidate.categories.mapping_verified)return 0;
 return interests.some(raw=>candidate.categories.known.some(category=>(categoryInterest[category]??[]).some(label=>normalizeSearchText(label)===normalizeSearchText(raw))))?1:0;
}
export function rankRecommendations<T>(items:readonly T[],prefs:Preferences,candidate:(item:T)=>Candidate,smartInterests:readonly string[]=[]):{item:T;recommendation:Recommendation}[] {
 return items.map(item=>({item,recommendation:recommendationFor(candidate(item),prefs)})).sort((a,b)=>{
  const left=candidate(a.item),right=candidate(b.item);
  return Number(right.provenance.data_mode==='LIVE')-Number(left.provenance.data_mode==='LIVE')
   ||b.recommendation.score-a.recommendation.score
   ||interpretedInterestScore(right,smartInterests)-interpretedInterestScore(left,smartInterests)
   ||left.provenance.observation_id.localeCompare(right.provenance.observation_id);
 });
}
