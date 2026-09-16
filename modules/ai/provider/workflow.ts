import type {AiProvider,Candidate,ParseContext,ServerCapabilities,TrustedScope} from './types.ts';
import {equal,validateCandidate} from './validation.ts';
export type CapabilityReader=()=>Promise<ServerCapabilities>;
const authorized=(c:ServerCapabilities,actor:string,scope:TrustedScope)=>c.actor_id===actor&&equal(c.scope,scope)&&c.can_search===true;
/** This checks capabilities issued by server 23; it does NOT derive ACLs from member role/ACTIVE.
 * An organizer without an attendance slot can be granted can_search. LLM never sees these values. */
export async function propose(provider:AiProvider,request:{actor_id:string;scope:TrustedScope;text:string;context:ParseContext},read:CapabilityReader){
  const before=await read();if(!authorized(before,request.actor_id,request.scope)||before.external_enabled!==true)return {status:'FORBIDDEN' as const};
  const observation=await provider.parse(request.text,request.context);
  const after=await read();
  if(!authorized(after,request.actor_id,request.scope)||after.external_enabled!==true||after.revision!==before.revision)return {status:'STALE_OR_REVOKED' as const};
  return {status:'PROPOSED' as const,observation,expected_server_revision:after.revision};
}
export type StoredDraft={id:string;actor_id:string;scope:TrustedScope;revision:string;candidate:Candidate;context:ParseContext};
export type SearchEnvelope={version:'approved-ai-search-proposal/1';draft_id:string;actor_id:string;scope:TrustedScope;expected_revision:string;intent:Candidate['intent']};
/** Production implementations must enforce actor-scoped lookup and atomic revision recheck.
 * This is a read-only SEARCH boundary, not JOIN/selection/consent/notification dispatch. */
export interface SharedSearchPort {
  loadActorDraft(id:string,actor:string,scope:TrustedScope):Promise<StoredDraft|null>;
  executeApprovedSearch(envelope:SearchEnvelope):Promise<{status:'ACCEPTED'|'STALE'|'UNSUPPORTED';unsupported_fields?:string[]}>;
}
export async function confirmSearch(input:{draft_id:string;actor_id:string;scope:TrustedScope;user_confirmed:boolean},read:CapabilityReader,shared:SharedSearchPort){
  if(input.user_confirmed!==true)return {status:'CONFIRMATION_REQUIRED'};
  const before=await read();if(!authorized(before,input.actor_id,input.scope))return {status:'FORBIDDEN'};
  const draft=await shared.loadActorDraft(input.draft_id,input.actor_id,input.scope);
  if(!draft||draft.id!==input.draft_id||draft.actor_id!==input.actor_id||!equal(draft.scope,input.scope))return {status:'FORBIDDEN'};
  const v=validateCandidate(draft.candidate,draft.context);
  if(!v.semantic_ok||draft.candidate.state!=='DRAFT')return {status:'DRAFT_NOT_READY'};
  const after=await read();if(!authorized(after,input.actor_id,input.scope)||after.revision!==before.revision||after.revision!==draft.revision)return {status:'STALE_OR_REVOKED'};
  // Approval is allowed for a MANUAL draft even when external_enabled is false.
  // Forward EVERY intent field unchanged, never drop unsupported filters to fit a provider.
  return shared.executeApprovedSearch({version:'approved-ai-search-proposal/1',draft_id:draft.id,actor_id:input.actor_id,scope:input.scope,expected_revision:after.revision,intent:structuredClone(draft.candidate.intent)});
}
