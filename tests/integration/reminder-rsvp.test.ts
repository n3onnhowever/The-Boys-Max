/** PostgreSQL + Redis/BullMQ fixtures; TestTransport only. No MAX ingress/network. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import {Queue} from 'bullmq';
import {Redis} from 'ioredis';
import {buildApp} from '../../apps/api/app.ts';
import {config} from '../../packages/platform/config.ts';
import {socialService} from '../../packages/persistence/social.ts';
import {reconcile,deliver} from '../../packages/persistence/delivery.ts';
import {Governor} from '../../packages/platform/governor.ts';
import {TestTransport,type Transport} from '../../packages/platform/transport.ts';
import type {Plan,Slot} from '../../packages/contracts/domain.ts';

const cfg=config();assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');
const {app,pool,plans}=await buildApp(cfg),social=socialService(pool),redis=new Redis(cfg.redisUrl,{maxRetriesPerRequest:1});
const scope='synthetic-rsvp-'+randomUUID(),epoch=randomUUID(),queue=new Queue(scope,{connection:redis}),gov=new Governor(redis,scope,epoch),sink=new TestTransport(pool,'test');
redis.on('error',()=>{});
before(async()=>{
 await app.ready();await pool.query("UPDATE outbound_control SET hold=false,reason='SYNTHETIC_RSVP_TEST' WHERE id=1");
 const t=await redis.time();await redis.set(gov.key,JSON.stringify({epoch,lastTime:Number(t[0])*1000+Math.floor(Number(t[1])/1000),holdUntil:0,globalNext:0,cooldown:0,turn:0,seq:0,dests:{},waiters:{}}));
});
after(async()=>{await queue.close();await redis.del(gov.key);await redis.quit();await app.close();});
async function actor(){
 const id=randomUUID(),external=BigInt('0x'+randomBytes(7).toString('hex')).toString();
 await pool.query("INSERT INTO actors(id,external_id,display_name) VALUES($1,$2,'SYNTHETIC RSVP')",[id,external]);
 await pool.query("INSERT INTO destinations(actor_id,chat_id,verified_at,source_digest) VALUES($1,$2,clock_timestamp(),'SYNTHETIC_RSVP')",[id,external]);return id;
}
async function fixture(){
 const owner=await actor(),member=await actor();
 const slot=(id:string):Slot=>({slotId:randomUUID(),label:'SYNTHETIC slot',required:true,actorId:id,state:'ACTIVE'});
 const slots=[slot(owner),{slotId:randomUUID(),label:'SYNTHETIC guest',required:false,actorId:null,state:'UNBOUND' as const}];
 const p=await plans.create(owner,randomUUID(),{title:'SYNTHETIC reminder',slots,rule:{kind:'ALL'},decisionDeadline:new Date(Date.now()+7200000).toISOString(),commitmentDeadline:new Date(Date.now()+10800000).toISOString()});
 const invite=await plans.invite(owner,p.planId,randomUUID(),1);await plans.requestJoin(member,invite.inviteRef);
 await plans.command(owner,p.planId,randomUUID(),{kind:'ROSTER',expectedStateVersion:1,slots:[slots[0]!,slot(member)],rule:{kind:'ALL'},decisionDeadline:new Date(Date.now()+7200000).toISOString(),reason:'SYNTHETIC approval'},randomUUID());
 const presentation=await social.savePlanPresentation(owner,p.planId,{title:'SYNTHETIC reminder',meetingTime:new Date(Date.now()+3600000).toISOString(),meetingPoint:null,note:null,participantLimit:null,expectedVersion:0});
 return {owner,member,id:p.planId,presentation};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function reminders(f:Fixture,actor=f.member){return (await pool.query<{id:string;state:string;semantic_revision:number;result_reason:string}>("SELECT id,state,semantic_revision,result_reason FROM outbox WHERE plan_id=$1 AND actor_id=$2 AND kind='REMINDER' ORDER BY semantic_revision",[f.id,actor])).rows;}
const receipts=async(id:string)=>(await pool.query('SELECT 1 FROM test_transport_receipts WHERE outbox_id=$1',[id])).rowCount;
const state=async(f:Fixture)=>(await pool.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[f.id])).rows[0]!.state;
async function invalidate(f:Fixture,change:'CANCEL'|'REMOVE'|'MEETING'){
 const current=await state(f);
 if(change==='CANCEL')await plans.command(f.owner,f.id,randomUUID(),{kind:'CANCEL',expectedStateVersion:current.stateVersion,reason:'SYNTHETIC cancel'},randomUUID());
 else if(change==='REMOVE')await plans.command(f.owner,f.id,randomUUID(),{kind:'ROSTER',expectedStateVersion:current.stateVersion,slots:current.slots.map(s=>s.actorId===f.member?{...s,state:'LEFT'}:s),rule:current.rule,decisionDeadline:current.decisionDeadline,reason:'SYNTHETIC removal'},randomUUID());
 else await social.savePlanPresentation(f.owner,f.id,{...f.presentation,meetingTime:new Date(Date.now()+5400000).toISOString(),expectedVersion:1});
}
function barrier(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
class PausedGovernor extends Governor{
 reached=barrier();resume=barrier();
 override async start<T>(destination:string,kind:'INTERACTIVE'|'BACKGROUND',wire:()=>Promise<T>):Promise<T>{this.reached.resolve();await this.resume.promise;return super.start(destination,kind,wire);}
}
test('K5 NO before scheduling suppresses outbox and in-app reminders without removing membership/history',async()=>{
 const f=await fixture();await social.setPlanRsvp(f.member,f.id,'NO',1);const original=await state(f);
 await reconcile(pool,queue);await reconcile(pool,queue);
 assert.equal((await reminders(f)).length,0);
 assert.equal((await social.notifications(f.member)).items.some(n=>n.kind==='PLAN_REMINDER'&&n.planId===f.id),false);
 assert.deepEqual(await state(f),original);assert.equal((await social.planRsvps(f.member,f.id)).items.find(r=>r.actorId===f.member)?.state,'NO');
 assert.equal((await pool.query("SELECT 1 FROM plan_slots WHERE plan_id=$1 AND actor_id=$2 AND state='ACTIVE'",[f.id,f.member])).rowCount,1);
});
test('K5 YES → NO after enqueue cancels on reconciliation, hides existing in-app reminder and keeps dedup',async()=>{
 const f=await fixture();await social.setPlanRsvp(f.member,f.id,'YES',1);await reconcile(pool,queue);const [row]=await reminders(f);assert.ok(row);assert.equal(row.state,'QUEUED');
 assert.ok((await social.notifications(f.member)).items.some(n=>n.kind==='PLAN_REMINDER'&&n.planId===f.id));
 await social.setPlanRsvp(f.member,f.id,'NO',1);
 const shown=await social.notifications(f.member);assert.equal(shown.items.some(n=>n.kind==='PLAN_REMINDER'&&n.planId===f.id),false);
 assert.equal(shown.unreadCount,(await social.unreadCount(f.member)).unreadCount);
 await reconcile(pool,queue);await reconcile(pool,queue);await deliver(pool,row.id,sink,gov,'test');
 assert.equal((await reminders(f))[0]?.state,'CANCELLED');assert.equal(await receipts(row.id),0);assert.equal((await reminders(f)).length,1);
 assert.equal((await pool.query("SELECT 1 FROM in_app_notifications WHERE plan_id=$1 AND actor_id=$2 AND kind='PLAN_REMINDER'",[f.id,f.member])).rowCount,1,'audit/history row is retained');
});
test('K5 reservation independently suppresses declined queued reminder',async()=>{
 const f=await fixture();await reconcile(pool,queue);const [row]=await reminders(f);assert.ok(row);
 await social.setPlanRsvp(f.member,f.id,'NO',1);await deliver(pool,row.id,sink,gov,'test');
 assert.equal((await reminders(f))[0]?.state,'CANCELLED');assert.equal(await receipts(row.id),0);
});
test('K5 NO during governor wait suppresses final pre-wire submission',async()=>{
 const f=await fixture();await reconcile(pool,queue);const [row]=await reminders(f);assert.ok(row);
 const paused=new PausedGovernor(redis,scope,epoch),running=deliver(pool,row.id,sink,paused,'test');
 await paused.reached.promise;
 try{await social.setPlanRsvp(f.member,f.id,'NO',1);}finally{paused.resume.resolve();}
 await running;assert.equal(await receipts(row.id),0);assert.equal((await reminders(f))[0]?.state,'DEAD');
 const attempt=await pool.query<{wire_started_at:Date|null}>("SELECT wire_started_at FROM delivery_attempts WHERE outbox_id=$1",[row.id]);assert.equal(attempt.rows[0]?.wire_started_at,null);
});
test('K5 stale NO remains declined after meeting change; stale RSVP update is rejected',async()=>{
 const f=await fixture();await social.setPlanRsvp(f.member,f.id,'NO',1);
 const changed=await social.savePlanPresentation(f.owner,f.id,{...f.presentation,meetingTime:new Date(Date.now()+5400000).toISOString(),expectedVersion:1});assert.equal(changed.reconfirmVersion,2);
 await assert.rejects(social.setPlanRsvp(f.member,f.id,'YES',1),/VERSION_CONFLICT/);
 await reconcile(pool,queue);assert.equal((await reminders(f)).length,0);assert.equal((await social.planRsvps(f.member,f.id)).items.find(r=>r.actorId===f.member)?.state,'NO');
});
test('K5 changed meeting invalidates old queued reminder and schedules only the current version',async()=>{
 const f=await fixture();await social.setPlanRsvp(f.member,f.id,'YES',1);await reconcile(pool,queue);
 await social.savePlanPresentation(f.owner,f.id,{...f.presentation,meetingTime:new Date(Date.now()+5400000).toISOString(),expectedVersion:1});
 await reconcile(pool,queue);await reconcile(pool,queue);const rows=await reminders(f);assert.equal(rows.length,2);assert.equal(rows[0]?.state,'CANCELLED');assert.equal(rows[1]?.semantic_revision,2);
 await deliver(pool,rows[0]!.id,sink,gov,'test');assert.equal(await receipts(rows[0]!.id),0);
});
for(const change of ['CANCEL','REMOVE'] as const)test(`K5 ${change} invalidates a queued reminder`,async()=>{
 const f=await fixture();await reconcile(pool,queue);const [row]=await reminders(f);assert.ok(row);await invalidate(f,change);
 await reconcile(pool,queue);await deliver(pool,row.id,sink,gov,'test');assert.equal((await reminders(f))[0]?.state,'CANCELLED');assert.equal(await receipts(row.id),0);
});
for(const change of ['CANCEL','REMOVE','MEETING'] as const)test(`K5 ${change} during governor wait is checked again before wire`,async()=>{
 const f=await fixture();await reconcile(pool,queue);const [row]=await reminders(f);assert.ok(row);
 const paused=new PausedGovernor(redis,scope,epoch),running=deliver(pool,row.id,sink,paused,'test');await paused.reached.promise;
 try{await invalidate(f,change);}finally{paused.resume.resolve();}
 await running;assert.equal(await receipts(row.id),0);assert.equal((await reminders(f))[0]?.state,'DEAD');
});
test('K5 nonparticipating organizer retains administration without receiving participant reminders',async()=>{
 const f=await fixture(),current=await state(f);
 await plans.command(f.owner,f.id,randomUUID(),{kind:'ROSTER',expectedStateVersion:current.stateVersion,slots:current.slots.map(s=>s.actorId===f.owner?{...s,state:'LEFT'}:s),rule:current.rule,decisionDeadline:current.decisionDeadline,reason:'SYNTHETIC organizer not attending'},randomUUID());
 await reconcile(pool,queue);assert.equal((await reminders(f,f.owner)).length,0);assert.equal((await reminders(f)).length,1);
 assert.equal((await social.planPresentation(f.owner,f.id)).organizerId,f.owner);
});
test('K5 scheduling sees an in-progress decline after acquiring the plan lock',async()=>{
 const f=await fixture(),db=await pool.connect();await db.query('BEGIN');
 let running:Promise<void>|undefined;
 try{
  await db.query('SELECT id FROM plans WHERE id=$1 FOR UPDATE',[f.id]);
  await db.query("INSERT INTO plan_rsvps(plan_id,actor_id,state,reconfirm_version) VALUES($1,$2,'NO',1)",[f.id,f.member]);
  running=reconcile(pool,queue);
  let blocked=false;for(let n=0;n<100;n++){
   const waiting=await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT p.id%FOR SHARE OF p'");
   if(waiting.rowCount){blocked=true;break;}await sleep(10);
  }
  assert.ok(blocked,'scheduler must wait for the uncommitted response');
  await db.query('COMMIT');await running;assert.equal((await reminders(f)).length,0);
 }finally{await db.query('ROLLBACK');db.release();await running;}
});
test('K5 organizer, YES, MAYBE and unanswered retain existing active-slot reminder policy; organizer NO suppresses',async()=>{
 for(const response of ['YES','MAYBE',null] as const){
  const f=await fixture();if(response)await social.setPlanRsvp(f.member,f.id,response,1);await reconcile(pool,queue);
  assert.equal((await reminders(f,f.owner)).length,1);const [row]=await reminders(f);assert.ok(row);await deliver(pool,row.id,sink,gov,'test');assert.equal(await receipts(row.id),1);
 }
 const f=await fixture();await social.setPlanRsvp(f.owner,f.id,'NO',1);await reconcile(pool,queue);assert.equal((await reminders(f,f.owner)).length,0);
});
test('K5 foreign actor cannot change plan RSVP',async()=>{
 const f=await fixture(),foreign=await actor();await social.setPlanRsvp(f.member,f.id,'NO',1);
 await assert.rejects(social.setPlanRsvp(foreign,f.id,'YES',1),/FORBIDDEN/);
 assert.equal((await social.planRsvps(f.member,f.id)).items.find(r=>r.actorId===f.member)?.state,'NO');
});
test('K5 concurrent decline serializes after wire entry; uncertain submission remains UNKNOWN',async()=>{
 const f=await fixture();await reconcile(pool,queue);const [row]=await reminders(f);assert.ok(row);
 const entered=barrier(),finish=barrier();
 const transport:Transport={async send(){entered.resolve();await finish.promise;return {kind:'UNKNOWN',reason:'SYNTHETIC_WIRE_STARTED'};}};
 const running=deliver(pool,row.id,transport,gov,'test');await entered.promise;
 let changed=false;const decline=social.setPlanRsvp(f.member,f.id,'NO',1).then(()=>{changed=true;});
 try{
  // Wait until PostgreSQL observes the competing RSVP waiting for the plan lock.
  let blocked=false;for(let n=0;n<100;n++){
   const wait=await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT state->>%FOR UPDATE%'");
   if(wait.rowCount){blocked=true;break;}await sleep(10);
  }
  assert.ok(blocked,'RSVP must serialize with the final eligibility check and submission');assert.equal(changed,false);
 }finally{finish.resolve();await Promise.all([running,decline]);}
 await reconcile(pool,queue);await reconcile(pool,queue);assert.equal((await reminders(f))[0]?.state,'UNKNOWN');assert.equal(await receipts(row.id),0);
 assert.equal((await social.planRsvps(f.member,f.id)).items.find(r=>r.actorId===f.member)?.state,'NO');
});
