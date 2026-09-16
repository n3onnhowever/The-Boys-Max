import {randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {transaction} from './sessions.ts';
import {PgIssuance,searchCapability} from './search-issuance.ts';
import {confirmSearch} from '../../modules/search/core/authority.ts';
import {parseCandidate} from '../../modules/search/core/candidate.ts';
import {draftForManualConfirmation,validateIntent} from '../../modules/search/core/search.ts';
import {canonical} from '../../modules/search/core/guard.ts';
import {evaluateEligibility,rightsCheck} from '../../modules/search/core/eligibility.ts';
import type {Candidate,Eligibility,SearchIntent,SearchScope,Subject} from '../../modules/search/core/types.ts';
import {blankDraft,defaultIntent,context,fromUiDraft,sourceSnapshot,candidateTerms,uniqueInstant} from '../../modules/integration/projections.ts';
import type {Scope,SearchDraft,ExternalRef,NewPlan,Revision} from '../../apps/miniapp/src/port/contracts.ts';
import type {Plan,Slot} from '../contracts/domain.ts';
import {createPlan,apply,assertRead,capabilities} from '../domain/plan.ts';
import {requireCanonicalPlan} from '../domain/price-upgrade.ts';
import {requireThat} from '../domain/errors.ts';
import {digest} from '../platform/auth.ts';
interface ContextRow {id:string;actor_id:string;kind:'PERSONAL'|'PLAN_PRIVATE';plan_id:string|null;revision:number;acl_revision:number;draft:SearchDraft;hard:SearchIntent;approval_id:string|null;}
export interface CatalogItem {candidate:Candidate;eligibility:Eligibility;offerId:string;contextRevision:number}
export interface CatalogResult {ctx:ContextRow;items:CatalogItem[];plan:Plan|null;now:string}
const scopeFor=(c:ContextRow):SearchScope=>c.kind==='PERSONAL'?{kind:'PERSONAL',search_context_id:c.id}:{kind:'PLAN_PRIVATE',search_context_id:c.id,plan_id:c.plan_id!};
export function catalogService(pool:Pool,mode:'test'|'live') {
 async function assertSession(db:PoolClient,s:Subject){
  const r=await db.query(`SELECT id FROM app_sessions WHERE id=$1 AND actor_id=$2 AND NOT revoked AND absolute_expires_at>clock_timestamp() AND last_seen_at>clock_timestamp()-interval '15 minutes' FOR SHARE`,[s.session_id,s.actor_id]);
  requireThat(r.rowCount===1,'SESSION_INVALID',401);
 }
 async function ensure(db:PoolClient,actor:string,scope:Scope):Promise<{ctx:ContextRow;plan:Plan|null}> {
  let plan:Plan|null=null;
  if(scope.kind==='PLAN'){
   const p=await db.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[scope.planId]);requireThat(p.rows[0],'NOT_FOUND',404);const loaded:Plan=p.rows[0].state;assertRead(loaded,actor);requireCanonicalPlan(loaded);plan=loaded;
  }
  await db.query('INSERT INTO search_contexts(id,actor_id,kind,plan_id,draft,hard) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[randomUUID(),actor,scope.kind==='PERSONAL'?'PERSONAL':'PLAN_PRIVATE',scope.kind==='PLAN'?scope.planId:null,blankDraft(),defaultIntent()]);
  const r=await db.query<ContextRow>('SELECT * FROM search_contexts WHERE actor_id=$1 AND kind=$2 AND plan_id IS NOT DISTINCT FROM $3::uuid FOR UPDATE',[actor,scope.kind==='PERSONAL'?'PERSONAL':'PLAN_PRIVATE',scope.kind==='PLAN'?scope.planId:null]);
  requireThat(r.rows[0],'CONTEXT_UNAVAILABLE',503);return {ctx:r.rows[0],plan};
 }
 async function now(db:PoolClient){return (await db.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now.toISOString();}
 async function receipt(db:PoolClient,actor:string,key:string,hash:string,scope:string){
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[scope+':'+actor+':'+key]);
  const old=await db.query<{payload_hash:string;body:{planId?:string;scope?:Scope}}>('SELECT payload_hash,body FROM command_receipts WHERE scope=$1 AND actor_id=$2 AND key=$3',[scope,actor,key]);
  if(old.rows[0]){requireThat(old.rows[0].payload_hash===hash,'IDEMPOTENCY_CONFLICT',409);return old.rows[0].body;}return null;
 }
 return {
 async browse(subject:Subject,scope:Scope):Promise<CatalogResult>{
  return transaction(pool,async db=>{
   await assertSession(db,subject);const {ctx,plan}=await ensure(db,subject.actor_id,scope),time=await now(db),semantic=context(time);
   // Draft values are actor-private. An obsolete date does not erase the user's stored filters.
   let hard:SearchIntent;try{hard=validateIntent(ctx.hard,semantic);}catch{return {ctx,items:[],plan,now:time};}
   const r=await db.query<{body:unknown}>('SELECT body FROM (SELECT DISTINCT ON (provider_id,event_id,occurrence_id) body,observation_id FROM catalog_occurrences WHERE data_mode=$1 ORDER BY provider_id,event_id,occurrence_id,updated_at DESC,observation_id DESC) latest ORDER BY observation_id LIMIT 100',[mode==='test'?'SYNTHETIC':'LIVE']);
   const items:CatalogItem[]=[];
   for(const raw of r.rows){
    const c=parseCandidate(raw.body),e=evaluateEligibility(hard,c,semantic);
    if(rightsCheck(c.rights,'display_facts',time).status!=='PASS'||rightsCheck(c.rights,'display_text',time).status!=='PASS'||e.status==='FAIL')continue;
    const offer=await db.query<{id:string}>(`INSERT INTO catalog_choices(id,actor_id,session_id,context_id,context_revision,observation_id,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,clock_timestamp()+interval '15 minutes')
     ON CONFLICT(actor_id,session_id,context_id,context_revision,observation_id) DO UPDATE SET
      id=CASE WHEN catalog_choices.expires_at<=clock_timestamp() THEN EXCLUDED.id ELSE catalog_choices.id END,
      expires_at=CASE WHEN catalog_choices.expires_at<=clock_timestamp() THEN EXCLUDED.expires_at ELSE catalog_choices.expires_at END RETURNING id`,[randomUUID(),subject.actor_id,subject.session_id,ctx.id,ctx.revision,c.provenance.observation_id]);
    items.push({candidate:c,eligibility:e,offerId:offer.rows[0]!.id,contextRevision:ctx.revision});
   }
   return {ctx,items,plan,now:time};
  });
 },
 async search(subject:Subject,scope:Scope,draft:SearchDraft,key:string,expectedContextRevision:number|null){
  const hash=digest(canonical({scope,draft,expectedContextRevision}));
  return transaction(pool,async db=>{
   await assertSession(db,subject);const old=await receipt(db,subject.actor_id,key,hash,'UI_SEARCH');
   const {ctx}=await ensure(db,subject.actor_id,scope);
   if(old)return {scope,outcome:'REPLAYED' as const};
   requireThat(expectedContextRevision===ctx.revision,'SEARCH_CONTEXT_STALE',409);
   const time=await now(db),semantic=context(time),hard=fromUiDraft(draft,semantic),approvalId=randomUUID();
   await db.query('UPDATE search_contexts SET draft=$2,hard=$3,revision=revision+1,approval_id=$4,updated_at=clock_timestamp() WHERE id=$1',[ctx.id,draft,hard,approvalId]);
   const searchScope=scopeFor(ctx),policy={load:(s:Subject,scope:SearchScope)=>searchCapability(db,s,scope,false)};
   const cap=await policy.load(subject,searchScope),d=draftForManualConfirmation(hard);
   await confirmSearch(d,{action:'CONFIRM_SEARCH',approval_id:approvalId,expected_binding:cap.binding,expected_draft_json:canonical(d)},subject,searchScope,policy,semantic,new PgIssuance(db));
   await db.query('INSERT INTO command_receipts(scope,actor_id,key,payload_hash,body) VALUES($1,$2,$3,$4,$5)',['UI_SEARCH',subject.actor_id,key,hash,{scope}]);
   return {scope,outcome:'APPLIED' as const};
  });
 },
 /** SELECTED choice, source authority, target ACL/CAS and internal effect share one PG transaction. */
 async add(subject:Subject,key:string,ref:ExternalRef,targetPlanId:string|null,newPlan:NewPlan|null,ackUnknownReasons:string[],expected:Revision|null,requestId:string){
  const hash=digest(canonical({ref,targetPlanId,newPlan,ackUnknownReasons,expected}));
  return transaction(pool,async db=>{
   await assertSession(db,subject);const old=await receipt(db,subject.actor_id,key,hash,'CATALOG_ADD');
   if(old?.planId){const r=await db.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[old.planId]);requireThat(r.rows[0],'NOT_FOUND',404);assertRead(r.rows[0].state,subject.actor_id);return {planId:old.planId,outcome:'REPLAYED' as const};}
   const r=await db.query<{context_id:string;context_revision:number;observation_id:string}>(`SELECT context_id,context_revision,observation_id FROM catalog_choices WHERE id=$1 AND actor_id=$2 AND session_id=$3 AND expires_at>clock_timestamp()`,[ref.offerId,subject.actor_id,subject.session_id]);
   const choice=r.rows[0];requireThat(choice,'OFFER_EXPIRED_OR_FOREIGN',409);
   const x=await db.query<ContextRow>('SELECT * FROM search_contexts WHERE id=$1 AND actor_id=$2 FOR UPDATE',[choice.context_id,subject.actor_id]);const ctx=x.rows[0];
   const currentChoice=await db.query('SELECT id FROM catalog_choices WHERE id=$1 AND actor_id=$2 AND session_id=$3 AND expires_at>clock_timestamp() FOR UPDATE',[ref.offerId,subject.actor_id,subject.session_id]);
   requireThat(currentChoice.rowCount===1,'OFFER_EXPIRED_OR_FOREIGN',409);
   requireThat(ctx&&ctx.revision===choice.context_revision&&ctx.revision===ref.contextRevision,'SEARCH_CONTEXT_STALE',409);
   requireThat(ctx.kind==='PERSONAL'||ctx.plan_id===targetPlanId,'CROSS_PLAN_OFFER_FORBIDDEN',403);
   // The provider's current observation must still be the exact receipt observation. No blind client snapshot.
   const source=await db.query<{body:unknown;data_mode:string}>('SELECT body,data_mode FROM catalog_occurrences WHERE observation_id=$1 FOR SHARE',[choice.observation_id]);
   requireThat(source.rows[0]&&source.rows[0].data_mode===(mode==='test'?'SYNTHETIC':'LIVE'),'SOURCE_UNAVAILABLE',409);
   const c=parseCandidate(source.rows[0].body),time=await now(db),semantic=context(time);
   const latest=await db.query<{observation_id:string}>('SELECT observation_id FROM catalog_occurrences WHERE provider_id=$1 AND event_id=$2 AND occurrence_id=$3 AND data_mode=$4 ORDER BY updated_at DESC,observation_id DESC LIMIT 1',[c.ref.provider_id,c.ref.event_id,c.ref.occurrence_id,source.rows[0].data_mode]);
   requireThat(latest.rows[0]?.observation_id===choice.observation_id,'SOURCE_OBSERVATION_SUPERSEDED',409);
   requireThat(c.ref.provider_id===ref.sourceId&&c.ref.event_id===ref.externalEventId&&c.ref.occurrence_id===ref.occurrenceId&&c.provenance.observation_id===ref.observationId,'SOURCE_REF_MISMATCH',409);
   requireThat(['display_facts','display_text','persist_minimal'].every(op=>rightsCheck(c.rights,op as 'display_facts'|'display_text'|'persist_minimal',time).status==='PASS'),'RIGHTS_UNVERIFIED',409);
   const e=evaluateEligibility(ctx.hard,c,semantic);requireThat(e.status!=='FAIL','INELIGIBLE_OFFER',409);
   const required=[...new Set(e.checks.filter(v=>v.status==='UNKNOWN').map(v=>v.reason))].sort();
   requireThat(canonical([...new Set(ackUnknownReasons)].sort())===canonical(required),'UNKNOWN_ACK_REQUIRED',422);
   let p:Plan;
   if(targetPlanId){
    requireThat(newPlan===null,'GROUP_CONFIG_NOT_APPLICABLE',422);
    const q=await db.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1 FOR UPDATE',[targetPlanId]);requireThat(q.rows[0],'NOT_FOUND',404);p=q.rows[0].state;assertRead(p,subject.actor_id);requireCanonicalPlan(p);
    requireThat(capabilities(p,subject.actor_id).canPropose&&p.stateVersion===expected?.state_version,'VERSION_CONFLICT',409);
   }else{
    requireThat(newPlan&&ctx.kind==='PERSONAL','EXPLICIT_NEW_PLAN_REQUIRED',422);
    const decision=uniqueInstant(newPlan.decisionLocal,newPlan.timeZone),commitment=uniqueInstant(newPlan.commitmentLocal,newPlan.timeZone);
    requireThat(c.starts_at===null||Date.parse(commitment)<Date.parse(c.starts_at),'COMMITMENT_MUST_PRECEDE_EVENT',422);
    const slots:Slot[]=Array.from({length:newPlan.participantSlots},(_,i)=>({slotId:randomUUID(),label:`Участник ${i+1}`,required:true,actorId:i===0&&newPlan.organizerParticipates?subject.actor_id:null,state:i===0&&newPlan.organizerParticipates?'ACTIVE':'UNBOUND'}));
    p=createPlan(randomUUID(),subject.actor_id,newPlan.title,slots,{kind:'ALL'},decision,commitment,time);
   }
   const optionId=randomUUID(),snapshotId=randomUUID(),q=apply(p,subject.actor_id,{kind:'ADD_OPTION',expectedStateVersion:p.stateVersion,optionId,snapshotId,terms:candidateTerms(c,semantic)},time);
   const snapshot=q.options.find(o=>o.optionId===optionId)!.snapshots[0]!;
   snapshot.source=sourceSnapshot(c);snapshot.terms.warnings=[...new Set([...snapshot.terms.warnings,...e.warnings.map(w=>w.code+': '+w.message),...required])];
   if(targetPlanId)await db.query('UPDATE plans SET state_version=$2,state=$3 WHERE id=$1',[q.planId,q.stateVersion,q]);
   else {
    await db.query('INSERT INTO plans(id,organizer_id,state_version,state) VALUES($1,$2,$3,$4)',[q.planId,subject.actor_id,q.stateVersion,q]);
    for(const s of q.slots)await db.query('INSERT INTO plan_slots(plan_id,slot_id,actor_id,state) VALUES($1,$2,$3,$4)',[q.planId,s.slotId,s.actorId,s.state]);
   }
   await db.query('INSERT INTO snapshots(id,plan_id,option_id,body) VALUES($1,$2,$3,$4)',[snapshotId,q.planId,optionId,snapshot]);
   await db.query('INSERT INTO command_audit(id,plan_id,actor_id,kind,state_version,request_id,accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),q.planId,subject.actor_id,targetPlanId?'ADD_CATALOG_OPTION':'EXPLICIT_GROUP_FROM_CATALOG',q.stateVersion,requestId,time]);
   await db.query('INSERT INTO command_receipts(scope,actor_id,key,payload_hash,body) VALUES($1,$2,$3,$4,$5)',['CATALOG_ADD',subject.actor_id,key,hash,{planId:q.planId}]);
   return {planId:q.planId,outcome:'APPLIED' as const};
  });
 }
 };
}
