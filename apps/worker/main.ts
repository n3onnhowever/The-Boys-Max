import {Worker,Queue} from 'bullmq';
import {Redis} from 'ioredis';
import {connect} from '../../packages/persistence/db.ts';
import {config} from '../../packages/platform/config.ts';
import {Governor} from '../../packages/platform/governor.ts';
import {TestTransport,MaxTransport} from '../../packages/platform/transport.ts';
import {reconcile,deliver} from '../../packages/persistence/delivery.ts';
import {requireThat} from '../../packages/domain/errors.ts';
const c=config(),{pool}=connect(c.databaseUrl);
// BullMQ worker uses unlimited Redis reconnect retries; producer fails fast. Separate connections, no cache.
const workerRedis=new Redis(c.redisUrl,{maxRetriesPerRequest:null});workerRedis.on('error',()=>{});
const producerRedis=new Redis(c.redisUrl,{maxRetriesPerRequest:1,enableOfflineQueue:false});producerRedis.on('error',()=>{});
const govRedis=new Redis(c.redisUrl,{maxRetriesPerRequest:1,enableOfflineQueue:false});govRedis.on('error',()=>{});
const queue=new Queue('max-effects',{connection:producerRedis});
const epoch=await pool.query<{epoch:string}>('SELECT epoch FROM outbound_control WHERE id=1');
const governor=new Governor(govRedis,c.credentialScope,epoch.rows[0]!.epoch);
const transport=c.mode==='test'?new TestTransport(pool,c.mode):new MaxTransport(c.botToken,c.liveGate);
const worker=new Worker('max-effects',async job=>{
 requireThat(typeof job.data.outboxId==='string'&&/^[0-9a-f-]{36}$/.test(job.data.outboxId),'JOB_ID');
 await deliver(pool,job.data.outboxId,transport,governor,c.mode,{publicOrigin:c.publicOrigin,botUsername:c.botUsername,miniappUrl:c.miniappUrl,privacyUrl:c.privacyUrl,aboutUrl:c.aboutUrl});
 const result=await pool.query<{state:string;result_reason:string|null}>('SELECT state,result_reason FROM outbox WHERE id=$1',[job.data.outboxId]);
 const state=result.rows[0]?.state??'MISSING',reason=result.rows[0]?.result_reason??null;
 console.info(JSON.stringify({event:'MAX_DELIVERY_STATE',state:/^[A-Z_]{1,32}$/.test(state)?state:'UNKNOWN',reason:reason&&/^[A-Z0-9_]{1,80}$/.test(reason)?reason:null}));
},{connection:workerRedis,concurrency:4,lockDuration:30000,maxStalledCount:1});
worker.on('error',()=>console.error(JSON.stringify({event:'WORKER_ERROR'})));
worker.on('failed',()=>console.error(JSON.stringify({event:'MAX_JOB_FAILED'})));
let stopping=false,busy=false;
const tick=async()=>{if(stopping||busy)return;busy=true;try{await reconcile(pool,queue);}catch{console.error(JSON.stringify({event:'RECONCILE_FAILED'}));}finally{busy=false;}};
const timer=setInterval(()=>{void tick();},1000);await tick();
async function stop(){if(stopping)return;stopping=true;clearInterval(timer);await worker.close();while(busy)await new Promise(r=>setTimeout(r,50));await queue.close();await Promise.all([workerRedis.quit(),producerRedis.quit(),govRedis.quit()]);await pool.end();}
process.on('SIGTERM',()=>{void stop();});process.on('SIGINT',()=>{void stop();});
