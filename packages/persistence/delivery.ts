import {noticeStillCurrent} from '../domain/notices.ts';
import type {Plan} from '../contracts/domain.ts';
import {botMessage,botNotice,type BotConfig,type BotAttachment} from '../platform/bot.ts';
import {launchLink} from '../platform/links.ts';
import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {Queue} from 'bullmq';
import type {Transport} from '../platform/transport.ts';
import type {Governor} from '../platform/governor.ts';
import type {WireOutcome} from '../contracts/domain.ts';
import {transaction} from './sessions.ts';
import {requireThat} from '../domain/errors.ts';
import {digest} from '../platform/auth.ts';
const recommendationCurrent=`SELECT o.revision FROM max_event_launch_refs r
 JOIN canonical_events e ON e.provider_event_id=r.external_event_id
 JOIN catalog_sources s ON s.id=e.source_id AND s.provider_id=r.source_id
 JOIN canonical_occurrences o ON o.event_id=e.id AND (o.native_session_id=r.occurrence_id OR EXISTS(
  SELECT 1 FROM occurrence_aliases a WHERE a.occurrence_id=o.id AND a.alias_value=r.occurrence_id))
 WHERE r.ref=$1 AND r.expires_at>clock_timestamp() AND s.data_mode='LIVE' AND s.admission_state='APPROVED'
 AND o.starts_at>clock_timestamp() AND o.lifecycle='SCHEDULED' AND o.confirmation='CONFIRMED' AND o.listing='PRESENT'`;
/** Transport hook only. The later recommendation creator owns selection and consent. */
export async function enqueueRecommendationTransport(pool:Pool,actorId:string,eventRef:string,recommendationId:string,revision:number){
 requireThat(/^[a-f0-9]{32}$/.test(eventRef)&&/^[a-f0-9-]{36}$/.test(actorId)&&/^[A-Za-z0-9_-]{1,100}$/.test(recommendationId)&&Number.isSafeInteger(revision)&&revision>0,'RECOMMENDATION_REF_INVALID',400);
 return transaction(pool,async c=>{
  const current=await c.query<{revision:number}>(recommendationCurrent,[eventRef]);requireThat(current.rows[0]?.revision===revision,'RECOMMENDATION_STALE',409);
  const allowed=await c.query<{notifications_enabled:boolean}>('SELECT notifications_enabled FROM actor_preferences WHERE actor_id=$1',[actorId]);
  requireThat(allowed.rows[0]?.notifications_enabled===true,'RECOMMENDATION_NOT_ENABLED',403);
  const key=`recommendation:${actorId}:${recommendationId}:${eventRef}:${revision}`;
  const inserted=await c.query<{id:string}>(`INSERT INTO outbox(id,command_id,plan_id,actor_id,kind,purpose,state,expires_at,notification_key,event_ref,semantic_revision)
   VALUES($1,NULL,NULL,$2,'RECOMMENDATION','RECOMMENDATION','READY',clock_timestamp()+interval '1 hour',$3,$4,$5)
   ON CONFLICT DO NOTHING RETURNING id`,[randomUUID(),actorId,key,eventRef,revision]);
  return {queued:Boolean(inserted.rows[0]),key};
 });
}
export async function reconcile(pool:Pool,queue:Queue){
 // Reconciliation is durable-state repair, not a PostgreSQL queue executor. All effects run in BullMQ workers.
 await transaction(pool,async c=>{
  await c.query(`UPDATE outbox o SET state=CASE WHEN EXISTS(SELECT 1 FROM delivery_attempts a WHERE a.outbox_id=o.id AND a.lease_owner=o.lease_owner AND a.wire_started_at IS NOT NULL) THEN 'UNKNOWN' WHEN expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE 'READY' END,result_reason='LEASE_RECOVERY',lease_until=NULL WHERE state='RUNNING' AND lease_until<clock_timestamp()`);
  await c.query(`UPDATE outbox SET state='EXPIRED',result_reason='DEADLINE_BEFORE_SUBMIT' WHERE state IN ('READY','QUEUED','RETRY_WAIT') AND expires_at<=clock_timestamp()`);
  await c.query(`WITH due AS (
    INSERT INTO outbox(id,command_id,plan_id,actor_id,kind,purpose,state,expires_at,notification_key,semantic_revision)
    SELECT gen_random_uuid(),NULL,p.id,s.actor_id,'REMINDER','REMINDER','READY',
      LEAST(pp.meeting_time,clock_timestamp()+interval '1 hour'),
      'reminder:'||p.id::text||':'||s.actor_id::text||':'||extract(epoch FROM pp.meeting_time)::bigint::text||':'||pp.reconfirm_version::text,
      pp.reconfirm_version
    FROM plan_presentation pp JOIN plans p ON p.id=pp.plan_id
    JOIN plan_slots s ON s.plan_id=p.id AND s.state='ACTIVE'
    WHERE pp.meeting_time>clock_timestamp() AND pp.meeting_time<=clock_timestamp()+interval '24 hours'
      AND p.state->>'phase' NOT IN ('CANCELLED','CLOSED')
      AND COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=s.actor_id),true)
    ON CONFLICT DO NOTHING RETURNING actor_id,plan_id)
    INSERT INTO in_app_notifications(id,actor_id,kind,title,plan_id)
    SELECT gen_random_uuid(),actor_id,'PLAN_REMINDER','Скоро встреча по плану',plan_id FROM due`);
 });
 const due=await pool.query<{id:string;queue_generation:number}>(`UPDATE outbox SET queue_generation=queue_generation+1,queued_at=clock_timestamp(),state='QUEUED'
 WHERE id IN (SELECT id FROM outbox WHERE expires_at>clock_timestamp() AND (state IN ('READY','RETRY_WAIT') AND not_before<=clock_timestamp() OR state='QUEUED' AND queued_at<clock_timestamp()-interval '30 seconds') ORDER BY not_before LIMIT 100 FOR UPDATE SKIP LOCKED)
 RETURNING id,queue_generation`);
 for(const o of due.rows){
  try{await queue.add('deliver',{outboxId:o.id},{jobId:`${o.id}-${o.queue_generation}`,attempts:1,removeOnComplete:1000,removeOnFail:1000});}
  catch{ /* PG remains QUEUED. Reconciliation retries after 30s; no loss and no falsely rolled-back command. */ }
 }
 // Short-lived escrow/quarantine cleanup; immutable business audit is a separate retention policy.
 await pool.query(`UPDATE session_exchanges SET escrow=NULL WHERE escrow IS NOT NULL AND escrow_expires_at<clock_timestamp()`);
 await pool.query(`DELETE FROM session_bootstraps WHERE expires_at<clock_timestamp()-interval '1 hour'`);
 await pool.query(`UPDATE quarantine SET raw_cipher=NULL WHERE raw_cipher IS NOT NULL AND created_at<clock_timestamp()-interval '72 hours'`);
 await pool.query(`DELETE FROM quarantine WHERE created_at<clock_timestamp()-interval '30 days'`);
}
export async function deliver(pool:Pool,outboxId:string,transport:Transport,governor:Governor,mode:'test'|'demo'|'live'|'hybrid',links:BotConfig&{publicOrigin:string}={publicOrigin:'http://localhost:3000'}){
 const lease=randomUUID(),attempt=randomUUID();
 const reservation=await transaction(pool,async c=>{
  const control=await c.query<{hold:boolean}>('SELECT hold FROM outbound_control WHERE id=1');if(control.rows[0]?.hold!==false)return null;
  const r=await c.query<{id:string;actor_id:string;plan_id:string|null;kind:string;purpose:string;invite_ref:string|null;semantic_revision:number|null;event_ref:string|null;expected_selection_revision:number|null;expected_config_revision:number|null;attempt_count:number;expires_at:Date}>(`UPDATE outbox SET state='RUNNING',lease_owner=$2,lease_until=clock_timestamp()+interval '30 seconds',attempt_count=attempt_count+1
    WHERE id=$1 AND state IN ('READY','QUEUED','RETRY_WAIT') AND not_before<=clock_timestamp() AND expires_at>clock_timestamp() AND attempt_count<5 RETURNING id,actor_id,plan_id,kind,purpose,invite_ref,semantic_revision,event_ref,expected_selection_revision,expected_config_revision,attempt_count,expires_at`,[outboxId,lease]);
  const row=r.rows[0];if(!row)return null;
  await c.query('INSERT INTO delivery_attempts(id,outbox_id,lease_owner) VALUES($1,$2,$3)',[attempt,outboxId,lease]);
  const d=await c.query<{chat_id:string}>('SELECT chat_id FROM destinations WHERE actor_id=$1 AND active=true',[row.actor_id]);
  // Opening a miniapp is not proof of a bot conversation. In tests only, fake destinations are explicit fixture data.
  if(!d.rows[0]){await c.query(`UPDATE outbox SET state='CANCELLED',result_reason='NO_VERIFIED_DESTINATION',lease_until=NULL WHERE id=$1`,[outboxId]);
   await c.query(`UPDATE delivery_attempts SET outcome='CANCELLED',reason='NO_VERIFIED_DESTINATION',finished_at=clock_timestamp() WHERE id=$1`,[attempt]);return null;}
  if(row.kind!=='BOT_WELCOME'){
   const preference=await c.query<{enabled:boolean}>(`SELECT COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=$1),true) AS enabled`,[row.actor_id]);
   if(!preference.rows[0]?.enabled){await c.query("UPDATE outbox SET state='CANCELLED',result_reason='NOTIFICATIONS_DISABLED',lease_until=NULL WHERE id=$1",[outboxId]);return null;}
  }
  if(row.kind==='RECOMMENDATION'){
   const valid=await c.query<{revision:number}>(recommendationCurrent,[row.event_ref]);
   if(valid.rows[0]?.revision!==row.semantic_revision){await c.query("UPDATE outbox SET state='CANCELLED',result_reason='EVENT_STALE',lease_until=NULL WHERE id=$1",[outboxId]);return null;}
  }else if(row.kind==='PLAN_INVITE'){
   const valid=await c.query(`SELECT 1 FROM invites i JOIN in_app_notifications n ON n.plan_id=i.plan_id AND n.actor_id=$2 AND n.invite_ref=$3 AND n.kind='PLAN_INVITE'
    JOIN plans p ON p.id=i.plan_id WHERE i.plan_id=$1 AND i.token_hash=$4 AND NOT i.revoked AND i.expires_at>clock_timestamp() AND p.state->>'phase' NOT IN ('CANCELLED','CLOSED')
    AND NOT EXISTS(SELECT 1 FROM plan_slots s WHERE s.plan_id=i.plan_id AND s.actor_id=$2 AND s.state='ACTIVE')`,[row.plan_id,row.actor_id,row.invite_ref,digest(row.invite_ref??'')]);
   if(!valid.rowCount){await c.query("UPDATE outbox SET state='CANCELLED',result_reason='INVITE_REVOKED_OR_EXPIRED',lease_until=NULL WHERE id=$1",[outboxId]);return null;}
  }else if(row.kind==='RECONFIRMATION'||row.kind==='REMINDER'){
   const valid=await c.query(`SELECT 1 FROM plans p JOIN plan_presentation pp ON pp.plan_id=p.id JOIN plan_slots s ON s.plan_id=p.id AND s.actor_id=$2 AND s.state='ACTIVE'
    WHERE p.id=$1 AND p.state->>'phase' NOT IN ('CANCELLED','CLOSED') AND pp.reconfirm_version=$3
    AND ($4::text<>'REMINDER' OR pp.meeting_time>clock_timestamp())
    AND ($4::text<>'RECONFIRMATION' OR EXISTS(SELECT 1 FROM plan_rsvps r WHERE r.plan_id=p.id AND r.actor_id=$2 AND r.state='YES' AND r.reconfirm_version<pp.reconfirm_version))`,[row.plan_id,row.actor_id,row.semantic_revision,row.kind]);
   if(!valid.rowCount){await c.query("UPDATE outbox SET state='CANCELLED',result_reason='REVISION_OR_MEMBERSHIP_STALE',lease_until=NULL WHERE id=$1",[outboxId]);return null;}
  }else if(row.kind!=='BOT_WELCOME'){
   const acl=await c.query<{state:Plan}>(`SELECT p.state FROM plans p WHERE p.id=$1 AND (p.organizer_id=$2 OR EXISTS(SELECT 1 FROM plan_slots s WHERE s.plan_id=p.id AND s.actor_id=$2 AND s.state='ACTIVE'))`,[row.plan_id,row.actor_id]);
   if(!acl.rows[0]||!noticeStillCurrent(acl.rows[0].state,row.purpose,row.expected_selection_revision,row.expected_config_revision)){
    await c.query(`UPDATE outbox SET state='CANCELLED',result_reason='ACL_REVOKED_OR_STALE',lease_until=NULL WHERE id=$1`,[outboxId]);
    await c.query(`UPDATE delivery_attempts SET outcome='CANCELLED',reason='ACL_REVOKED_OR_STALE',finished_at=clock_timestamp() WHERE id=$1`,[attempt]);return null;}
  }
  let message:string,attachments:BotAttachment[]|undefined;
  if(row.kind==='BOT_WELCOME'){
   const reply=botMessage(row.purpose,links);message=reply.text;attachments=reply.attachments;
  }else{
   const link=launchLink(row.kind==='RECOMMENDATION'?{kind:'EVENT_REF',eventRef:row.event_ref!}:row.kind==='PLAN_INVITE'?{kind:'INVITE',inviteRef:row.invite_ref!}:{kind:'PLAN',planId:row.plan_id!},{mode,...links});
   if(links.botUsername){const notice=botNotice(row.kind==='RECOMMENDATION'?'RECOMMENDATION':row.kind==='PLAN_INVITE'?'PLAN_INVITE':row.kind==='RECONFIRMATION'?'RECONFIRMATION':row.kind==='REMINDER'?'REMINDER':'PLAN_NOTICE',link);message=notice.text;attachments=notice.attachments;}
   else message=(row.kind==='PLAN_INVITE'?'Вас пригласили в план.':row.kind==='RECONFIRMATION'?'Условия плана изменились. Проверьте и ответьте снова.':row.kind==='REMINDER'?'Скоро встреча по вашему плану.':'В плане есть обновление.')+'\n'+link;
  }
  // Durable uncertainty fence BEFORE governor. A crash while acquiring may conservatively become UNKNOWN.
  await c.query('UPDATE delivery_attempts SET wire_started_at=clock_timestamp() WHERE id=$1',[attempt]);
  return {row,message,attachments,chatId:d.rows[0].chat_id,attemptCount:row.attempt_count,expiresAt:row.expires_at.getTime()};
 });
 if(!reservation)return;
 let result:WireOutcome;let invoked=false;
 try{
  result=await governor.start(reservation.chatId,reservation.row.kind==='BOT_WELCOME'?'INTERACTIVE':'BACKGROUND',async()=>{
   requireThat(Date.now()<reservation.expiresAt,'EXPIRED_BEFORE_WIRE',409);
   const control=await pool.query<{hold:boolean}>('SELECT hold FROM outbound_control WHERE id=1');
   if(control.rows[0]?.hold!==false)return {kind:'DEAD',reason:'OUTBOUND_HOLD_BEFORE_WIRE'} as WireOutcome;
   const row=reservation.row;
   const destination=await pool.query<{chat_id:string}>('SELECT chat_id FROM destinations WHERE actor_id=$1 AND active=true',[row.actor_id]);
   if(destination.rows[0]?.chat_id!==reservation.chatId)return {kind:'DEAD',reason:'DESTINATION_REVOKED_BEFORE_WIRE'} as WireOutcome;
   if(row.kind!=='BOT_WELCOME'){
    const preference=await pool.query<{enabled:boolean}>(`SELECT COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=$1),true) AS enabled`,[row.actor_id]);
    if(!preference.rows[0]?.enabled)return {kind:'DEAD',reason:'NOTIFICATIONS_DISABLED_BEFORE_WIRE'} as WireOutcome;
   }
   if(row.kind==='RECOMMENDATION'){
    const valid=await pool.query<{revision:number}>(recommendationCurrent,[row.event_ref]);
    if(valid.rows[0]?.revision!==row.semantic_revision)return {kind:'DEAD',reason:'EVENT_STALE_BEFORE_WIRE'} as WireOutcome;
   }else if(row.kind==='PLAN_INVITE'){
    const valid=await pool.query(`SELECT 1 FROM invites i JOIN in_app_notifications n ON n.plan_id=i.plan_id AND n.actor_id=$2 AND n.invite_ref=$3 AND n.kind='PLAN_INVITE'
     JOIN plans p ON p.id=i.plan_id WHERE i.plan_id=$1 AND i.token_hash=$4 AND NOT i.revoked AND i.expires_at>clock_timestamp() AND p.state->>'phase' NOT IN ('CANCELLED','CLOSED')
     AND NOT EXISTS(SELECT 1 FROM plan_slots s WHERE s.plan_id=i.plan_id AND s.actor_id=$2 AND s.state='ACTIVE')`,[row.plan_id,row.actor_id,row.invite_ref,digest(row.invite_ref??'')]);
    if(!valid.rowCount)return {kind:'DEAD',reason:'INVITE_REVOKED_BEFORE_WIRE'} as WireOutcome;
   }else if(row.kind==='RECONFIRMATION'||row.kind==='REMINDER'){
    const valid=await pool.query(`SELECT 1 FROM plans p JOIN plan_presentation pp ON pp.plan_id=p.id JOIN plan_slots s ON s.plan_id=p.id AND s.actor_id=$2 AND s.state='ACTIVE'
     WHERE p.id=$1 AND p.state->>'phase' NOT IN ('CANCELLED','CLOSED') AND pp.reconfirm_version=$3
     AND ($4::text<>'REMINDER' OR pp.meeting_time>clock_timestamp())
     AND ($4::text<>'RECONFIRMATION' OR EXISTS(SELECT 1 FROM plan_rsvps r WHERE r.plan_id=p.id AND r.actor_id=$2 AND r.state='YES' AND r.reconfirm_version<pp.reconfirm_version))`,[row.plan_id,row.actor_id,row.semantic_revision,row.kind]);
    if(!valid.rowCount)return {kind:'DEAD',reason:'REVISION_STALE_BEFORE_WIRE'} as WireOutcome;
   }else if(row.kind!=='BOT_WELCOME'){
    const latest=await pool.query<{state:Plan}>(`SELECT p.state FROM plans p WHERE p.id=$1 AND (p.organizer_id=$2 OR EXISTS(SELECT 1 FROM plan_slots s WHERE s.plan_id=p.id AND s.actor_id=$2 AND s.state='ACTIVE'))`,[row.plan_id,row.actor_id]);
    if(!latest.rows[0]||!noticeStillCurrent(latest.rows[0].state,row.purpose,row.expected_selection_revision,row.expected_config_revision))return {kind:'DEAD',reason:'STALE_BEFORE_WIRE'} as WireOutcome;
   }
   // The link resolves against current ACL. Text contains no title, personal responses or old terms.
   invoked=true;return transport.send(attempt,outboxId,reservation.chatId,reservation.message,reservation.attachments);
  });
 }catch{result=invoked?{kind:'UNKNOWN',reason:'TRANSPORT_EXCEPTION'}:{kind:'RETRY_WAIT',retryAfterMs:1000,reason:'GOVERNOR_BEFORE_WIRE'};}
 if(result.kind==='RETRY_WAIT'){
  try{await governor.cooldown(result.retryAfterMs);}catch{ /* Redis loss closes later permits. Existing submission outcome remains explicit. */ }
  if(reservation.attemptCount>=5)result={kind:'DEAD',reason:'RETRY_BUDGET_EXHAUSTED'};
 }
 await transaction(pool,async c=>{
  // Fenced completion must never overwrite a reconciliation UNKNOWN or a newer owner.
  const updated=await c.query(`UPDATE outbox SET state=$3,result_reason=$4,provider_mid=$5,lease_until=NULL,not_before=clock_timestamp()+($6 * interval '1 millisecond') WHERE id=$1 AND lease_owner=$2 AND state='RUNNING'`,
   [outboxId,lease,result.kind,'reason' in result?result.reason:(mode==='test'?'TEST_ACCEPTED':'API_ACCEPTED_NOT_DELIVERED'),result.kind==='SUCCEEDED'?result.providerMessageId:null,result.kind==='RETRY_WAIT'?result.retryAfterMs:0]);
  requireThat(updated.rowCount===1,'DELIVERY_LEASE_LOST',409);
  await c.query(`UPDATE delivery_attempts SET outcome=$2,reason=$3,finished_at=clock_timestamp(),wire_started_at=CASE WHEN $4 THEN wire_started_at ELSE NULL END WHERE id=$1`,[attempt,result.kind,'reason' in result?result.reason:null,invoked]);
 });
}
