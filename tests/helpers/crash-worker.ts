/** Test-only real child controller with bounded phases and sanitized failure evidence. */
import assert from 'node:assert/strict';
import {fork,execFileSync,type ChildProcess} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {resolve,join} from 'node:path';
import type {Pool} from 'pg';
import {Queue} from 'bullmq';
import {Redis} from 'ioredis';
import {reconcile} from '../../packages/persistence/delivery.ts';

type Input={pool:Pool;redis:Redis;queue:Queue;scope:string;epoch:string;outboxId:string};
type Marker={value:'READY'|'WIRE_ENTERED'|'OTHER_REDACTED';host:string;monotonicMs:number};
const hash=(input:string|Buffer)=>createHash('sha256').update(input).digest('hex');
const safeError=(error:unknown)=>error instanceof Error?{name:error.name,code:'code' in error?String(error.code):null,messageHash:hash(error.message)}:{name:'NON_ERROR'};
const timestamp=()=>new Date().toISOString();
function provenance(){
 const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}).trim();
 try{return {sha:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),lockSha256:hash(readFileSync('package-lock.json')),diffSha256:hash(git('diff','HEAD'))};}
 catch(error){return {captureError:safeError(error)};}
}
function ownedResources(){
 // Optional runner-supplied JSON manifest. Whitelist metadata; never copy inspect.Config.Env.
 try{
  const path=process.env.INTEGRATION_OWNED_RESOURCES_FILE;if(!path)return {unavailable:'No runner manifest supplied'};
  const input=JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')) as {owned?:unknown[];containers?:unknown[]};
  return {manifest:resolve(path),owned:(input.owned??input.containers??[]).map(value=>{
   const row=value as {id?:unknown;name?:unknown;volumes?:unknown;labels?:unknown};
   const id=typeof row.id==='string'&&/^[a-f0-9]{12,64}$/.test(row.id)?row.id:null;
   const name=typeof row.name==='string'&&/^\/?povod-[a-zA-Z0-9_-]+$/.test(row.name)?row.name:null;
   const volumes=Array.isArray(row.volumes)?row.volumes.filter((v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9_-]+$/.test(v)):[];
   return {id,name,volumes};
  })};
 }catch(error){return {captureError:safeError(error)};}
}

export class CrashWorker {
 readonly input:Input;readonly child:ChildProcess;readonly markers:Marker[]=[];
 readonly runId=process.env.INTEGRATION_RUN_ID??randomUUID();readonly source=provenance();
 readonly governorKey:string;readonly lifecycle:object[]=[];
 private exited=false;private exitStatus:{code:number|null;signal:NodeJS.Signals|null}|null=null;
 private spawnError:unknown;private stdout='';private stderr='';private stdoutBytes=0;private stderrBytes=0;private captureSequence=0;
 constructor(input:Input){
  this.input=input;this.governorKey=`maxgov:{${hash(input.scope)}}:state`;
  this.child=fork(new URL('./kill-worker.ts',import.meta.url),[],{execArgv:['--experimental-strip-types'],
   env:{...process.env,IT_QUEUE:input.queue.name,IT_SCOPE:input.scope,IT_EPOCH:input.epoch,IT_OUTBOX:input.outboxId},stdio:['ignore','pipe','pipe','ipc']});
  this.lifecycle.push({event:'SPAWN',host:timestamp(),pid:this.child.pid});
  this.child.on('message',message=>{this.markers.push({value:message==='READY'||message==='WIRE_ENTERED'?message:'OTHER_REDACTED',host:timestamp(),monotonicMs:performance.now()});});
  this.child.on('error',error=>{this.spawnError=error;this.lifecycle.push({event:'ERROR',host:timestamp(),error:safeError(error)});});
  this.child.on('exit',(code,signal)=>{this.exited=true;this.exitStatus={code,signal};this.lifecycle.push({event:'EXIT',host:timestamp(),code,signal});});
  const stream=(kind:'stdout'|'stderr',chunk:Buffer)=>{
   // Child emits only fixed operational messages. Unknown text is retained as a bounded hash/length,
   // preventing credentials, SQL parameter details or message content from entering test evidence.
   const raw=chunk.toString('utf8');const safe=raw.split(/\r?\n/).filter(Boolean).map(line=>{
    if(/^\{"event":"[A-Z0-9_]{1,80}"\}$/.test(line))return line;
    return `[REDACTED bytes=${Buffer.byteLength(line)} sha256=${hash(line)}]`;
   }).join('\n')+'\n';
   if(kind==='stdout'){this.stdoutBytes+=chunk.length;this.stdout=(this.stdout+safe).slice(-32768);}
   else{this.stderrBytes+=chunk.length;this.stderr=(this.stderr+safe).slice(-32768);}
  };
  this.child.stdout!.on('data',(chunk:Buffer)=>stream('stdout',chunk));this.child.stderr!.on('data',(chunk:Buffer)=>stream('stderr',chunk));
 }
 get entered(){return this.markers.some(m=>m.value==='WIRE_ENTERED');}
 private assertAlive(phase:string){if(this.spawnError)throw Error(`${phase}: child spawn error`,{cause:this.spawnError});assert.equal(this.exited,false,`${phase}: child exited before expected marker`);}
 async ready(){
  const deadline=performance.now()+15000;
  while(performance.now()<deadline){this.assertAlive('READY');if(this.markers.some(m=>m.value==='READY'))return;await delay(25);}
  throw Error('READY timeout');
 }
 async wire(){
  // Same one-second scheduler as apps/worker/main.ts, within the original 15-second wire bound.
  const deadline=performance.now()+15000;let nextTick=0;
  while(performance.now()<deadline){
   this.assertAlive('WIRE_ENTERED');if(this.entered)return;
   if(performance.now()>=nextTick){await reconcile(this.input.pool,this.input.queue);nextTick=performance.now()+1000;}
   await delay(25);
  }
  throw Error('wire entry timeout');
 }
 async kill(){
  assert.equal(this.entered,true,'Only a real transport-entry marker permits the scenario kill');
  await this.close();assert.equal(this.exitStatus?.signal,'SIGKILL');
 }
 async close(){
  if(this.exited)return;
  this.lifecycle.push({event:'SIGKILL_REQUESTED',host:timestamp(),pid:this.child.pid});assert.equal(this.child.kill('SIGKILL'),true,'child kill request failed');
  const deadline=performance.now()+5000;while(performance.now()<deadline){if(this.exited)return;await delay(25);}
  throw Error('child cleanup exit timeout');
 }
 async recover(){
  assert.equal(this.exited,true,'Lease recovery scenario requires the child to be dead');
  const {pool,queue,outboxId}=this.input;const deadline=performance.now()+35000;let due=false;
  while(performance.now()<deadline){due=(await pool.query<{due:boolean}>('SELECT lease_until<clock_timestamp() AS due FROM outbox WHERE id=$1',[outboxId])).rows[0]?.due===true;if(due)break;await delay(50);}
  assert.equal(due,true,'PostgreSQL lease did not expire within the bounded recovery phase');
  await reconcile(pool,queue);
  const row=async()=>(await pool.query<{state:string;result_reason:string;attempt_count:number;queue_generation:number}>('SELECT state,result_reason,attempt_count,queue_generation FROM outbox WHERE id=$1',[outboxId])).rows[0]!;
  const receipts=async()=>(await pool.query('SELECT attempt_id FROM test_transport_receipts WHERE outbox_id=$1',[outboxId])).rowCount;
  const first=await row();assert.equal(first.state,'UNKNOWN');assert.equal(first.result_reason,'LEASE_RECOVERY');assert.equal(await receipts(),1);
  await reconcile(pool,queue);assert.deepEqual(await row(),first);assert.equal(await receipts(),1);
 }
 async capture(phase:string,error?:unknown){
  const {pool,redis,queue,outboxId}=this.input;
  const record:{[key:string]:unknown}={phase,runId:this.runId,source:this.source,hostBefore:timestamp(),outboxId,resources:ownedResources(),error:error?safeError(error):null,
   child:{pid:this.child.pid,spawnfile:this.child.spawnfile,spawnargs:this.child.spawnargs,exit:this.exitStatus,lifecycle:this.lifecycle,expected:['READY','WIRE_ENTERED'],received:this.markers,
    stdout:this.stdout,stderr:this.stderr,stdoutBytes:this.stdoutBytes,stderrBytes:this.stderrBytes,retainedCharactersPerStream:32768,unrecognizedStreamText:'hash-and-length-only'}};
  let client;
  try{
   client=await pool.connect();await client.query('BEGIN READ ONLY');await client.query("SET LOCAL statement_timeout='3s'");
   record.pg={clock:(await client.query('SELECT clock_timestamp()::text AS now,extract(epoch FROM clock_timestamp())::text AS epoch')).rows[0],
    outbox:(await client.query('SELECT id,kind,purpose,state,result_reason,attempt_count,not_before::text,expires_at::text,queue_generation,queued_at::text,lease_owner,lease_until::text FROM outbox WHERE id=$1',[outboxId])).rows,
    attempts:(await client.query('SELECT id,outbox_id,lease_owner,started_at::text,wire_started_at::text,outcome,reason,finished_at::text FROM delivery_attempts WHERE outbox_id=$1 ORDER BY started_at,id',[outboxId])).rows,
    receipts:(await client.query('SELECT attempt_id,outbox_id,created_at::text FROM test_transport_receipts WHERE outbox_id=$1',[outboxId])).rows,
    control:(await client.query('SELECT hold,reason,epoch FROM outbound_control WHERE id=1')).rows,
    sessions:(await client.query('SELECT pid,state,wait_event_type,wait_event,backend_start::text,xact_start::text,query_start::text,pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE datname=current_database()')).rows,
    locks:(await client.query('SELECT l.pid,l.locktype,l.mode,l.granted,l.relation::regclass::text AS relation,l.transactionid::text FROM pg_locks l JOIN pg_stat_activity a USING(pid) WHERE a.datname=current_database()')).rows};
   await client.query('COMMIT');
  }catch(captureError){record.pgError=safeError(captureError);try{await client?.query('ROLLBACK');}catch{}}
  finally{client?.release();}
  // Diagnostic I/O has its own finite command timeout; it never changes the worker's connection policy.
  const diagnosticRedis=redis.duplicate({lazyConnect:true,commandTimeout:3000,connectTimeout:3000,maxRetriesPerRequest:0,retryStrategy:()=>null,enableOfflineQueue:false});
  diagnosticRedis.on('error',()=>{});let diagnosticQueue:Queue|undefined;
  try{
   await diagnosticRedis.connect();diagnosticQueue=new Queue(queue.name,{connection:diagnosticRedis,skipVersionCheck:true,skipMetasUpdate:true});
   const raw=await diagnosticRedis.get(this.governorKey);const gen=(await pool.query<{queue_generation:number}>('SELECT queue_generation FROM outbox WHERE id=$1',[outboxId])).rows[0]?.queue_generation??0;
   const jobs=[];for(let i=1;i<=Math.min(gen,20);i++){const job=await diagnosticQueue.getJob(`${outboxId}-${i}`);jobs.push(job?{id:job.id,state:await job.getState(),timestamp:job.timestamp,processedOn:job.processedOn,finishedOn:job.finishedOn,attemptsMade:job.attemptsMade,failedReasonHash:job.failedReason?hash(job.failedReason):null}:{id:`${outboxId}-${i}`,missing:true});}
   record.redis={time:await diagnosticRedis.time(),governorKey:this.governorKey,available:raw!==null,governor:raw?JSON.parse(raw):null,queueName:queue.name,generation:gen,jobs,truncated:gen>20};
  }catch(captureError){record.redisError=safeError(captureError);}
  finally{diagnosticRedis.disconnect();await diagnosticQueue?.close();}
  record.hostAfter=timestamp();
  // JSON is safe to retain in normal test logs even when the isolated runner supplies no path.
  console.error('SYNTHETIC_CRASH_WORKER_DIAGNOSTIC '+JSON.stringify(record));
  const directory=process.env.INTEGRATION_DIAGNOSTIC_DIR;
  if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,`crash-${outboxId}-${++this.captureSequence}.json`),JSON.stringify(record,null,2),{flag:'wx'});}
  return record;
 }
}

/** Preserve the original failure and attempt every owned cleanup, including after partial setup. */
export async function finishCrashScenario(error:unknown,child:Pick<CrashWorker,'capture'|'close'>|undefined,cleanups:(()=>Promise<unknown>)[]=[]){
 const failures:unknown[]=error===undefined?[]:[error];
 if(error!==undefined&&child)try{await child.capture('failure before cleanup',error);}catch(captureError){failures.push(captureError);}
 for(const close of [async()=>{await child?.close();},...cleanups])try{await close();}catch(cleanupError){failures.push(cleanupError);}
 if(failures.length)throw new AggregateError(failures,'CRASH_SCENARIO_FAILED');
}
