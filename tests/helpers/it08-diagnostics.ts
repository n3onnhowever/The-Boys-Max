import {AsyncLocalStorage} from 'node:async_hooks';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {Queue,type Job,type Worker} from 'bullmq';
import {Redis} from 'ioredis';
import pg,{type Pool,type QueryResultRow} from 'pg';
import type {Governor} from '../../packages/platform/governor.ts';
import {reconcile} from '../../packages/persistence/delivery.ts';
import type {Transport} from '../../packages/platform/transport.ts';

export type NoticeIdentity={id:string;purpose:string;kind:string};
export type OutboxObservation={state:string;queue_generation:number;result_reason:string|null;due:boolean};
type Input={
 pool:Pool;databaseUrl:string;redisUrl:string;queue:Queue;governor:Governor;
 scope:string;notices:NoticeIdentity[];outboxId:string;synthetic:boolean;
};
type Entry={event:string;at:string;elapsedMs:number;data:object};
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const code=(value:unknown)=>typeof value==='string'&&/^[A-Z0-9_]{1,80}$/.test(value)?value:null;
const safeError=(error:unknown)=>error instanceof Error?
 {code:code('code' in error?error.code:null),messageCode:code(error.message),messageHash:hash(error.message)}:{code:'NON_ERROR'};
const wall=()=>new Date().toISOString();
async function read<T>(operation:()=>Promise<T>){
 try{return {value:await operation()};}catch(error){return {error:safeError(error)};}
}
function provenance(){
 const git=(ref:string)=>execFileSync('git',['rev-parse',ref],{encoding:'utf8',timeout:1000}).trim();
 return {sha:git('HEAD'),tree:git('HEAD^{tree}'),lockSha256:hash(readFileSync('package-lock.json'))};
}
function jobIdentity(job?:Job){
 return {jobId:job?.id??null,outboxId:job?.data.outboxId??null};
}

export class It08Diagnostics {
 readonly input:Input;
 private readonly started=performance.now();
 private readonly runId=process.env.INTEGRATION_RUN_ID??randomUUID();
 private readonly processor=new AsyncLocalStorage<string>();
 private readonly trace:Entry[]=[];
 private readonly reconciliation:Entry[]=[];
 private readonly admission:Entry[]=[];
 private readonly observations:Entry[]=[];
 private readonly transportCalls:Entry[]=[];
 private destinationHash?:string;
 private ready=false;
 private reconcileCount=0;
 private lastObservation?:OutboxObservation;
 private lastTransition?:Entry;

 constructor(input:Input){this.input=input;}

 private record(event:string,data:object,trace=this.trace,limit=256){
  const entry={event,at:wall(),elapsedMs:performance.now()-this.started,data};
  if(trace.length===limit)trace.shift();
  trace.push(entry);
  return entry;
 }

 observe(row:OutboxObservation){
  const observation=this.record('OUTBOX_OBSERVED',{...row,reconcile:this.reconcileCount},this.observations,420);
  if(!this.lastObservation||this.lastObservation.state!==row.state||this.lastObservation.queue_generation!==row.queue_generation||
     this.lastObservation.result_reason!==row.result_reason)this.lastTransition=observation;
  this.lastObservation=row;
 }

 async reconcile(){
  const call=++this.reconcileCount;
  const {pool,queue}=this.input;
  const originalAdd=queue.add;
  queue.add=async (...args:Parameters<Queue['add']>)=>{
   const jobId=args[2]?.jobId;
   this.record('ENQUEUE_START',{call,jobId});
   try{
    const job=await originalAdd.apply(queue,args);
    this.record('ENQUEUE_END',{call,...jobIdentity(job)});
    return job;
   }catch(error){
    this.record('ENQUEUE_ERROR',{call,jobId,error:safeError(error)});
    throw error;
   }
  };
  this.record('RECONCILE_START',{call,previousObservation:this.lastObservation},this.reconciliation,840);
  try{await reconcile(pool,queue);this.record('RECONCILE_END',{call},this.reconciliation,840);}
  catch(error){this.record('RECONCILE_ERROR',{call,error:safeError(error)},this.reconciliation,840);throw error;}
  finally{queue.add=originalAdd;}
 }

 // Observe the existing eval promise; the governor retains its original grant/guard logic.
 watchGovernor(){
  const {governor,outboxId}=this.input;
  const originalEval=governor.redis.eval;
  governor.redis.eval=((...args:Parameters<Redis['eval']>)=>{
   const jobId=this.processor.getStore();
   const begin=performance.now();
   const result=Reflect.apply(originalEval,governor.redis,args) as Promise<unknown>;
   if(jobId&&args[2]===governor.key&&args[6]!==undefined){
    if(jobId.startsWith(outboxId+'-'))this.destinationHash=String(args[5]);
    void result.then(reply=>{
     const elapsedMs=performance.now()-begin;
     const [status,detail]=Array.isArray(reply)?reply:[];
     this.record('GOVERNOR_EVAL',{jobId,status:code(status),reason:code(detail),
      delayOrRedisTime:typeof detail==='string'&&/^\d{1,16}$/.test(detail)?Number(detail):null,observerRoundTripMs:elapsedMs},this.admission,384);
    },error=>{this.record('GOVERNOR_EVAL_ERROR',{jobId,error:safeError(error)},this.admission,384);});
   }
   return result;
  }) as Redis['eval'];
  return ()=>{governor.redis.eval=originalEval;};
 }

 watchWorker(worker:Worker){
  worker.on('ready',()=>this.workerReady());
  worker.on('active',job=>this.record('WORKER_ACTIVE',jobIdentity(job)));
  worker.on('completed',job=>this.record('WORKER_COMPLETED',jobIdentity(job)));
  worker.on('stalled',jobId=>this.record('WORKER_STALLED',{jobId}));
  worker.on('failed',(job,error)=>this.record('WORKER_FAILED',{...jobIdentity(job),error:safeError(error)}));
  worker.on('error',error=>this.record('WORKER_ERROR',{error:safeError(error)}));
 }

 workerReady(){
  if(this.ready)return;
  this.ready=true;
  this.record('WORKER_READY',{});
 }

 async process(job:Job,deliver:()=>Promise<void>){
  this.record('PROCESSOR_START',jobIdentity(job));
  try{await this.processor.run(job.id!,deliver);this.record('PROCESSOR_END',jobIdentity(job));}
  catch(error){this.record('PROCESSOR_ERROR',{...jobIdentity(job),error:safeError(error)});throw error;}
 }

 transport(transport:Transport):Transport{
  return {send:async (...args)=>{
   const [attemptId,outboxId]=args;
   const jobId=this.processor.getStore();
   this.record('TRANSPORT_BEGIN',{attemptId,outboxId,jobId},this.transportCalls);
   try{
    const outcome=await transport.send(...args);
    this.record('TRANSPORT_RETURN',{attemptId,outboxId,jobId,outcome:outcome.kind},this.transportCalls);
    return outcome;
   }catch(error){
    this.record('TRANSPORT_ERROR',{attemptId,outboxId,jobId,error:safeError(error)},this.transportCalls);
    throw error;
   }
  }};
 }

 private async postgres(){
  const {databaseUrl,outboxId}=this.input;
  const client=new pg.Client({connectionString:databaseUrl,application_name:'it08-failure-capture',
   connectionTimeoutMillis:1000,statement_timeout:650,query_timeout:850,options:'-c default_transaction_read_only=on'});
  client.on('error',()=>{});
  try{
   const connection=await read(()=>client.connect());
   if('error' in connection)return {connection};
   const query=<T extends QueryResultRow>(sql:string,args:unknown[]=[])=>read(async()=>(await client.query<T>(sql,args)).rows);
   const clock=await query('SELECT clock_timestamp()::text AS now,pg_backend_pid() AS diagnostic_pid,current_setting(\'max_connections\')::int AS max_connections,(SELECT count(*)::int FROM pg_stat_activity WHERE backend_type=\'client backend\') AS client_connections');
   const outbox=await query<OutboxObservation>(`SELECT id,state,kind,purpose,attempt_count,queue_generation,not_before::text,queued_at::text,expires_at::text,lease_until::text,
    md5(lease_owner::text) AS lease_correlation,result_reason,provider_mid IS NOT NULL AS provider_mid_present,
    not_before<=clock_timestamp() AS due,expires_at<=clock_timestamp() AS expired FROM outbox WHERE id=$1`,[outboxId]);
   const attempts=await query<{finished_at:string|null;wire_started_at:string|null}>(`SELECT id,md5(lease_owner::text) AS lease_correlation,started_at::text,
    wire_started_at::text,finished_at::text,outcome,reason FROM delivery_attempts WHERE outbox_id=$1 ORDER BY started_at,id`,[outboxId]);
   const receipts=await query(`SELECT attempt_id,outbox_id,created_at::text FROM test_transport_receipts WHERE outbox_id=$1 ORDER BY created_at,attempt_id`,[outboxId]);
   const activity=await query(`SELECT pid,application_name='it08-failure-capture' AS diagnostic,state,wait_event_type,wait_event,
    xact_start::text,query_start::text,extract(epoch FROM (clock_timestamp()-xact_start))*1000 AS transaction_age_ms,
    CASE WHEN wait_event_type='Lock' THEN pg_blocking_pids(pid) ELSE '{}'::int[] END AS blocked_by
    FROM pg_stat_activity WHERE datname=current_database() ORDER BY xact_start NULLS LAST,pid LIMIT 40`);
   const locks=await query(`SELECT l.pid,l.locktype,l.mode,l.granted,l.relation::regclass::text AS relation,l.page,l.tuple,l.transactionid::text,l.classid,l.objid,l.objsubid
    FROM pg_locks l JOIN pg_stat_activity a USING(pid) WHERE a.datname=current_database()
    ORDER BY l.granted,l.pid,l.locktype,l.mode LIMIT 120`);
   const otherOutbox=await query(`SELECT kind,state,count(*)::int AS count,
    count(*) FILTER (WHERE not_before<=clock_timestamp() AND expires_at>clock_timestamp())::int AS due_count,
    max(queue_generation) AS highest_generation FROM outbox WHERE id<>$1 GROUP BY kind,state ORDER BY kind,state LIMIT 80`,[outboxId]);
   const control=await query('SELECT hold,epoch FROM outbound_control WHERE id=1');
   return {clock,outbox,attempts,receipts,activity,locks,otherOutbox,control};
  }finally{void client.end().catch(()=>{});}
 }

 private async redis(database:Promise<{value?:Awaited<ReturnType<It08Diagnostics['postgres']>>}>){
  const {queue,governor,redisUrl,outboxId}=this.input;
  const client=new Redis(redisUrl,{lazyConnect:true,connectTimeout:1000,commandTimeout:1000,maxRetriesPerRequest:0,
   retryStrategy:()=>null,enableOfflineQueue:false,enableReadyCheck:false});
  client.on('error',()=>{});
  let view:Queue|undefined;
  try{
   const connection=await read(()=>client.connect());
   if('error' in connection)return {connection};
   view=new Queue(queue.name,{connection:client,skipVersionCheck:true,skipMetasUpdate:true});
   view.on('error',()=>{});
   const key=view.toKey;
   const time=await read(async()=>{const [seconds,microseconds]=await client.time();return Number(seconds)*1000+Math.floor(Number(microseconds)/1000);});
   const governorState=await read(async()=>{
    const [raw,ttlMs]=await Promise.all([client.get(governor.key),client.pttl(governor.key)]);
    if(raw===null)return {hold:'MISSING_EPOCH',ttlMs};
    const s=JSON.parse(raw),now=time.value;
    const destNext=this.destinationHash?s.dests[this.destinationHash]??0:null;
    return {ttlMs,epoch:s.epoch===governor.epoch?governor.epoch:null,epochAgreement:s.epoch===governor.epoch,lastTime:s.lastTime,
     hold:now===undefined?'TIME_UNAVAILABLE':s.epoch!==governor.epoch?'STALE_EPOCH':now<s.lastTime?'CLOCK_REGRESSION':now<s.holdUntil?'WARM_HOLD':null,
     holdUntil:s.holdUntil,globalNext:s.globalNext,cooldownUntil:s.cooldown,destinationNext:destNext,
     earliestAdmissionMs:Math.max(s.holdUntil,s.globalNext,s.cooldown,destNext??0),waiterCount:Object.keys(s.waiters).length};
   });
   const backlog=await read(async()=>{
    const [waiting,active,delayed,completed,failed,stalled]=await Promise.all([
     client.llen(key('wait')),client.llen(key('active')),client.zcard(key('delayed')),client.zcard(key('completed')),
     client.zcard(key('failed')),client.scard(key('stalled'))]);
    return {waiting,active,delayed,completed,failed,stalled};
   });
   const db=await database;
   const generation=db.value?.outbox?.value?.[0]?.queue_generation??this.lastObservation?.queue_generation;
   // Probe the first job even if PostgreSQL was unreachable and no enqueue completed.
   const traced=this.trace.map(({data})=>('jobId' in data&&typeof data.jobId==='string'?data.jobId:null))
    .filter((id):id is string=>id!==null&&id.startsWith(outboxId+'-'));
   const ids=[...new Set([outboxId+'-1',...(generation?[outboxId+'-'+generation]:[]),...traced.slice(-30)])];
   const q=view;
   const jobs=await Promise.all(ids.map(async jobId=>{
    const [state,details]=await Promise.all([read(()=>q.getJobState(jobId)),read(async()=>{
     const [[timestamp,processedOn,finishedOn,attemptsStarted,attemptsMade,stalledCount,failedReason],lockTtlMs,stalledMember]=await Promise.all([
      client.hmget(key(jobId),'timestamp','processedOn','finishedOn','ats','atm','stc','failedReason'),
      client.pttl(key(jobId+':lock')),client.sismember(key('stalled'),jobId)]);
     return {timestamp,processedOn,finishedOn,attemptsStarted,attemptsMade,stalledCount,lockTtlMs,stalledMember,
      failedReason:failedReason?{code:code(failedReason),hash:hash(failedReason)}:null};
    })]);
    return {jobId,generation:Number(jobId.split('-').at(-1)),state,details};
   }));
   return {time,governorKey:governor.key,governorState,backlog,generation,jobs};
  }finally{client.disconnect();await view?.close();}
 }

 async capture(worker:Worker,error:unknown){
  const {pool,queue,scope,governor,outboxId,notices,synthetic}=this.input;
  const at=wall(),elapsedMs=performance.now()-this.started;
  const workerState={ready:this.ready,running:worker.isRunning(),paused:worker.isPaused()};
  const poolAtFailure={total:pool.totalCount,idle:pool.idleCount,waiting:pool.waitingCount};
  const trace=[...this.trace],governorTrace=[...this.admission],observations=[...this.observations],reconciliation=[...this.reconciliation];
  const reconciliationCalls=this.reconcileCount,lastObservedTransition=this.lastTransition;
  const transportAtFailure=[...this.transportCalls];
  const database=read(()=>this.postgres());
  const [source,pgState,redisState]=await Promise.all([read(async()=>provenance()),database,read(()=>this.redis(database))]);
  const attempts=pgState.value?.attempts?.value,receipts=pgState.value?.receipts?.value;
  const record={schema:1,test:'IT-08',synthetic,at,elapsedMs,capturedAt:wall(),error:safeError(error),source,runId:this.runId,
   ownedResourcesManifest:process.env.INTEGRATION_OWNED_RESOURCES_FILE??null,
   queueName:queue.name,scope,epoch:governor.epoch,outboxId,notices,expectedTerminalState:'SUCCEEDED',
   postgres:pgState,redis:redisState,worker:workerState,pool:poolAtFailure,reconciliationCalls,lastObservedTransition,
   trace,governorTrace,observations,reconciliation,attemptCounts:attempts&&{total:attempts.length,
    definiteNoWire:attempts.filter(row=>row.finished_at&&!row.wire_started_at).length,
    possiblyInvoked:attempts.filter(row=>row.wire_started_at).length},
   transport:{trace:transportAtFailure,receiptCount:receipts?.length,duplicateAttemptReceipt:receipts&&new Set(receipts.map(r=>r.attempt_id)).size<receipts.length,
    multipleReceiptsForOutbox:receipts&&receipts.length>1}};
  const directory=process.env.INTEGRATION_DIAGNOSTIC_DIR?resolve(process.env.INTEGRATION_DIAGNOSTIC_DIR):mkdtempSync(join(tmpdir(),'povod-it08-'));
  mkdirSync(directory,{recursive:true});
  const path=join(directory,`it08-${synthetic?'synthetic-':'failure-'}${outboxId}.json`);
  writeFileSync(path,JSON.stringify(record,null,2),{flag:'wx'});
  console.error(`IT08_SNAPSHOT ${path}`);
  return {path,record};
 }
}
