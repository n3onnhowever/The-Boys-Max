import {noticeStillCurrent} from '../domain/notices.ts';
import type {Plan} from '../contracts/domain.ts';
import {launchLink} from '../platform/links.ts';
import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {Queue} from 'bullmq';
import type {Transport} from '../platform/transport.ts';
import type {Governor} from '../platform/governor.ts';
import type {WireOutcome} from '../contracts/domain.ts';
import {transaction} from './sessions.ts';
import {requireThat} from '../domain/errors.ts';
export async function reconcile(pool:Pool,queue:Queue){
 // Reconciliation is durable-state repair, not a PostgreSQL queue executor. All effects run in BullMQ workers.
 await transaction(pool,async c=>{
  await c.query(`UPDATE outbox o SET state=CASE WHEN EXISTS(SELECT 1 FROM delivery_attempts a WHERE a.outbox_id=o.id AND a.lease_owner=o.lease_owner AND a.wire_started_at IS NOT NULL) THEN 'UNKNOWN' WHEN expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE 'READY' END,result_reason='LEASE_RECOVERY',lease_until=NULL WHERE state='RUNNING' AND lease_until<clock_timestamp()`);
  await c.query(`UPDATE outbox SET state='EXPIRED',result_reason='DEADLINE_BEFORE_SUBMIT' WHERE state IN ('READY','QUEUED','RETRY_WAIT') AND expires_at<=clock_timestamp()`);
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
export async function deliver(pool:Pool,outboxId:string,transport:Transport,governor:Governor,mode:'test'|'live',links:{publicOrigin:string;botUsername?:string}={publicOrigin:'http://localhost:3000'}){
 const lease=randomUUID(),attempt=randomUUID();
 const reservation=await transaction(pool,async c=>{
  const control=await c.query<{hold:boolean}>('SELECT hold FROM outbound_control WHERE id=1');if(control.rows[0]?.hold!==false)return null;
  const r=await c.query<{id:string;actor_id:string;plan_id:string|null;kind:string;purpose:string;expected_selection_revision:number|null;expected_config_revision:number|null;attempt_count:number;expires_at:Date}>(`UPDATE outbox SET state='RUNNING',lease_owner=$2,lease_until=clock_timestamp()+interval '30 seconds',attempt_count=attempt_count+1
    WHERE id=$1 AND state IN ('READY','QUEUED','RETRY_WAIT') AND not_before<=clock_timestamp() AND expires_at>clock_timestamp() AND attempt_count<5 RETURNING id,actor_id,plan_id,kind,purpose,expected_selection_revision,expected_config_revision,attempt_count,expires_at`,[outboxId,lease]);
  const row=r.rows[0];if(!row)return null;
  await c.query('INSERT INTO delivery_attempts(id,outbox_id,lease_owner) VALUES($1,$2,$3)',[attempt,outboxId,lease]);
  const d=await c.query<{chat_id:string}>('SELECT chat_id FROM destinations WHERE actor_id=$1',[row.actor_id]);
  // Opening a miniapp is not proof of a bot conversation. In tests only, fake destinations are explicit fixture data.
  if(!d.rows[0]){await c.query(`UPDATE outbox SET state='CANCELLED',result_reason='NO_VERIFIED_DESTINATION',lease_until=NULL WHERE id=$1`,[outboxId]);
   await c.query(`UPDATE delivery_attempts SET outcome='CANCELLED',reason='NO_VERIFIED_DESTINATION',finished_at=clock_timestamp() WHERE id=$1`,[attempt]);return null;}
  if(row.kind!=='BOT_WELCOME'){
   const acl=await c.query<{state:Plan}>(`SELECT p.state FROM plans p WHERE p.id=$1 AND (p.organizer_id=$2 OR EXISTS(SELECT 1 FROM plan_slots s WHERE s.plan_id=p.id AND s.actor_id=$2 AND s.state='ACTIVE'))`,[row.plan_id,row.actor_id]);
   if(!acl.rows[0]||!noticeStillCurrent(acl.rows[0].state,row.purpose,row.expected_selection_revision,row.expected_config_revision)){
    await c.query(`UPDATE outbox SET state='CANCELLED',result_reason='ACL_REVOKED_OR_STALE',lease_until=NULL WHERE id=$1`,[outboxId]);
    await c.query(`UPDATE delivery_attempts SET outcome='CANCELLED',reason='ACL_REVOKED_OR_STALE',finished_at=clock_timestamp() WHERE id=$1`,[attempt]);return null;}
  }
  const link=launchLink(row.kind==='BOT_WELCOME'?{kind:'PERSONAL'}:{kind:'PLAN',planId:row.plan_id!},{mode,...links});
  const message=(row.kind==='BOT_WELCOME'?'Личная афиша: выбирайте события без создания группы. Совместный план создаётся отдельно.':row.purpose==='CANCELLATION'?'Совместный план отменён. Проверьте его актуальное состояние.':row.purpose==='REMINDER'?'Напоминание по вашему запросу. Проверьте актуальные условия и срок подтверждения.':'В совместном плане есть изменение. Откройте актуальные условия.')+'\n'+link;
  // Durable uncertainty fence BEFORE governor. A crash while acquiring may conservatively become UNKNOWN.
  await c.query('UPDATE delivery_attempts SET wire_started_at=clock_timestamp() WHERE id=$1',[attempt]);
  return {row,message,chatId:d.rows[0].chat_id,attemptCount:row.attempt_count,expiresAt:row.expires_at.getTime()};
 });
 if(!reservation)return;
 let result:WireOutcome;let invoked=false;
 try{
  result=await governor.start(reservation.chatId,'BACKGROUND',async()=>{
   requireThat(Date.now()<reservation.expiresAt,'EXPIRED_BEFORE_WIRE',409);
   const control=await pool.query<{hold:boolean}>('SELECT hold FROM outbound_control WHERE id=1');
   if(control.rows[0]?.hold!==false)return {kind:'DEAD',reason:'OUTBOUND_HOLD_BEFORE_WIRE'} as WireOutcome;
   const row=reservation.row;
   if(row.kind!=='BOT_WELCOME'){
    const latest=await pool.query<{state:Plan}>(`SELECT p.state FROM plans p WHERE p.id=$1 AND (p.organizer_id=$2 OR EXISTS(SELECT 1 FROM plan_slots s WHERE s.plan_id=p.id AND s.actor_id=$2 AND s.state='ACTIVE'))`,[row.plan_id,row.actor_id]);
    if(!latest.rows[0]||!noticeStillCurrent(latest.rows[0].state,row.purpose,row.expected_selection_revision,row.expected_config_revision))return {kind:'DEAD',reason:'STALE_BEFORE_WIRE'} as WireOutcome;
   }
   // The link resolves against current ACL. Text contains no title, personal responses or old terms.
   invoked=true;return transport.send(attempt,outboxId,reservation.chatId,reservation.message);
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
