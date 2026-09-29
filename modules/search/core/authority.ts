import {type Action,type Approval,type Capability,type PolicyPort,type SearchScope,type SemanticContext,type Subject} from './types.ts';
import {arr,bool,canonical,copy,en,fail,freeze,id,keys,obj,text,utc} from './guard.ts';
import {parseBinding,parseDraft,parseScope,validateIntent} from './search.ts';
import type {IssuancePort} from './issuance.ts';
export function requireCapability(raw:unknown,subject:Subject,scope:SearchScope,action:Action,now:string):Capability {
 id(subject.actor_id);id(subject.session_id);parseScope(scope);const c=obj(raw,'capability');
 keys(c,['actor_id','scope','binding','actions','session_active','expires_at','external_enabled','policy_version']);
 const returnedScope=parseScope(c.scope),binding=parseBinding(c.binding,returnedScope);
 const actions=arr(c.actions,'actions',6).map(x=>en(x,['SEARCH','CONFIRM_SEARCH','PROPOSE_OPTION','PUBLISH_OPTION','READ_OWN_RESPONSE','READ_RESPONSE_MATRIX'] as const));
 if(new Set(actions).size!==actions.length)fail('DUPLICATE_CAPABILITY');
 const external_enabled=bool(c.external_enabled),session_active=bool(c.session_active);
 const expires_at=text(c.expires_at),policy_version=text(c.policy_version,'policy_version',128);
 if(!session_active||id(c.actor_id)!==subject.actor_id||canonical(returnedScope)!==canonical(scope)||utc(expires_at)<=utc(now)||!actions.includes(action))fail('FORBIDDEN');
 // No membership/slot test here: an organizer capability does not require participation.
 return {actor_id:subject.actor_id,scope:returnedScope,binding,actions,session_active,expires_at,external_enabled,policy_version};
}
export async function loadCapability(port:PolicyPort,subject:Subject,scope:SearchScope,action:Action,now:string):Promise<Capability> {
 return requireCapability(await port.load(subject,scope),subject,scope,action,now);
}
export function assertBinding(a:Approval,c:Capability):void {
 if(a.actor_id!==c.actor_id||canonical(a.scope)!==canonical(c.scope)||canonical(a.binding)!==canonical(c.binding))fail('STALE_AUTHORIZATION_OR_SEARCH');
}
/** Must be invoked only by authenticated + CSRF-protected explicit confirm command. */
export async function confirmSearch(rawDraft:unknown,receipt:unknown,subject:Subject,scope:SearchScope,policy:PolicyPort,ctx:SemanticContext,issuance:IssuancePort):Promise<Approval> {
 const cap=await loadCapability(policy,subject,scope,'CONFIRM_SEARCH',ctx.now_utc),d=parseDraft(rawDraft,ctx);
 const r=obj(receipt);keys(r,['action','approval_id','expected_binding','expected_draft_json']);
 if(r.action!=='CONFIRM_SEARCH'||r.expected_draft_json!==canonical(rawDraft)||canonical(r.expected_binding)!==canonical(cap.binding))fail('EXPLICIT_CONFIRMATION_REQUIRED');
 const a:Approval=freeze({schema_version:'max.approved-search/3-candidate',approval_id:id(r.approval_id),actor_id:subject.actor_id,scope:copy(scope),binding:copy(cap.binding),hard:copy(d.intent),canonical_hard_json:canonical(d.intent),approved_at:ctx.now_utc});
 await issuance.saveApproval(a,subject,new Date(Math.min(Date.parse(cap.expires_at),Date.parse(ctx.now_utc)+900000)).toISOString());return a;
}
export function assertApproval(a:Approval,ctx:SemanticContext):void {
 if(a.schema_version!=='max.approved-search/3-candidate'||a.canonical_hard_json!==canonical(a.hard))fail('UNTRUSTED_APPROVAL');validateIntent(a.hard,ctx);
}
/** Shape validation is deliberately NOT authority. Services MUST also verify the durable record. */
export async function assertIssuedApproval(a:Approval,subject:Subject,ctx:SemanticContext,port:IssuancePort):Promise<void> {
 assertApproval(a,ctx);
 const stored=await port.loadApproval(a.approval_id,subject,ctx.now_utc);
 if(!stored||canonical(stored)!==canonical(a))fail('UNTRUSTED_APPROVAL');
}
export const approvalPersistenceRequirement='DB_STORED_EXPLICIT_RECEIPT_AND_CURRENT_POLICY_REQUIRED' as const;
