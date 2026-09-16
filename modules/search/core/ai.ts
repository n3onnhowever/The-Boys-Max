import {type Candidate,type SemanticContext,type SearchIntent} from './types.ts';
import {evaluateEligibility} from './eligibility.ts';
import {importEventsV2Pricing} from './price.ts';
import {arr,copy,en,fail,id,keys,obj,freeze} from './guard.ts';
import {candidateKey,parseCandidate} from './candidate.ts';
/** This is the native EVENTS -> AI boundary; no alternate arithmetic or field stripping. */
export const importNativeEventsPriceForAI=importEventsV2Pricing;
export const evaluateForAI=evaluateEligibility;
export const evaluateForEvents=evaluateEligibility;
export const evaluateForUI=evaluateEligibility;
/** Model receives only known structural facts + opaque candidate IDs. Provider titles,
 * descriptions, links and provider-created warnings are NOT a tool/authority channel. */
export type RankReason='PRICE_MATCH'|'TIME_MATCH'|'CATEGORY_MATCH'|'CITY_MATCH';
export interface RankPermission {candidate_key:string;permitted_reason_codes:readonly RankReason[]}
export function rankableFacts(intent:SearchIntent,values:Candidate[],ctx:SemanticContext) {
 return freeze(values.map(parseCandidate).map(c=>({c,e:evaluateEligibility(intent,c,ctx)})).filter(x=>x.e.status==='PASS').map(({c,e})=>{
  const mapping:Readonly<Record<string,RankReason>>={budget:'PRICE_MATCH',time:'TIME_MATCH',included_categories:'CATEGORY_MATCH',city:'CITY_MATCH'};
  const permitted_reason_codes=e.checks.filter(x=>x.status==='PASS'&&Object.hasOwn(mapping,x.field)).map(x=>mapping[x.field]);
  return {candidate_key:candidateKey(c.ref),starts_at:c.starts_at,ends_at:c.ends_at,categories:copy(c.categories.known),total_price:copy(c.price.total_price),permitted_reason_codes};
 }));
}
export function validateRankOutput(raw:unknown,allowed:readonly RankPermission[]) {
 const r=obj(raw);keys(r,['version','ranking']);if(r.version!=='max.rank/3-candidate')fail('RANK_VERSION_REQUIRED');
 const rankings=arr(r.ranking,'ranking',100).map(v=>{const x=obj(v);keys(x,['candidate_key','reason_codes']);if(typeof x.candidate_key!=='string'||!allowed.some(a=>a.candidate_key===x.candidate_key))fail('RANK_CANDIDATE_NOT_ALLOWED');
  const reasons=arr(x.reason_codes,'reason_codes',5).map(v=>en(v,['PRICE_MATCH','TIME_MATCH','CATEGORY_MATCH','CITY_MATCH'] as const));
  if(reasons.some(v=>!allowed.find(a=>a.candidate_key===x.candidate_key)!.permitted_reason_codes.includes(v)))fail('RANK_REASON_NOT_PROVEN');
  if(new Set(reasons).size!==reasons.length)fail('DUPLICATE_REASON');return {candidate_key:x.candidate_key,reason_codes:reasons};});
 if(new Set(rankings.map(x=>x.candidate_key)).size!==rankings.length)fail('DUPLICATE_RANK');return freeze(rankings);
}
export function validateExternalToolCall(raw:unknown,externalEnabled:boolean):'SEARCH_EVENTS' {
 const t=obj(raw);keys(t,['name','arguments']);const name=en(t.name,['SEARCH_EVENTS'] as const);
 if(!externalEnabled)fail('EXTERNAL_SEARCH_DISABLED');keys(obj(t.arguments),['approval_id']);id(obj(t.arguments).approval_id);return name;
}
