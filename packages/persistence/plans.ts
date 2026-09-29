import {noticeExpiry,purposeForCommand} from '../domain/notices.ts';
import {requireCanonicalPlan} from '../domain/price-upgrade.ts';
import {randomUUID} from 'node:crypto';
import {eq,and,sql} from 'drizzle-orm';
import type {Database} from './db.ts';
import {plans,slots,snapshots,receipts,joins,outbox} from './schema.ts';
import {apply,createPlan,assertCommandAccess,assertRead,view} from '../domain/plan.ts';
import {requireThat} from '../domain/errors.ts';
import {digest,keyed} from '../platform/auth.ts';
import type {Command,Slot,Rule} from '../contracts/domain.ts';
export function canonicalJson(v:unknown):string {
 if(v===null||typeof v!=='object'){const encoded=JSON.stringify(v);requireThat(encoded!==undefined,'NON_JSON_PAYLOAD');return encoded;}
 if(Array.isArray(v))return '['+v.map(canonicalJson).join(',')+']';
 const o=v as Record<string,unknown>;return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(o[k])).join(',')+'}';
}
export function planService(db:Database,inviteSecret:string) {
 return {
 async create(actor:string,key:string,input:{title:string;slots:Slot[];rule:Rule;decisionDeadline:string;commitmentDeadline:string}) {
  return db.transaction(async tx=>{
   const scope='CREATE',hash=digest(canonicalJson(input));
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${scope+actor+key},0))`);
   const [old]=await tx.select().from(receipts).where(and(eq(receipts.scope,scope),eq(receipts.actorId,actor),eq(receipts.key,key)));
   if(old){requireThat(old.payloadHash===hash,'IDEMPOTENCY_CONFLICT',409);return old.body;}
   const now=(await tx.execute<{now:string}>(sql`SELECT clock_timestamp()::text AS now`)).rows[0]!.now;
   const p=createPlan(randomUUID(),actor,input.title,input.slots,input.rule,input.decisionDeadline,input.commitmentDeadline,now);
   await tx.insert(plans).values({id:p.planId,organizerId:actor,stateVersion:p.stateVersion,state:p});
   await tx.insert(slots).values(p.slots.map(s=>({planId:p.planId,slotId:s.slotId,actorId:s.actorId,state:s.state})));
   const result={planId:p.planId,stateVersion:1,status:'APPLIED' as const,commandId:randomUUID()};
   await tx.insert(receipts).values({scope,actorId:actor,key,payloadHash:hash,body:result});return result;
  });
 },
 async read(actor:string,planId:string){const [row]=await db.select().from(plans).where(eq(plans.id,planId));requireThat(row,'NOT_FOUND',404);requireCanonicalPlan(row.state);return view(row.state,actor,new Date().toISOString());},
 async list(actor:string,cursor:string|undefined,limit:number){
  const result=await db.execute<{id:string;title:string;state_version:number}>(sql`SELECT p.id,p.state->>'title' AS title,p.state_version FROM plans p
   WHERE (p.organizer_id=${actor}::uuid OR EXISTS(SELECT 1 FROM plan_slots s WHERE s.plan_id=p.id AND s.actor_id=${actor}::uuid AND s.state='ACTIVE'))
   AND (${cursor??null}::uuid IS NULL OR p.id>${cursor??null}::uuid) ORDER BY p.id LIMIT ${limit+1}`);
  const items=result.rows.slice(0,limit);return {items,nextCursor:result.rows.length>limit?items.at(-1)!.id:null};
 },
 async command(actor:string,planId:string,key:string,c:Command,requestId:string){
  return db.transaction(async tx=>{
   const [row]=await tx.select().from(plans).where(eq(plans.id,planId)).for('update');requireThat(row,'NOT_FOUND',404);
   requireCanonicalPlan(row.state);assertCommandAccess(row.state,actor,c); // ACL before receipt replay; organizer role does not require a slot.
   const scope=planId,hash=digest(canonicalJson(c));
   const [old]=await tx.select().from(receipts).where(and(eq(receipts.scope,scope),eq(receipts.actorId,actor),eq(receipts.key,key)));
   if(old){requireThat(old.payloadHash===hash,'IDEMPOTENCY_CONFLICT',409);return old.body;}
   if(c.kind==='ROSTER'&&canonicalJson(c.slots)===canonicalJson(row.state.slots)&&canonicalJson(c.rule)===canonicalJson(row.state.rule)&&c.decisionDeadline===row.state.decisionDeadline){
    const prior=await tx.execute<{id:string}>(sql`SELECT id FROM command_audit WHERE plan_id=${planId} AND actor_id=${actor} AND kind='ROSTER' ORDER BY accepted_at DESC LIMIT 1`);
    if(prior.rows[0]){
     const result={planId,stateVersion:row.stateVersion,status:'APPLIED' as const,commandId:prior.rows[0].id};
     await tx.insert(receipts).values({scope,actorId:actor,key,payloadHash:hash,body:result});return result;
    }
   }
   if(c.kind==='ROSTER'){
    // A bind requires a real request. Never take actor IDs from a MAX chat roster or a display label.
    const approved=await tx.select().from(joins).where(eq(joins.planId,planId));
    for(const s of c.slots.filter(s=>s.state==='ACTIVE')){
     const previous=row.state.slots.find(a=>a.actorId===s.actorId&&a.state==='ACTIVE');
     requireThat(s.actorId===actor||!!previous||approved.some(j=>j.actorId===s.actorId&&j.state==='PENDING'),'JOIN_APPROVAL_REQUIRED',403);
     // A removed/rejected actor must submit a newly allowed request; an old APPROVED row is not authority.
    }
   }
   const now=(await tx.execute<{now:string}>(sql`SELECT clock_timestamp()::text AS now`)).rows[0]!.now;
   const q=apply(row.state,actor,c,now),commandId=randomUUID();
   await tx.update(plans).set({stateVersion:q.stateVersion,state:q}).where(eq(plans.id,planId));
   await tx.delete(slots).where(eq(slots.planId,planId));
   await tx.insert(slots).values(q.slots.map(s=>({planId,slotId:s.slotId,actorId:s.actorId,state:s.state})));
   for(const o of q.options)for(const snapshot of o.snapshots) if(!row.state.options.flatMap(o=>o.snapshots).some(s=>s.snapshotId===snapshot.snapshotId))
    await tx.insert(snapshots).values({id:snapshot.snapshotId,planId,optionId:o.optionId,body:snapshot});
   if(c.kind==='ROSTER')for(const s of c.slots.filter(s=>s.state==='ACTIVE'))await tx.update(joins).set({state:'APPROVED'}).where(and(eq(joins.planId,planId),eq(joins.actorId,s.actorId!)));
   if(c.kind==='ROSTER')for(const s of c.slots.filter(s=>s.state==='ACTIVE'&&s.actorId!==actor&&!row.state.slots.some(a=>a.state==='ACTIVE'&&a.actorId===s.actorId)))
    await tx.execute(sql`INSERT INTO in_app_notifications(id,actor_id,kind,title,plan_id,actor_context_id)
     SELECT ${randomUUID()},${s.actorId},'JOIN_APPROVED','Заявка на участие одобрена',${planId},${actor}
     WHERE COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=${s.actorId}),true)`);
   if(c.kind==='ROSTER')for(const s of row.state.slots.filter(s=>s.state==='ACTIVE'&&!q.slots.some(a=>a.state==='ACTIVE'&&a.actorId===s.actorId))) await tx.update(joins).set({state:'REMOVED'}).where(and(eq(joins.planId,planId),eq(joins.actorId,s.actorId!)));
   const result={planId,stateVersion:q.stateVersion,status:'APPLIED' as const,commandId};
   await tx.insert(receipts).values({scope,actorId:actor,key,payloadHash:hash,body:result});
   await tx.execute(sql`INSERT INTO command_audit(id,plan_id,actor_id,kind,state_version,request_id,accepted_at) VALUES(${commandId},${planId},${actor},${c.kind},${q.stateVersion},${requestId},${now}::timestamptz)`);
   // One notification per recipient/command. Destinations are resolved later from trusted bot_started evidence.
   const purpose=purposeForCommand(c.kind),expires=purpose?noticeExpiry(q,purpose,now):null;
   if(purpose&&expires){
    const recipients=new Set([q.organizerId,...q.slots.filter(s=>s.state==='ACTIVE').map(s=>s.actorId!)]);
    for(const target of recipients)await tx.insert(outbox).values({id:randomUUID(),commandId,planId,actorId:target,state:'READY',kind:'PLAN_NOTICE',purpose,expectedSelectionRevision:q.selectionRevision,expectedConfigRevision:q.configRevision,expiresAt:new Date(expires)});
   }
   return result;
  });
 },
 async invite(actor:string,planId:string,key:string,expectedStateVersion:number){
  return db.transaction(async tx=>{
   const [row]=await tx.select().from(plans).where(eq(plans.id,planId)).for('update');requireThat(row,'NOT_FOUND',404);assertRead(row.state,actor);
   requireThat(row.organizerId===actor&&!['CLOSED','CANCELLED'].includes(row.state.phase),'FORBIDDEN',403);
   const token=keyed(inviteSecret,`invite:${planId}:${actor}:${key}`);
   const existing=await tx.execute<{expected_revision:number;expires_at:string;revoked:boolean}>(sql`SELECT expected_revision,expires_at,revoked FROM invites WHERE plan_id=${planId} AND create_key=${key}`);
   if(existing.rows[0]){const old=existing.rows[0];requireThat(old.expected_revision===expectedStateVersion,'IDEMPOTENCY_CONFLICT',409);requireThat(!old.revoked&&new Date(old.expires_at).getTime()>Date.now(),'INVITE_INVALID',409);return {inviteRef:token,expiresAt:new Date(old.expires_at).toISOString()};}
   requireThat(row.stateVersion===expectedStateVersion,'VERSION_CONFLICT',409);
   const created=await tx.execute<{expires_at:string}>(sql`INSERT INTO invites(id,plan_id,token_hash,create_key,expected_revision,expires_at) VALUES(${randomUUID()},${planId},${digest(token)},${key},${expectedStateVersion},clock_timestamp()+interval '7 days') RETURNING expires_at`);
   return {inviteRef:token,expiresAt:new Date(created.rows[0]!.expires_at).toISOString()};
  });
 },
 async inviteFriend(actor:string,friend:string,planId:string,expectedStateVersion:number){
  return db.transaction(async tx=>{
   const [row]=await tx.select().from(plans).where(eq(plans.id,planId)).for('update');requireThat(row,'NOT_FOUND',404);assertRead(row.state,actor);
   requireThat(row.organizerId===actor&&!['CLOSED','CANCELLED'].includes(row.state.phase),'FORBIDDEN',403);
   const accepted=await tx.execute(sql`SELECT 1 FROM friendships WHERE state='ACCEPTED' AND ((requester_id=${actor} AND recipient_id=${friend}) OR (requester_id=${friend} AND recipient_id=${actor}))`);
   requireThat(accepted.rows.length===1,'FRIEND_REQUIRED',403);
   const member=await tx.execute(sql`SELECT 1 FROM plan_slots WHERE plan_id=${planId} AND actor_id=${friend} AND state='ACTIVE'`);
   if(member.rows.length)return {inviteRef:null,state:'PARTICIPATING' as const};
   const pending=await tx.execute<{id:string;invite_ref:string|null}>(sql`SELECT id,invite_ref FROM in_app_notifications WHERE plan_id=${planId} AND actor_id=${friend} AND kind='PLAN_INVITE' ORDER BY created_at,id LIMIT 1 FOR UPDATE`);
   if(pending.rows[0]?.invite_ref){
    const live=await tx.execute(sql`SELECT 1 FROM invites WHERE plan_id=${planId} AND token_hash=${digest(pending.rows[0].invite_ref)} AND NOT revoked AND expires_at>clock_timestamp()`);
    if(live.rows.length)return {inviteRef:pending.rows[0].invite_ref,state:'PENDING' as const};
   }
   requireThat(row.stateVersion===expectedStateVersion,'VERSION_CONFLICT',409);
   const hex=digest('FRIEND_INVITE:'+planId+':'+friend),key=pending.rows.length?randomUUID():`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
   const token=keyed(inviteSecret,`invite:${planId}:${actor}:${key}`);
   const inviteId=randomUUID();
   await tx.execute(sql`INSERT INTO invites(id,plan_id,token_hash,create_key,expected_revision,expires_at) VALUES(${inviteId},${planId},${digest(token)},${key},${expectedStateVersion},clock_timestamp()+interval '7 days')`);
   if(pending.rows.length)await tx.execute(sql`UPDATE in_app_notifications SET invite_ref=${token},actor_context_id=${actor},read_at=NULL,created_at=clock_timestamp() WHERE id=${pending.rows[0]!.id}`);
   else await tx.execute(sql`INSERT INTO in_app_notifications(id,actor_id,kind,title,plan_id,invite_ref,actor_context_id) VALUES(${randomUUID()},${friend},'PLAN_INVITE','Приглашение в план',${planId},${token},${actor})`);
   await tx.execute(sql`INSERT INTO outbox(id,command_id,plan_id,actor_id,kind,purpose,state,expires_at,notification_key,invite_ref)
    SELECT ${randomUUID()},NULL,${planId},${friend},'PLAN_INVITE','PLAN_INVITE','READY',clock_timestamp()+interval '1 hour',${'invite:'+inviteId+':'+friend+':PLAN_INVITE'},${token}
    WHERE COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=${friend}),true)
    ON CONFLICT DO NOTHING`);
   return {inviteRef:token,state:'SENT' as const};
  });
 },
 async requestJoin(actor:string,token:string){
  return db.transaction(async tx=>{
   const found=await tx.execute<{plan_id:string}>(sql`SELECT i.plan_id FROM invites i JOIN plans p ON p.id=i.plan_id WHERE token_hash=${digest(token)} AND NOT revoked AND expires_at>clock_timestamp() AND p.state->>'phase' NOT IN ('CANCELLED','CLOSED') FOR SHARE OF p,i`);
   const planId=found.rows[0]?.plan_id;requireThat(planId,'INVITE_INVALID',404);
   const active=await tx.execute(sql`SELECT 1 FROM plan_slots WHERE plan_id=${planId} AND actor_id=${actor} AND state='ACTIVE'`);
   if(active.rows.length)return {state:'APPROVED' as const};
   const inserted=await tx.execute<{actor_id:string}>(sql`INSERT INTO join_requests(plan_id,actor_id,state) VALUES(${planId},${actor},'PENDING') ON CONFLICT DO NOTHING RETURNING actor_id`);
   if(inserted.rows.length)await tx.execute(sql`INSERT INTO in_app_notifications(id,actor_id,kind,title,plan_id,actor_context_id)
    SELECT ${randomUUID()},p.organizer_id,'JOIN_REQUEST','Новая заявка на участие',${planId},${actor}
    FROM plans p WHERE p.id=${planId} AND COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=p.organizer_id),true)`);
   const [j]=await tx.select().from(joins).where(and(eq(joins.planId,planId),eq(joins.actorId,actor)));
   return {state:j!.state};
  });
 },
 async ownJoin(actor:string,token:string){
  // Neutral GET: no membership, no slot list, no plan title, no mutation.
  const found=await db.execute<{state:string}>(sql`SELECT j.state FROM invites i LEFT JOIN join_requests j ON j.plan_id=i.plan_id AND j.actor_id=${actor}::uuid WHERE i.token_hash=${digest(token)} AND NOT i.revoked AND i.expires_at>clock_timestamp()`);
  requireThat(found.rows.length>0,'INVITE_INVALID',404);return {state:found.rows[0]?.state??'NONE'};
 },
 async pending(actor:string,planId:string){const [row]=await db.select().from(plans).where(eq(plans.id,planId));requireThat(row&&row.organizerId===actor,'NOT_FOUND',404);return db.select().from(joins).where(eq(joins.planId,planId));}
 };
}
