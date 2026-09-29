import type {Pool,PoolClient} from 'pg';
import type {Approval,Subject,SearchScope,Capability,PlanOptionRef} from '../../modules/search/core/types.ts';
import type {IssuancePort,IssuedOffer} from '../../modules/search/core/issuance.ts';
import {canonical} from '../../modules/search/core/guard.ts';
import {requireThat} from '../domain/errors.ts';
import type {Plan} from '../contracts/domain.ts';
import {assertRead,capabilities} from '../domain/plan.ts';
type Db=Pick<Pool,'query'>|Pick<PoolClient,'query'>;
/** A real PG adapter, not Redis authority, a signature shortcut or object-identity registry. */
export class PgIssuance implements IssuancePort {
 private readonly db:Db;
constructor(  db:Db){this.db=db;}
 async saveApproval(a:Approval,subject:Subject,expiresAt:string){
  requireThat(a.actor_id===subject.actor_id,'APPROVAL_ACTOR',403);
  await this.db.query('INSERT INTO search_approvals(id,actor_id,session_id,context_id,body,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[a.approval_id,subject.actor_id,subject.session_id,a.scope.search_context_id,a,expiresAt]);
 }
 async loadApproval(id:string,subject:Subject,now:string):Promise<Approval|null>{
  const r=await this.db.query<{body:Approval}>(`SELECT a.body FROM search_approvals a JOIN app_sessions s ON s.id=a.session_id JOIN search_contexts x ON x.id=a.context_id
   WHERE a.id=$1 AND a.actor_id=$2 AND a.session_id=$3 AND a.expires_at>$4::timestamptz AND NOT s.revoked AND s.absolute_expires_at>$4::timestamptz AND s.last_seen_at>$4::timestamptz-interval '15 minutes'
   AND x.actor_id=$2 AND x.revision=(a.body->'binding'->>'search_context_revision')::integer AND x.acl_revision=(a.body->'binding'->>'acl_revision')::integer`,[id,subject.actor_id,subject.session_id,now]);
  return r.rows[0]?.body??null;
 }
 async saveOffer(id:string,r:IssuedOffer){
  await this.db.query('INSERT INTO search_issued_offers(id,actor_id,session_id,approval_id,body,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[id,r.subject.actor_id,r.subject.session_id,r.approval.approval_id,r,r.expires_at]);
 }
 async loadOffer(id:string,subject:Subject,now:string):Promise<IssuedOffer|null>{
  const r=await this.db.query<{body:IssuedOffer}>(`SELECT body FROM search_issued_offers WHERE id=$1 AND actor_id=$2 AND session_id=$3 AND expires_at>$4::timestamptz`,[id,subject.actor_id,subject.session_id,now]);
  const issued=r.rows[0]?.body;if(!issued)return null;
  const a=await this.loadApproval(issued.approval.approval_id,subject,now);
  return a&&canonical(a)===canonical(issued.approval)?issued:null;
 }
 /** Used inside the option transaction. Locks both durable records until snapshot append commits. */
 async assertIssued(id:string,subject:Subject,now:string,record:string):Promise<void>{
  await this.db.query(`SELECT o.id FROM search_issued_offers o JOIN search_approvals a ON a.id=o.approval_id JOIN search_contexts x ON x.id=a.context_id JOIN app_sessions s ON s.id=a.session_id WHERE o.id=$1 FOR SHARE OF o,a,x,s`,[id]);
  const value=await this.loadOffer(id,subject,now);requireThat(value&&canonical(value)===record,'STALE_OR_FOREIGN_OFFER',409);
 }
}
export async function searchCapability(db:Db,subject:Subject,scope:SearchScope,externalEnabled=false):Promise<Capability> {
 const r=await db.query<{id:string;revision:number;acl_revision:number;kind:string;plan_id:string|null;absolute_expires_at:Date}>(`SELECT x.id,x.revision,x.acl_revision,x.kind,x.plan_id,s.absolute_expires_at FROM search_contexts x JOIN app_sessions s ON s.actor_id=x.actor_id WHERE x.id=$1 AND x.actor_id=$2 AND s.id=$3 AND NOT s.revoked AND s.absolute_expires_at>clock_timestamp() AND s.last_seen_at>clock_timestamp()-interval '15 minutes'`,[scope.search_context_id,subject.actor_id,subject.session_id]);
 const row=r.rows[0];requireThat(row&&row.kind===scope.kind&&(scope.kind==='PERSONAL'?row.plan_id===null:row.plan_id===scope.plan_id),'NOT_FOUND',404);
 let plan:Capability['binding']['plan']=null;
 if(scope.kind==='PLAN_PRIVATE'){
  const q=await db.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[scope.plan_id]);requireThat(q.rows[0],'NOT_FOUND',404);const p=q.rows[0].state;assertRead(p,subject.actor_id);
  plan={config_revision:p.configRevision,electorate_version:p.electorateVersion,selection_revision:p.selectionRevision,candidate_set_revision:p.configRevision};
 }
 return {actor_id:subject.actor_id,scope,binding:{acl_revision:row.acl_revision,search_context_revision:row.revision,plan},actions:scope.kind==='PERSONAL'?['SEARCH','CONFIRM_SEARCH']:['SEARCH','CONFIRM_SEARCH','PROPOSE_OPTION'],session_active:true,expires_at:row.absolute_expires_at.toISOString(),external_enabled:externalEnabled,policy_version:'the-boys.policy26.v1'};
}
