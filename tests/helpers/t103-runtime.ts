/** Real PG/Redis/BullMQ T103 failure matrix. Run only through artifacts/t103/run-runtime.mjs. */
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {fork,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {setTimeout as sleep} from 'node:timers/promises';
import {Queue,Worker} from 'bullmq';
import {Redis} from 'ioredis';
import {config} from '../../packages/platform/config.ts';
import {connect} from '../../packages/persistence/db.ts';
import {buildApp} from '../../apps/api/app.ts';
import {Governor} from '../../packages/platform/governor.ts';
import {TestTransport,type Transport} from '../../packages/platform/transport.ts';
import {deliver,reconcile} from '../../packages/persistence/delivery.ts';
const c=config();assert.equal(c.mode,'test');assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(new URL(c.databaseUrl).pathname,'/max23_test');
const {pool}=connect(c.databaseUrl),ctx=await buildApp(c);
const redis=new Redis(c.redisUrl,{maxRetriesPerRequest:1,enableOfflineQueue:false});redis.on('error',()=>{});await once(redis,'ready');
const queue=new Queue('max-effects',{connection:redis}),epoch=(await pool.query('SELECT epoch FROM outbound_control WHERE id=1')).rows[0].epoch;
const gov=new Governor(redis,c.credentialScope,epoch),tt=new TestTransport(pool,'test');
const children=new Set<ChildProcess>();
const input=createInterface({input:process.stdin});
const responses=new Map<string,(value:number)=>void>();
input.on('line',line=>{const [tag,id,value]=line.split(' ');if(tag==='T103_DONE')responses.get(id!)?.(Number(value));});
async function control(service:'redis'|'postgres',action:'start'|'stop'|'kill'){
 const id=randomUUID();const response=new Promise<number>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Docker control timeout')),65000);responses.set(id,n=>{clearTimeout(timer);responses.delete(id);resolve(n);});});
 process.stdout.write(`T103_CONTROL ${service} ${action} ${id}\n`);assert.equal(await response,0);
}
async function until(check:()=>Promise<boolean>,ms=20000){const end=Date.now()+ms;while(Date.now()<end){try{if(await check())return;}catch{}await sleep(100);}throw new Error('condition timed out');}
async function row(id:string){return (await pool.query('SELECT state,attempt_count,queue_generation,result_reason FROM outbox WHERE id=$1',[id])).rows[0]!;}
async function count(id:string){return Number((await pool.query('SELECT count(*) AS n FROM test_transport_receipts WHERE outbox_id=$1',[id])).rows[0].n);}
async function snapshot(id:string){return {...await row(id),receipts:await count(id)};}
function raw(){const id=BigInt('0x'+randomBytes(7).toString('hex')).toString();return `{"update_type":"bot_started","timestamp":${Date.now()},"chat_id":${id},"user":{"user_id":${id},"first_name":"T103_SYNTHETIC"}}`;}
async function accept(body:string){const r=await ctx.app.inject({method:'POST',url:'/api/v1/max/webhook',headers:{'content-type':'application/json','x-max-bot-api-secret':c.webhookSecret},payload:body});assert.equal(r.statusCode,200);return r.json();}
// Parse large integers without lossy JSON number roundtrip.
async function make(){const body=raw();await accept(body);return {body,id:(await pool.query('SELECT o.id FROM outbox o JOIN actors a ON a.id=o.actor_id WHERE a.external_id=$1',[/"user_id":(\d+)/.exec(body)![1]])).rows[0].id as string};}
async function enqueue(id:string,suffix=randomUUID()){return queue.add('deliver',{outboxId:id},{jobId:`${id}-${suffix}`,attempts:1,removeOnComplete:1000,removeOnFail:1000});}
async function worker(transport:Transport=tt){const connection=new Redis(c.redisUrl,{maxRetriesPerRequest:null});connection.on('error',()=>{});const w=new Worker('max-effects',j=>deliver(pool,j.data.outboxId,transport,gov,'test'),{connection,concurrency:4,lockDuration:30000,maxStalledCount:1});w.on('error',()=>{});await w.waitUntilReady();return {w,close:async()=>{await w.close();await connection.quit();}};}
function child(phase?:string,target?:string){const p=fork(new URL(phase?'./t103-worker.ts':'../../apps/worker/main.ts',import.meta.url),[],{execArgv:['--experimental-strip-types'],env:{...process.env,...(phase?{T103_PHASE:phase,T103_TARGET:target}:{})},stdio:['ignore','ignore','inherit','ipc']});children.add(p);p.once('exit',()=>children.delete(p));return p;}
function message(p:ChildProcess,value:string){return new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`child marker timeout ${value}`)),20000);const f=(m:unknown)=>{if(m===value){clearTimeout(timer);p.off('message',f);resolve();}};p.on('message',f);});}
async function kill(p:ChildProcess){if(p.exitCode!==null||p.signalCode!==null)return;const exit=once(p,'exit');p.kill('SIGKILL');await exit;}
async function seedGov(key=gov.key){const t=await redis.time(),now=Number(t[0])*1000+Math.floor(Number(t[1])/1000);await redis.set(key,JSON.stringify({epoch,lastTime:now,holdUntil:now,globalNext:0,cooldown:0,turn:0,seq:0,dests:{},waiters:{}}));}
await ctx.app.ready();await pool.query('SELECT 1');assert.equal(await redis.ping(),'PONG');
console.log(JSON.stringify({postgres:(await pool.query('SHOW server_version')).rows[0].server_version,redis:(await redis.info('server')).match(/redis_version:([^\r]+)/)?.[1],bullmq:JSON.parse(readFileSync(new URL('../../node_modules/bullmq/package.json',import.meta.url),'utf8')).version}));
// Only synthetic pending rows created by this isolated project's previous foundation run.
await pool.query("UPDATE outbox SET state='CANCELLED',result_reason='T103_FIXTURE_ISOLATION' WHERE state IN ('READY','QUEUED','RETRY_WAIT')");
await queue.obliterate({force:true});
let failures=0;const executed:string[]=[];
async function run(name:string,fn:()=>Promise<unknown>){if(process.env.T103_ONLY&&!process.env.T103_ONLY.split(',').includes(name))return;executed.push(name);const start=Date.now();try{const evidence=await fn();console.log('T103_RESULT '+JSON.stringify({name,status:'PASS',duration_ms:Date.now()-start,evidence}));}catch(e){failures++;console.log('T103_RESULT '+JSON.stringify({name,status:'FAIL',duration_ms:Date.now()-start,error:e instanceof Error?e.message:String(e)}));}finally{for(const p of children)await kill(p);}}
try{
 await run('normal-job',async()=>{const {id}=await make(),p=child();await until(async()=>(await row(id)).state==='SUCCEEDED');assert.equal(await count(id),1);await kill(p);return snapshot(id);});
 await run('duplicate',async()=>{const {body,id}=await make();assert.equal((await accept(body)).duplicate,true);const w=await worker();try{const a=await enqueue(id);await until(async()=>await a.getState()==='completed');const b=await enqueue(id);await until(async()=>await b.getState()==='completed');assert.equal(await count(id),1);assert.equal((await row(id)).attempt_count,1);return snapshot(id);}finally{await w.close();}});
 await run('concurrent-duplicate',async()=>{const body=raw();const results=await Promise.all(Array.from({length:8},()=>accept(body)));assert.equal(results.filter(r=>!r.duplicate).length,1);const id=(await pool.query('SELECT o.id FROM outbox o JOIN actors a ON a.id=o.actor_id WHERE a.external_id=$1',[/"user_id":(\d+)/.exec(body)![1]])).rows[0].id;const w=await worker();try{const jobs=await Promise.all(Array.from({length:8},()=>enqueue(id)));await until(async()=>(await Promise.all(jobs.map(j=>j.getState()))).every(s=>s==='completed'));assert.equal(await count(id),1);assert.equal((await row(id)).attempt_count,1);return snapshot(id);}finally{await w.close();}});
 for(const phase of ['before','during','after'])await run(phase==='after'?'worker-after-db-before-ack':`worker-${phase}`,async()=>{
  const {id}=await make(),p=child(phase,id);await message(p,'READY');const marker=message(p,phase.toUpperCase());const job=await enqueue(id);await marker;
  const atCrash=await snapshot(id);assert.equal(await job.getState(),'active');if(phase==='before'){assert.equal(atCrash.receipts,0);assert.equal(atCrash.attempt_count,0);}else assert.equal(atCrash.receipts,1);
  if(phase==='after')assert.equal(atCrash.state,'SUCCEEDED');await kill(p);
  const recovery=child();await until(async()=>['completed','failed'].includes(await job.getState()),95000);
  await until(async()=>(await row(id)).state===(phase==='during'?'UNKNOWN':'SUCCEEDED'),35000);
  await sleep(1200);assert.equal(await count(id),1);const result={atCrash,afterRecovery:await snapshot(id),bullState:await job.getState(),stalledCounter:(await queue.getJob(job.id!))?.stalledCounter};await kill(recovery);return result;
 });
 await run('worker-restart',async()=>{const {id}=await make();await reconcile(pool,queue);assert.ok(await queue.getJob(`${id}-${(await row(id)).queue_generation}`));const p=child();await until(async()=>(await row(id)).state==='SUCCEEDED');await kill(p);const again=child();await sleep(2000);await kill(again);assert.equal(await count(id),1);return snapshot(id);});
 await run('poison-job',async()=>{const {id}=await make(),times:number[]=[];const w=await worker({send:async()=>{times.push(Date.now());return {kind:'RETRY_WAIT',retryAfterMs:1000,reason:'SYNTHETIC_429'};}});try{await until(async()=>{await reconcile(pool,queue);return (await row(id)).state==='DEAD';},20000);assert.equal(times.length,5);for(let i=1;i<times.length;i++)assert.ok(times[i]!-times[i-1]!>=1000);const s=await snapshot(id);assert.equal(s.result_reason,'RETRY_BUDGET_EXHAUSTED');await sleep(1200);await reconcile(pool,queue);assert.equal((await row(id)).attempt_count,5);return {...s,gaps_ms:times.slice(1).map((t,i)=>t-times[i]!)};}finally{await w.close();}});
 await run('malformed-job',async()=>{const p=child();const job=await queue.add('deliver',{outboxId:'invalid'},{attempts:1,removeOnFail:1000});await until(async()=>await job.getState()==='failed');const current=await queue.getJob(job.id!);assert.equal(current!.attemptsMade,1);assert.match(current!.failedReason,/JOB_ID/);await sleep(1500);assert.equal(await job.getState(),'failed');await kill(p);return {state:await job.getState(),attemptsMade:current!.attemptsMade,reason:current!.failedReason};});
 await run('redis-loss',async()=>{const p=child();await sleep(1000);await control('redis','stop');try{const {id}=await make();await sleep(1800);assert.equal(await count(id),0);assert.ok(['READY','QUEUED','RETRY_WAIT'].includes((await row(id)).state));let sent=false;await assert.rejects(gov.start('synthetic','BACKGROUND',async()=>{sent=true;}));assert.equal(sent,false);const ready=await ctx.app.inject({method:'GET',url:'/health/ready'});assert.equal(ready.statusCode,200);const down=await snapshot(id);await control('redis','start');await until(async()=>await redis.ping()==='PONG');await until(async()=>(await row(id)).state==='SUCCEEDED',45000);assert.equal(await count(id),1);await kill(p);return {down,afterRecovery:await snapshot(id),readinessWhileRedisDown:ready.statusCode};}finally{await control('redis','start');}});
 await run('redis-restart',async()=>{const {id}=await make();await reconcile(pool,queue);const generation=(await row(id)).queue_generation;await queue.obliterate({force:true});await redis.del(gov.key);await control('redis','kill');await control('redis','start');await until(async()=>await redis.ping()==='PONG');let sent=false;await assert.rejects(gov.start('synthetic','BACKGROUND',async()=>{sent=true;}));assert.equal(sent,false);const p=child();await until(async()=>(await row(id)).attempt_count>0,45000);assert.equal(await count(id),0);await kill(p);const arm=fork(new URL('../../scripts/arm-test-outbound.ts',import.meta.url),[],{execArgv:['--experimental-strip-types'],stdio:['ignore','ignore','inherit','ipc']});const [armExit]=await once(arm,'exit');assert.equal(armExit,0);assert.notEqual((await pool.query('SELECT epoch FROM outbound_control WHERE id=1')).rows[0].epoch,epoch);await assert.rejects(gov.start('synthetic','BACKGROUND',async()=>assert.fail('stale epoch sent')));const recovery=child();await until(async()=>(await row(id)).state==='SUCCEEDED',15000);assert.equal(await count(id),1);await kill(recovery);return {initialGeneration:generation,afterRecovery:await snapshot(id),operatorAction:'existing arm-test-outbound.ts: fresh epoch, 10s warm hold, worker restart; old governor remains fenced'};});
 await run('pg-failure',async()=>{const {id}=await make();await reconcile(pool,queue);await control('postgres','stop');let p:ChildProcess|undefined;try{const r=await ctx.app.inject({method:'POST',url:'/api/v1/max/webhook',headers:{'content-type':'application/json','x-max-bot-api-secret':c.webhookSecret},payload:raw()});assert.equal(r.statusCode,503);p=child();await once(p,'exit');await control('postgres','start');await until(async()=>{await pool.query('SELECT 1');return true;});const recovery=child();await until(async()=>(await row(id)).state==='SUCCEEDED',45000);assert.equal(await count(id),1);await kill(recovery);return {http:r.statusCode,startWhilePgDownExit:p.exitCode,afterRecovery:await snapshot(id)};}finally{await control('postgres','start');}});
 await run('pg-active-failure',async()=>{const {id}=await make();const p=child('during',id);await message(p,'READY');const marker=message(p,'DURING');await enqueue(id);await marker;await control('postgres','stop');await kill(p);await control('postgres','start');await until(async()=>{await pool.query('SELECT 1');return true;});const recovery=child();await until(async()=>(await row(id)).state==='UNKNOWN',45000);assert.equal(await count(id),1);await kill(recovery);return snapshot(id);});
 await run('pg-live-failure',async()=>{
  const p=child();await sleep(700);await control('postgres','stop');
  try{const response=await ctx.app.inject({method:'GET',url:'/health/ready'});assert.equal(response.statusCode,503);await sleep(1500);assert.equal(p.exitCode,null);await control('postgres','start');await until(async()=>{await pool.query('SELECT 1');return true;});const {id}=await make();await until(async()=>(await row(id)).state==='SUCCEEDED');assert.equal(await count(id),1);assert.equal(p.exitCode,null);return {sameWorkerAlive:true,readyDuringOutage:503,...await snapshot(id)};}
  finally{await control('postgres','start');await kill(p);}
 });
 await run('pg-final-commit-failure',async()=>{
  const {id}=await make();const liveEpoch=(await pool.query('SELECT epoch FROM outbound_control WHERE id=1')).rows[0].epoch;
  const connection=new Redis(c.redisUrl,{maxRetriesPerRequest:null});connection.on('error',()=>{});
  const transport:Transport={send:async(...args)=>{const result=await tt.send(...args);await control('postgres','stop');return result;}};
  const w=new Worker('max-effects',j=>deliver(pool,j.data.outboxId,transport,new Governor(redis,c.credentialScope,liveEpoch),'test'),{connection,concurrency:4,lockDuration:30000,maxStalledCount:1});w.on('error',()=>{});
  try{await w.waitUntilReady();const job=await enqueue(id);await until(async()=>await job.getState()==='failed');await control('postgres','start');await until(async()=>{await pool.query('SELECT 1');return true;});assert.equal(await count(id),1);assert.equal((await row(id)).state,'RUNNING');const recovery=child();await until(async()=>(await row(id)).state==='UNKNOWN',45000);await kill(recovery);assert.equal(await count(id),1);return {bullState:await job.getState(),...await snapshot(id)};}
  finally{await control('postgres','start');await w.close();await connection.quit();}
 });
 await run('graceful-shutdown',async()=>{const {id}=await make(),lock=await pool.connect();let released=false;await lock.query('BEGIN');await lock.query('LOCK TABLE test_transport_receipts IN ACCESS EXCLUSIVE MODE');const p=child();try{await until(async()=>(await row(id)).state==='RUNNING');await sleep(300);const exit=once(p,'exit');p.kill('SIGTERM');await sleep(500);assert.equal(p.exitCode,null);await lock.query('COMMIT');released=true;const [code,signal]=await exit;assert.equal(code,0);assert.equal(signal,null);assert.equal((await row(id)).state,'SUCCEEDED');assert.equal(await count(id),1);return {exit:code,signal,...await snapshot(id)};}finally{if(!released)await lock.query('ROLLBACK');lock.release();await kill(p);}});
 await run('governor',async()=>{
  const g=new Governor(redis,`t103-${randomUUID()}`,epoch),script=readFileSync(new URL('../../packages/platform/governor.lua',import.meta.url),'utf8');
  await seedGov(g.key);
  try{
   const invoke=(dest:string,id=randomUUID())=>redis.eval(script,1,g.key,epoch,id,dest,'BACKGROUND',0) as Promise<string[]>;
   const first=await invoke('one');assert.equal(first[0],'GRANTED');
   await sleep(70);const waitingId=randomUUID(),blocked=await invoke('one',waitingId);assert.equal(blocked[0],'WAIT'); // Global gap elapsed; destination gap still enforced.
   await sleep(550);const granted=await invoke('one',waitingId);assert.equal(granted[0],'GRANTED');assert.ok(Number(granted[1])-Number(first[1])>=600);
   const globalWait=await invoke('two');assert.equal(globalWait[0],'WAIT');
   await sleep(60); // Remove the abandoned two request only by its normal waiter expiry before testing throughput.
   await sleep(2000);const times:number[]=[];
   for(let i=0;i<6;i++){const id=randomUUID();let r:string[];do{r=await invoke('dest-'+i,id);if(r[0]==='WAIT')await sleep(5);}while(r[0]==='WAIT');assert.equal(r[0],'GRANTED');times.push(Number(r[1]));}
   for(let i=1;i<times.length;i++)assert.ok(times[i]!-times[i-1]!>=50);
   await redis.del(g.key);let called=false;await assert.rejects(g.start('one','BACKGROUND',async()=>{called=true;}),(e:unknown)=>e instanceof Error&&e.message==='GOVERNOR_HOLD');assert.equal(called,false);
   await seedGov(g.key);await control('redis','stop');await control('redis','start');await until(async()=>await redis.ping()==='PONG');assert.ok(await redis.get(g.key));
   await assert.rejects(new Governor(redis,`t103-missing-${randomUUID()}`,epoch).start('one','BACKGROUND',async()=>assert.fail('unlimited fallback')),(e:unknown)=>e instanceof Error&&e.message==='GOVERNOR_HOLD');
   return {destination_gap_ms:Number(granted[1])-Number(first[1]),global_gaps_ms:times.slice(1).map((t,i)=>t-times[i]!),blocked,globalWait,missingState:'HOLD',aofRestart:'state retained'};
  }finally{await redis.del(g.key);}
 });
}finally{for(const p of children)await kill(p);await queue.close();redis.disconnect();await ctx.app.close();await pool.end();input.close();process.stdin.pause();}
assert.ok(executed.length>0);console.log(JSON.stringify({t103Failures:failures,executed}));process.exitCode=failures?1:0;
