/** Real PostgreSQL + Redis/BullMQ; synthetic transport only, no MAX network calls. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import {Queue,Worker} from 'bullmq';
import {Redis} from 'ioredis';
import {config} from '../../packages/platform/config.ts';
import {buildApp} from '../../apps/api/app.ts';
import {Governor} from '../../packages/platform/governor.ts';
import {TestTransport,maxResponseOutcome,type Transport} from '../../packages/platform/transport.ts';
import {deliver,reconcile} from '../../packages/persistence/delivery.ts';
import {digest} from '../../packages/platform/auth.ts';
import type {BotAttachment} from '../../packages/platform/bot.ts';
assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');
const c=config();assert.equal(c.mode,'test');assert.equal(new URL(c.databaseUrl).pathname,'/max23_test');
const {app,pool}=await buildApp(c),scope='synthetic-bot-'+randomUUID(),epoch=randomUUID();
const redis=new Redis(c.redisUrl,{maxRetriesPerRequest:1}),workerRedis=new Redis(c.redisUrl,{maxRetriesPerRequest:null});
redis.on('error',()=>{});workerRedis.on('error',()=>{});
const queue=new Queue(scope,{connection:redis}),gov=new Governor(redis,scope,epoch),sink=new TestTransport(pool,'test');
const calls:{chatId:string;text:string;attachments?:BotAttachment[]}[]=[],unknown=new Set<string>(),limited=new Set<string>();
const transport:Transport={async send(a,o,chatId,text,attachments){
 calls.push({chatId,text,attachments});
 if(limited.has(chatId))return maxResponseOutcome(429,'application/json',Buffer.from('{"message":"SYNTHETIC rate limit"}'),'3');
 if(unknown.has(chatId))return {kind:'UNKNOWN',reason:'SYNTHETIC_AMBIGUOUS_SEND'};
 return sink.send(a,o,chatId,text,attachments);
}};
let worker:Worker;
const settings={publicOrigin:c.publicOrigin,miniappUrl:'https://synthetic.example/app',botUsername:'synthetic_bot'};
async function until(check:()=>Promise<boolean>){const end=Date.now()+15000;while(Date.now()<end){if(await check())return;await sleep(30);}assert.fail('bot delivery timed out');}
function id(){return BigInt('0x'+randomBytes(7).toString('hex')).toString();}
function start(actor=id()){return {actor,raw:`{"update_type":"bot_started","timestamp":${Date.now()},"chat_id":${actor},"user":{"user_id":${actor},"first_name":"SYNTHETIC","is_bot":false}}`};}
function message(text:string,actor=id(),chatType='dialog',isBot=false){return {actor,raw:`{"update_type":"message_created","timestamp":${Date.now()},"message":{"timestamp":${Date.now()},"sender":{"user_id":${actor},"first_name":"SYNTHETIC","is_bot":${isBot}},"recipient":{"chat_id":${actor},"chat_type":"${chatType}"},"body":{"mid":"${randomUUID()}","text":${JSON.stringify(text)}}}}`};}
const send=(raw:string,secret=c.webhookSecret)=>app.inject({method:'POST',url:'/api/v1/max/webhook',headers:{'content-type':'application/json','x-max-bot-api-secret':secret},payload:raw});
async function rows(actor:string){return (await pool.query("SELECT o.* FROM outbox o JOIN actors a ON a.id=o.actor_id WHERE a.external_id=$1",[actor])).rows;}
async function destination(actor:string){return (await pool.query<{chat_id:string;source_timestamp_ms:string;source_digest:string;verified_at:Date}>("SELECT d.chat_id,d.source_timestamp_ms,d.source_digest,d.verified_at FROM destinations d JOIN actors a ON a.id=d.actor_id WHERE a.external_id=$1",[actor])).rows[0];}
function started(actor:string,chat:string,timestamp:number){return `{"update_type":"bot_started","timestamp":${timestamp},"chat_id":${chat},"user":{"user_id":${actor},"first_name":"SYNTHETIC","is_bot":false}}`;}
async function delivered(actor:string){await reconcile(pool,queue);await until(async()=>(await rows(actor)).every(r=>r.state==='SUCCEEDED'));}

before(async()=>{
 const t=await redis.time(),now=Number(t[0])*1000+Math.floor(Number(t[1])/1000);
 await redis.set(gov.key,JSON.stringify({epoch,lastTime:now,holdUntil:0,globalNext:0,cooldown:0,turn:0,seq:0,dests:{},waiters:{}}));
 await pool.query("UPDATE outbound_control SET hold=false,reason='SYNTHETIC_BOT_TEST_ONLY' WHERE id=1");
 worker=new Worker(scope,job=>deliver(pool,job.data.outboxId,transport,gov,'test',settings),{connection:workerRedis,concurrency:2});
});
after(async()=>{
 await worker?.close();await queue.close();await redis.del(gov.key);
 await Promise.all([redis.quit(),workerRedis.quit()]);await app.close();
});

test('real durable ACK for bot_started; BullMQ delivers current Russian copy and native button',async()=>{
 const x=start(),before=Date.now(),response=await send(x.raw);
 assert.equal(response.statusCode,200);assert.equal(response.json().duplicate,false);
 assert.ok(Date.now()-before<3000,'ACK must not wait for external delivery');
 const out=await rows(x.actor);assert.equal(out.length,1);assert.equal(out[0].state,'READY');assert.equal(out[0].purpose,'WELCOME');
 assert.equal(calls.filter(r=>r.chatId===x.actor).length,0);
 await delivered(x.actor);const sent=calls.find(r=>r.chatId===x.actor)!;
 assert.match(sent.text,/Повод/);assert.equal(sent.attachments?.[0]?.payload.buttons[0]?.[0]?.type,'open_app');
});
test('delayed older bot_started cannot replace a newer canonical destination',async()=>{
 const actor=id(),newer=id(),older=id(),now=Date.now();
 assert.equal((await send(started(actor,newer,now))).statusCode,200);
 const first=await destination(actor);assert.equal(first?.chat_id,newer);assert.equal(first?.source_timestamp_ms,String(now));
 assert.equal((await send(started(actor,older,now-1000))).statusCode,200);
 assert.deepEqual(await destination(actor),first);
 assert.equal((await rows(actor)).length,1,'stale chat cannot enqueue a welcome to the canonical chat');
});
test('older then newer source event advances destination and exact duplicate is inert',async()=>{
 const actor=id(),older=id(),newer=id(),now=Date.now();
 const oldRaw=started(actor,older,now-1000),newRaw=started(actor,newer,now);
 assert.equal((await send(oldRaw)).json().duplicate,false);
 assert.equal((await destination(actor))?.chat_id,older);
 assert.equal((await send(newRaw)).json().duplicate,false);
 const final=await destination(actor);assert.equal(final?.chat_id,newer);assert.equal(final?.source_timestamp_ms,String(now));
 assert.equal((await send(oldRaw)).json().duplicate,true);
 assert.equal((await send(newRaw)).json().duplicate,true);
 assert.deepEqual(await destination(actor),final);
 assert.equal((await rows(actor)).length,2);
});
test('competing destination updates serialize by source time, not commit order',async()=>{
 const actor=id(),chats=Array.from({length:8},()=>id()),base=Date.now();
 const responses=await Promise.all(chats.map((chat,i)=>send(started(actor,chat,base+i))));
 assert.ok(responses.every(r=>r.statusCode===200));
 assert.equal((await destination(actor))?.chat_id,chats.at(-1));
 assert.equal((await destination(actor))?.source_timestamp_ms,String(base+7));
});
test('equal source time with conflicting chats keeps the first committed destination',async()=>{
 const actor=id(),first=id(),other=id(),now=Date.now();
 await send(started(actor,first,now));const saved=await destination(actor);
 assert.equal((await send(started(actor,other,now))).statusCode,200);
 assert.deepEqual(await destination(actor),saved);
 assert.equal((await rows(actor)).length,1);
 assert.equal((await pool.query("SELECT 1 FROM quarantine WHERE reason='DESTINATION_TIMESTAMP_COLLISION' AND payload_hash=$1",[digest(Buffer.from(started(actor,other,now)).toString('base64'))])).rowCount,1);
});
test('legacy destination holds ambiguous delayed evidence until a post-verification event',async()=>{
 const actor=id(),current=id(),delayed=id(),fresh=id(),now=Date.now();
 const actorId=randomUUID();
 await pool.query('INSERT INTO actors(id,external_id,display_name) VALUES($1,$2,$3)',[actorId,actor,'SYNTHETIC']);
 await pool.query('INSERT INTO destinations(actor_id,chat_id,verified_at,source_digest) VALUES($1,$2,clock_timestamp(),$3)',[actorId,current,'SYNTHETIC_LEGACY']);
 assert.equal((await send(started(actor,delayed,now-1000))).statusCode,200);
 assert.equal((await destination(actor))?.chat_id,current);
 assert.equal((await pool.query("SELECT 1 FROM quarantine WHERE reason='DESTINATION_LEGACY_ORDER_UNKNOWN' AND payload_hash=$1",[digest(Buffer.from(started(actor,delayed,now-1000)).toString('base64'))])).rowCount,1);
 assert.equal((await send(started(actor,fresh,now+60000))).statusCode,200);
 assert.equal((await destination(actor))?.chat_id,fresh);
 assert.equal((await destination(actor))?.source_timestamp_ms,String(now+60000));
 assert.equal((await rows(actor)).length,1);
});
test('message_created routes start/help/app into durable bot replies',async()=>{
 for(const [text,purpose] of [['/start','WELCOME'],['/help','HELP'],['/app','APP'],['Привет','FALLBACK']]){
  const x=message(text!);assert.equal((await send(x.raw)).statusCode,200);
  assert.equal((await rows(x.actor))[0].purpose,purpose);await delivered(x.actor);
  assert.equal(calls.filter(r=>r.chatId===x.actor).length,1);
 }
});
test('concurrent duplicate webhook and conflicting same-mid body create only one effect',async()=>{
 const x=message('/app'),responses=await Promise.all(Array.from({length:8},()=>send(x.raw)));
 assert.ok(responses.every(r=>r.statusCode===200));assert.equal(responses.filter(r=>!r.json().duplicate).length,1);
 assert.equal((await rows(x.actor)).length,1);
 const changed=await send(x.raw.replace('/app','/help'));assert.equal(changed.json().duplicate,true);
 assert.equal((await rows(x.actor))[0].purpose,'APP');
 await delivered(x.actor);await reconcile(pool,queue);assert.equal(calls.filter(r=>r.chatId===x.actor).length,1);
 assert.ok((await pool.query("SELECT 1 FROM quarantine WHERE reason='EVENT_KEY_COLLISION'")).rowCount!>0);
});
test('secret failure, malformed body, oversized body and unsupported callback stay isolated',async()=>{
 const x=start();assert.equal((await send(x.raw,'wrong')).statusCode,403);assert.equal((await rows(x.actor)).length,0);
 assert.equal((await send('{broken')).json().quarantined,true);
 assert.equal((await send('x'.repeat(1048577))).statusCode,413);
 assert.equal((await send('{"update_type":"message_callback","timestamp":1800000000000}')).json().quarantined,true);
});
test('group/channel commands and bot echoes are acknowledged without a destination or reply',async()=>{
 for(const x of [message('/start',id(),'chat'),message('/start',id(),'channel'),message('/help',id(),'dialog',true)]){
  assert.equal((await send(x.raw)).statusCode,200);assert.equal((await rows(x.actor)).length,0);
  assert.equal((await pool.query('SELECT 1 FROM actors WHERE external_id=$1',[x.actor])).rowCount,0);
 }
});
test('ambiguous external submission remains UNKNOWN and is not retried by reconciliation',async()=>{
 const x=message('/app');unknown.add(x.actor);await send(x.raw);await reconcile(pool,queue);
 await until(async()=>(await rows(x.actor))[0]?.state==='UNKNOWN');
 await reconcile(pool,queue);await reconcile(pool,queue);
 const row=(await rows(x.actor))[0];assert.equal(row.state,'UNKNOWN');assert.equal(row.attempt_count,1);
 assert.equal(calls.filter(r=>r.chatId===x.actor).length,1);
});

test('429 string message persists RETRY_WAIT and governor cooldown without immediate resend',async()=>{
 const x=message('/app');limited.add(x.actor);await send(x.raw);await reconcile(pool,queue);
 await until(async()=>(await rows(x.actor))[0]?.state==='RETRY_WAIT');
 const row=(await rows(x.actor))[0];assert.equal(row.result_reason,'PROVIDER_429');assert.ok(row.not_before.getTime()>Date.now());
 const state=JSON.parse((await redis.get(gov.key))!);assert.ok(state.cooldown>Date.now());
 await reconcile(pool,queue);assert.equal(calls.filter(r=>r.chatId===x.actor).length,1);assert.equal(row.attempt_count,1);
});
