import {type Candidate,type Page} from './types.ts';
import {candidateKey,parseCandidate} from './candidate.ts';
import {canonical,copy,fail,freeze,id,integer,utc} from './guard.ts';
export interface ObservationState {scope_id:string;ref:Candidate['ref'];last_sequence:number;last_observation_id:string;last_payload_json:string;observed_at:string;last_listing_check_at:string;status:Candidate['status'];listing_state:Candidate['listing_state'];provider_health:Candidate['provider_health']}
export type ObservationDelta={kind:'NO_OBSERVATION';reason:'PARTIAL_FEED'|'UNREACHABLE'|'STALE'|'DUPLICATE'}|
 {kind:'OBSERVED';candidate:Candidate;sequence:number;explicit_reinstatement:boolean}|
 {kind:'MISSING';scope_id:string;observed_at:string;sequence:number;proof:Page['coverage']};
/** NO_OBSERVATION is an identity: no false PRESENT, no reset of known cancellation/time. */
export function applyObservation(previous:ObservationState,delta:ObservationDelta):ObservationState {
 if(delta.kind==='NO_OBSERVATION')return freeze(copy(previous));
 const sequence=integer(delta.sequence,0,Number.MAX_SAFE_INTEGER);
 if(sequence<previous.last_sequence)return freeze(copy(previous));
 if(delta.kind==='OBSERVED'){
  const c=parseCandidate(delta.candidate);if(candidateKey(c.ref)!==candidateKey(previous.ref))fail('OBSERVATION_REF_MISMATCH');
  const payload=canonical(c);
  if(sequence===previous.last_sequence){if(c.provenance.observation_id===previous.last_observation_id&&payload===previous.last_payload_json)return freeze(copy(previous));fail('OBSERVATION_SEQUENCE_CONFLICT');}
  if(utc(c.provenance.observed_at)<utc(previous.observed_at))return freeze(copy(previous));
  if(typeof delta.explicit_reinstatement!=='boolean')fail('BOOLEAN_REQUIRED');
  const status=previous.status==='CANCELLED'&&c.status!=='CANCELLED'&&!delta.explicit_reinstatement?'CANCELLED':c.status==='UNKNOWN'?previous.status:c.status;
  return freeze({...copy(previous),last_sequence:sequence,last_observation_id:c.provenance.observation_id,last_payload_json:payload,observed_at:c.provenance.observed_at,last_listing_check_at:c.provenance.observed_at,status,listing_state:c.listing_state,provider_health:c.provider_health});
 }
 const p=delta.proof;if(delta.scope_id!==previous.scope_id||p.scope_id!==previous.scope_id||p.all_pages_consumed!==true||p.snapshot_consistent!==true||p.truncated!==false)fail('COMPLETE_FEED_PROOF_REQUIRED');
 if(utc(delta.observed_at)<utc(previous.observed_at))return freeze(copy(previous));
 if(sequence===previous.last_sequence){if(previous.listing_state==='MISSING_FROM_FEED'&&previous.last_listing_check_at===delta.observed_at)return freeze(copy(previous));fail('OBSERVATION_SEQUENCE_CONFLICT');}
 // A proven missing listing is still NOT an event cancellation or new live observation.
 return freeze({...copy(previous),last_sequence:sequence,last_listing_check_at:delta.observed_at,listing_state:'MISSING_FROM_FEED'});
}
export function missingFromFeed(previous:ObservationState,page:Page,sequence:number,now:string):ObservationState {
 if(page.items.some(c=>candidateKey(c.ref)===candidateKey(previous.ref)))return freeze(copy(previous));
 if(!page.coverage.all_pages_consumed||!page.coverage.snapshot_consistent||page.coverage.truncated)return applyObservation(previous,{kind:'NO_OBSERVATION',reason:'PARTIAL_FEED'});
 return applyObservation(previous,{kind:'MISSING',scope_id:page.coverage.scope_id,observed_at:now,sequence,proof:page.coverage});
}
/** Redis key recipe, not a queue. Actor/scope/ACL are mandatory for private response caches. */
export function privateCacheKey(actorId:string,scope:unknown,binding:unknown,canonicalHard:string):string {id(actorId);return canonical(['max.search-private/3',actorId,scope,binding,canonicalHard]);}
/** Cache read policy only: callers still recheck ACL, rights and eligibility after every hit. */
export function cacheFresh(fetchedAt:string,now:string,ttlSeconds:number):boolean {integer(ttlSeconds,1,86400);const age=utc(now)-utc(fetchedAt);return age>=0&&age<ttlSeconds*1000;}
