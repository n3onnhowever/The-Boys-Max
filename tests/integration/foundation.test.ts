/** Real dependencies required. No skip-as-PASS and no in-memory database/queue substitute.
 * Only an isolated max23_test database and explicit test transport are accepted.
 * Stop the ordinary Compose worker before this suite; this file owns its BullMQ workers.
 */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {Queue,Worker} from 'bullmq';
import {Redis} from 'ioredis';
import {buildApp} from '../../apps/api/app.ts';
import {config} from '../../packages/platform/config.ts';
import {Governor} from '../../packages/platform/governor.ts';
import {TestTransport} from '../../packages/platform/transport.ts';
import {reconcile,deliver} from '../../packages/persistence/delivery.ts';
import {digest} from '../../packages/platform/auth.ts';
import {AppError} from '../../packages/domain/errors.ts';
import type {Command,Plan,Slot} from '../../packages/contracts/domain.ts';
import {terms,sign} from '../fixtures.ts';
const c=config();
assert.equal(process.env.RUN_MAX23_INTEGRATION,'1','Explicit opt-in required');
assert.equal(c.mode,'test');assert.equal(new URL(c.databaseUrl).pathname,'/max23_test');
const ctx=await buildApp(c),{app,pool,plans,sessions}=ctx;
const suffix=randomUUID(),queueName=`max23-it-${suffix}`,scope=`isolated-it-${suffix}`,epoch=randomUUID();
const redis=new Redis(c.redisUrl,{maxRetriesPerRequest:1}),workerRedis=new Redis(c.redisUrl,{maxRetriesPerRequest:null});
redis.on('error',()=>{});workerRedis.on('error',()=>{});
const queue=new Queue(queueName,{connection:redis});const gov=new Governor(redis,scope,epoch);
const users=[randomUUID(),randomUUID(),randomUUID()];const [O,A,B]=users as [string,string,string];
const slotId=randomUUID();const dec=new Date(Date.now()+3600_000).toISOString(),com=new Date(Date.now()+7200_000).toISOString();
function slot(actorId:string|null):Slot{return {slotId,label:'Synthetic slot',required:true,actorId,state:actorId?'ACTIVE':'UNBOUND'};}
async function state(planId:string){return (await pool.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[planId])).rows[0]!.state;}
type Input<C=Command>=C extends Command?Omit<C,'expectedStateVersion'>:never;
async function cmd(actor:string,id:string,command:Input,key=randomUUID()){
 return plans.command(actor,id,key,{...command,expectedStateVersion:(await state(id)).stateVersion} as Command,randomUUID());
}
async function create(actor=O,participant:string|null=O){return plans.create(actor,randomUUID(),{title:'SYNTHETIC INTEGRATION',slots:[slot(participant)],rule:{kind:'ALL'},decisionDeadline:dec,commitmentDeadline:com});}
const code=(name:string)=>(e:unknown)=>e instanceof AppError&&e.code===name;
async function until(check:()=>Promise<boolean>,ms=15000){const end=Date.now()+ms;while(Date.now()<end){if(await check())return;await sleep(50);}assert.fail('condition timed out');}
async function notice(){const p=await create();const optionId=randomUUID();await cmd(O,p.planId,{kind:'ADD_OPTION',optionId,snapshotId:randomUUID(),terms} as Command);await cmd(O,p.planId,{kind:'START'});await cmd(O,p.planId,{kind:'RESPOND',optionId,termsRevision:1,value:'CAN'} as Command);await cmd(O,p.planId,{kind:'SELECT',optionId,allowProvisional:false,reason:''} as Command);return (await pool.query<{id:string}>('SELECT id FROM outbox WHERE plan_id=$1',[p.planId])).rows[0]!.id;}
before(async()=>{
 await app.ready();await pool.query('SELECT 1');await redis.ping();
 for(const id of users){const external=BigInt('0x'+randomBytes(7).toString('hex')).toString();await pool.query('INSERT INTO actors(id,external_id,display_name) VALUES($1,$2,$3)',[id,external,'SYNTHETIC']);await pool.query('INSERT INTO destinations(actor_id,chat_id,verified_at,source_digest) VALUES($1,$2,clock_timestamp(),$3)',[id,external,'TEST_ONLY']);}
 await pool.query("UPDATE outbound_control SET hold=false,reason='ISOLATED_TEST_SUITE' WHERE id=1");
 const tm=await redis.time(),now=Number(tm[0])*1000+Math.floor(Number(tm[1])/1000);
 await redis.set(gov.key,JSON.stringify({epoch,lastTime:now,holdUntil:now+10000,globalNext:0,cooldown:0,turn:0,seq:0,dests:{},waiters:{}}));
 await sleep(10050); // Real warm hold, not a fabricated timing pass.
});
after(async()=>{await queue.close();await redis.del(gov.key);await redis.quit();await workerRedis.quit();await app.close();});

test('IT-01: R5 nonparticipant organizer + invite privacy + R3 version confirmation in PostgreSQL',async()=>{
 const p=await create(O,null),id=p.planId;const invite=await plans.invite(O,id,randomUUID(),1);
 assert.deepEqual(await plans.ownJoin(A,invite.inviteRef),{state:'NONE'});
 assert.equal((await pool.query('SELECT 1 FROM join_requests WHERE plan_id=$1',[id])).rowCount,0);
 await assert.rejects(plans.read(A,id),code('NOT_FOUND'));
 await plans.requestJoin(A,invite.inviteRef);await cmd(O,id,{kind:'ROSTER',slots:[slot(A)],rule:{kind:'ALL'},decisionDeadline:dec,reason:'User requested admission'} as Command);
 const opt=randomUUID(),s1=randomUUID();await cmd(A,id,{kind:'ADD_OPTION',optionId:opt,snapshotId:s1,terms} as Command);
 await cmd(O,id,{kind:'START'});await cmd(A,id,{kind:'RESPOND',optionId:opt,termsRevision:1,value:'CAN'} as Command);
 await cmd(O,id,{kind:'SELECT',optionId:opt,allowProvisional:false,reason:''} as Command);
 const v1=(await state(id)).selectionRevision;await cmd(A,id,{kind:'COMMIT',selectionRevision:v1,value:'CONFIRMED'} as Command);
 const s2=randomUUID();await cmd(O,id,{kind:'EDIT_OPTION',optionId:opt,snapshotId:s2,terms:{...terms,place:'Changed synthetic location'},cosmetic:false,reason:'Material location change'} as Command);
 const v2=(await state(id)).selectionRevision;assert.equal(v2,v1+1);
 await assert.rejects(cmd(A,id,{kind:'COMMIT',selectionRevision:v1,value:'CONFIRMED'} as Command),code('SELECTION_STALE'));
 const r=await cmd(A,id,{kind:'COMMIT',selectionRevision:v2,value:'CONFIRMED'} as Command);assert.equal(r.status,'APPLIED');
 const fresh=await plans.read(A,id);assert.equal(fresh.confirmation,'CONFIRMED');assert.deepEqual(fresh.commitments.map(x=>x.selectionRevision),[v1,v2]);
 assert.equal((await state(id)).slots.some(s=>s.actorId===O),false);assert.equal((await plans.read(O,id)).capabilities.canManage,true);
 await assert.rejects(pool.query("UPDATE snapshots SET body=body||'{\"tampered\":true}'::jsonb WHERE id=$1",[s1]));
 assert.equal((await pool.query('SELECT 1 FROM snapshots WHERE id IN ($1,$2)',[s1,s2])).rowCount,2);
});

test('IT-02: persisted receipt replay, payload conflict, stale version and ACL-before-replay',async()=>{
 const p=await create(),id=p.planId,key=randomUUID(),co:Command={kind:'ADD_OPTION',expectedStateVersion:1,optionId:randomUUID(),snapshotId:randomUUID(),terms};
 const first=await plans.command(O,id,key,co,'r1');assert.deepEqual(await plans.command(O,id,key,co,'r2'),first);
 await assert.rejects(plans.command(O,id,key,{...co,terms:{...terms,title:'Different'}},'r3'),code('IDEMPOTENCY_CONFLICT'));
 await assert.rejects(plans.command(O,id,randomUUID(),co,'r4'),code('VERSION_CONFLICT'));
 const inv=await plans.invite(O,id,randomUUID(),2);await plans.requestJoin(A,inv.inviteRef);await cmd(O,id,{kind:'ROSTER',slots:[slot(A)],rule:{kind:'ALL'},decisionDeadline:dec,reason:'Approved'} as Command);
 const aKey=randomUUID(),aCo:Command={kind:'ADD_OPTION',expectedStateVersion:(await state(id)).stateVersion,optionId:randomUUID(),snapshotId:randomUUID(),terms};
 await plans.command(A,id,aKey,aCo,'a1');await cmd(O,id,{kind:'ROSTER',slots:[slot(null)],rule:{kind:'ALL'},decisionDeadline:dec,reason:'Removed'} as Command);
 await assert.rejects(plans.command(A,id,aKey,aCo,'a2'),code('NOT_FOUND'));
});

test('IT-03: two admissions race for one slot; only one applies',async()=>{
 const p=await create(O,null),id=p.planId,inv=await plans.invite(O,id,randomUUID(),1);await plans.requestJoin(A,inv.inviteRef);await plans.requestJoin(B,inv.inviteRef);
 const co=(actorId:string):Command=>({kind:'ROSTER',expectedStateVersion:1,slots:[slot(actorId)],rule:{kind:'ALL'},decisionDeadline:dec,reason:'Approve own pending request'});
 const rs=await Promise.allSettled([plans.command(O,id,randomUUID(),co(A),'race1'),plans.command(O,id,randomUUID(),co(B),'race2')]);
 assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);assert.equal(rs.filter(r=>r.status==='rejected'&&code('VERSION_CONFLICT')(r.reason)).length,1);
 assert.equal((await pool.query("SELECT 1 FROM plan_slots WHERE plan_id=$1 AND state='ACTIVE'",[id])).rowCount,1);
});

test('IT-04: bootstrap/session exchange retry, reload, CSRF, logout revokes escrow',async()=>{
 const b=await sessions.bootstrap(),key=randomUUID(),proof=sign(c.botToken,`{"id":9223372036854775700,"first_name":"SYNTHETIC"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()});
 const [s,r]=await Promise.all([sessions.exchange(b.binding,b.body.csrfToken,proof,key,undefined),sessions.exchange(b.binding,b.body.csrfToken,proof,key,undefined)]);assert.equal(s.token,r.token);
 const cookie=`__Host-max_session=${s.token}`;
 assert.equal((await app.inject({method:'GET',url:'/api/v1/session',headers:{cookie}})).statusCode,200);
 assert.equal((await app.inject({method:'GET',url:'/api/v1/session',headers:{cookie:'__Host-max_session=invalid'}})).statusCode,401);
 for(const h of [{origin:'https://wrong.invalid','x-csrf-token':s.body.csrfToken},{origin:c.publicOrigin,'x-csrf-token':'wrong'}])assert.equal((await app.inject({method:'POST',url:'/api/v1/session/logout',headers:{cookie,'content-type':'application/json',...h},payload:{}})).statusCode,403);
 assert.equal((await app.inject({method:'POST',url:'/api/v1/session/logout',headers:{cookie,origin:c.publicOrigin,'x-csrf-token':s.body.csrfToken,'content-type':'application/json'},payload:{}})).statusCode,200);
 await assert.rejects(sessions.exchange(b.binding,b.body.csrfToken,proof,key,undefined),code('REAUTH_REQUIRED'));
 await assert.rejects(sessions.authenticate(s.token),code('SESSION_EXPIRED'));
});

test('IT-05: webhook durable ACK, duplicate, quarantine, wrong secret and body limit',async()=>{
 const raw=`{"update_type":"bot_started","timestamp":${Date.now()},"chat_id":9223372036854775701,"user":{"user_id":9223372036854775702,"first_name":"SYNTHETIC"}}`;
 const send=(payload:string,secret=c.webhookSecret)=>app.inject({method:'POST',url:'/api/v1/max/webhook',headers:{'content-type':'application/json','x-max-bot-api-secret':secret},payload});
 assert.equal((await send(raw,'wrong')).statusCode,403);assert.equal((await send(raw)).statusCode,200);assert.equal((await send(raw)).json().duplicate,true);
 assert.equal((await pool.query("SELECT 1 FROM actors WHERE external_id='9223372036854775702'")).rowCount,1);
 assert.equal((await send('{broken')).json().quarantined,true);assert.equal((await send('x'.repeat(1048577))).statusCode,413);
 assert.ok((await pool.query("SELECT 1 FROM quarantine WHERE reason='MALFORMED_UPDATE'")).rowCount!>0);
});

test('IT-06: database unavailable never acknowledges authenticated webhook',async()=>{
 const bad=new URL(c.databaseUrl);bad.hostname='127.0.0.1';bad.port='1';const x=await buildApp({...c,databaseUrl:bad.toString()});
 try{const r=await x.app.inject({method:'POST',url:'/api/v1/max/webhook',headers:{'content-type':'application/json','x-max-bot-api-secret':c.webhookSecret},payload:'{}'});assert.equal(r.statusCode,503);}finally{await x.app.close();}
});

test('IT-07: Redis down preserves committed PostgreSQL action; later reconciliation enqueues',async()=>{
 const id=await notice();const down=new Redis('redis://127.0.0.1:1',{maxRetriesPerRequest:0,retryStrategy:()=>null,lazyConnect:true,connectTimeout:200,enableOfflineQueue:false});down.on('error',()=>{});await down.connect().catch(()=>{});
 const q=new Queue(`down-${suffix}`,{connection:down});try{await reconcile(pool,q);assert.equal((await pool.query('SELECT state FROM outbox WHERE id=$1',[id])).rows[0]!.state,'QUEUED');}finally{await q.close();down.disconnect();}
 await pool.query("UPDATE outbox SET queued_at=clock_timestamp()-interval '31 seconds' WHERE id=$1",[id]);await reconcile(pool,queue);
 const row=(await pool.query('SELECT queue_generation FROM outbox WHERE id=$1',[id])).rows[0]!;const queued=await queue.getJob(`${id}-${row.queue_generation}`);assert.ok(queued);await queued.remove();
 await pool.query("UPDATE outbox SET queued_at=clock_timestamp()-interval '31 seconds' WHERE id=$1",[id]);await reconcile(pool,queue);
 assert.ok(await queue.getJob(`${id}-${Number(row.queue_generation)+1}`)); // Actual scoped job loss in Redis, recovered from PG.
});

test('IT-08: real BullMQ workers use PostgreSQL outbox + explicit test transport, not MAX',async()=>{
 const id=await notice();const transport=new TestTransport(pool,'test');
 const worker=new Worker(queueName,job=>deliver(pool,job.data.outboxId,transport,gov,'test'),{connection:workerRedis,concurrency:2});worker.on('error',()=>{});
 try{await worker.waitUntilReady();await reconcile(pool,queue);await until(async()=>{await reconcile(pool,queue);return (await pool.query('SELECT state FROM outbox WHERE id=$1',[id])).rows[0]!.state==='SUCCEEDED';},20000);
 assert.equal((await pool.query('SELECT 1 FROM test_transport_receipts WHERE outbox_id=$1',[id])).rowCount,1);
 const result=(await pool.query('SELECT provider_mid,result_reason FROM outbox WHERE id=$1',[id])).rows[0]!;assert.match(result.provider_mid,/^TEST_ONLY_/);assert.equal(result.result_reason,'TEST_ACCEPTED');
 }finally{await worker.close();}
});

test('IT-09: scoped Redis key loss fences sends; restore requires an explicit new epoch',async()=>{
 const key=`maxgov:{${digest('loss-'+suffix)}}:state`,loss=new Governor(redis,'loss-'+suffix,epoch);let called=false;
 await redis.del(key);await assert.rejects(loss.start('1','INTERACTIVE',async()=>{called=true;return true;}),code('GOVERNOR_HOLD'));assert.equal(called,false);
 // No FLUSHALL, no real MAX network and no implicit governor reinitialization.
});

test('IT-10: SIGKILL after test submission becomes UNKNOWN, never blind resend',{timeout:60000},async()=>{
 const id=await notice();
 const child=fork(new URL('../helpers/kill-worker.ts',import.meta.url),[],{execArgv:['--experimental-strip-types'],env:{...process.env,IT_QUEUE:queueName,IT_SCOPE:scope,IT_EPOCH:epoch,IT_OUTBOX:id},stdio:['ignore','ignore','inherit','ipc']});
 try{
  await once(child,'message',{signal:AbortSignal.timeout(15000)});
  const entered=new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('wire entry timeout')),15000);child.on('message',m=>{if(m==='WIRE_ENTERED'){clearTimeout(timer);resolve();}});});
  await reconcile(pool,queue);await entered;
  child.kill('SIGKILL');await once(child,'exit');await sleep(31000);
  await reconcile(pool,queue);assert.equal((await pool.query('SELECT state FROM outbox WHERE id=$1',[id])).rows[0]!.state,'UNKNOWN');
  await reconcile(pool,queue);assert.equal((await pool.query('SELECT 1 FROM test_transport_receipts WHERE outbox_id=$1',[id])).rowCount,1);
 }finally{if(child.exitCode===null)child.kill('SIGKILL');}
});


test('IT-11: authenticated HTTP plan creation preserves Origin, CSRF and idempotency headers',async()=>{
 const b=await sessions.bootstrap(),proof=sign(c.botToken,'{"id":9223372036854775699,"first_name":"HTTP_SYNTHETIC"}',Math.floor(Date.now()/1000),{query_id:randomUUID()});
 const session=await sessions.exchange(b.binding,b.body.csrfToken,proof,randomUUID(),undefined),key=randomUUID();
 const headers={cookie:`__Host-max_session=${session.token}`,origin:c.publicOrigin,'content-type':'application/json','x-csrf-token':session.body.csrfToken,'idempotency-key':key};
 const payload={title:'HTTP SYNTHETIC',slots:[slot(session.body.actor.id)],rule:{kind:'ALL'},decisionDeadline:dec,commitmentDeadline:com};
 const first=await app.inject({method:'POST',url:'/api/v1/plans',headers,payload});assert.equal(first.statusCode,200,first.body);
 const replay=await app.inject({method:'POST',url:'/api/v1/plans',headers,payload});assert.deepEqual(replay.json(),first.json());
 const read=await app.inject({method:'GET',url:`/api/v1/plans/${first.json().planId}`,headers:{cookie:headers.cookie}});assert.equal(read.statusCode,200);
 await sessions.logout((await sessions.authenticate(session.token)).familyId);
});

test('IT-12 PC002: PG cancellation notice after commitment deadline, before event; no renewed ask',async()=>{
 const id=await notice(),old=(await pool.query<{plan_id:string}>('SELECT plan_id FROM outbox WHERE id=$1',[id])).rows[0]!,p=await state(old.plan_id);
 // Explicit synthetic clock fixture: accepted historical commitment deadline, future event.
 p.commitmentDeadline=new Date(Date.now()-60000).toISOString();
 await pool.query('UPDATE plans SET state=$2 WHERE id=$1',[p.planId,p]);
 await cmd(O,p.planId,{kind:'CANCEL',reason:'SYNTHETIC cancellation after deadline'});
 const r=await pool.query<{id:string;future:boolean}>("SELECT id,expires_at>clock_timestamp() AS future FROM outbox WHERE plan_id=$1 AND purpose='CANCELLATION'",[p.planId]);
 assert.ok(r.rows.length>0);assert.equal(r.rows[0]!.future,true);
 await deliver(pool,r.rows[0]!.id,new TestTransport(pool,'test'),gov,'test');
 assert.equal((await pool.query('SELECT state FROM outbox WHERE id=$1',[r.rows[0]!.id])).rows[0]!.state,'SUCCEEDED');
 await deliver(pool,id,new TestTransport(pool,'test'),gov,'test');
 assert.notEqual((await pool.query('SELECT state FROM outbox WHERE id=$1',[id])).rows[0]!.state,'SUCCEEDED');
});

test('IT-13: invite raw timestamp maps to ISO on create and receipt replay',async()=>{
 const p=await create(),key=randomUUID();
 const first=await plans.invite(O,p.planId,key,1);
 assert.equal(new Date(first.expiresAt).toISOString(),first.expiresAt);
 assert.deepEqual(await plans.invite(O,p.planId,key,1),first);
});

test('IT-14: concurrent and sequential SELECT receipt replay creates and delivers one semantic notice',async()=>{
 const p=await create(),optionId=randomUUID();
 await cmd(O,p.planId,{kind:'ADD_OPTION',optionId,snapshotId:randomUUID(),terms} as Command);
 await cmd(O,p.planId,{kind:'START'});
 await cmd(O,p.planId,{kind:'RESPOND',optionId,termsRevision:1,value:'CAN'} as Command);
 const key=randomUUID(),select:Command={kind:'SELECT',optionId,allowProvisional:false,reason:'',expectedStateVersion:(await state(p.planId)).stateVersion};
 const results=await Promise.all(Array.from({length:8},(_,i)=>plans.command(O,p.planId,key,select,`t103-duplicate-${i}`)));
 for(const r of results)assert.deepEqual(r,results[0]);
 assert.deepEqual(await plans.command(O,p.planId,key,select,'t103-sequential'),results[0]);
 assert.equal((await pool.query("SELECT 1 FROM command_audit WHERE plan_id=$1 AND kind='SELECT'",[p.planId])).rowCount,1);
 const effects=await pool.query<{id:string}>('SELECT id FROM outbox WHERE plan_id=$1',[p.planId]);assert.equal(effects.rowCount,1);
 const id=effects.rows[0]!.id,q=new Queue(`${queueName}-command-duplicates`,{connection:redis});
 const w=new Worker(q.name,j=>deliver(pool,j.data.outboxId,new TestTransport(pool,'test'),gov,'test'),{connection:workerRedis,concurrency:4});w.on('error',()=>{});
 try{await w.waitUntilReady();const jobs=await Promise.all(Array.from({length:8},(_,i)=>q.add('deliver',{outboxId:id},{jobId:`${id}-duplicate-${i}`,attempts:1,removeOnComplete:1000,removeOnFail:1000})));
  await until(async()=>(await Promise.all(jobs.map(j=>j.getState()))).every(s=>s==='completed'));
  assert.equal((await pool.query('SELECT 1 FROM test_transport_receipts WHERE outbox_id=$1',[id])).rowCount,1);
  assert.equal((await pool.query('SELECT attempt_count FROM outbox WHERE id=$1',[id])).rows[0]!.attempt_count,1);
 }finally{await w.close();await q.close();}
});
