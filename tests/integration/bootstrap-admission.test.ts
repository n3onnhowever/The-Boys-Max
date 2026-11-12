import test,{after} from 'node:test';
import type {TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {Redis} from 'ioredis';
import {Queue} from 'bullmq';
import {buildApp} from '../../apps/api/app.ts';
import {reconcile} from '../../packages/persistence/delivery.ts';
import {sign} from '../fixtures.ts';
import {httpConfig,countRows,errorResponse} from './http-boundary-fixtures.ts';

// Conservative development policy, not a production capacity claim: 64/peer and 256/service per 60 s.
const peerLimit=64,globalLimit=256,ttlMs=60000;
const base=httpConfig(),redis=new Redis(base.redisUrl,{maxRetriesPerRequest:0});redis.on('error',()=>{});await redis.ping();
after(async()=>{await redis.quit();});
async function fixture(t:TestContext){
 const c=httpConfig(),ctx=await buildApp(c);await ctx.app.ready();
 const old=new Set(await redis.keys('povod:bootstrap:*'));
 const keys=async()=>(await redis.keys('povod:bootstrap:*')).filter(k=>!old.has(k));
 const before=await countRows(ctx,'session_bootstraps');
 t.after(async()=>{
  console.log(JSON.stringify({test:t.name,bootstrapRowsBefore:before,bootstrapRowsAfter:await countRows(ctx,'session_bootstraps')}));
  await ctx.app.close();const own=await keys();if(own.length)await redis.del(...own);
 });
 const request=(peer='203.0.113.9',headers:Record<string,string>={})=>ctx.app.inject({url:'/api/v1/session/bootstrap',remoteAddress:peer,headers});
 return {c,ctx,keys,request,before};
}
test('bootstrap first request and signed MAX exchange retain binding and normal startup',async t=>{
 const f=await fixture(t),boot=await f.request();assert.equal(boot.statusCode,200);
 assert.deepEqual(Object.keys(boot.json()).sort(),['bootstrapId','csrfToken','expiresAt']);
 assert.equal(await countRows(f.ctx,'session_bootstraps'),f.before+1);
 const now=Number((await f.ctx.pool.query('SELECT extract(epoch FROM clock_timestamp())::text seconds')).rows[0].seconds);
 const raw=sign(f.c.botToken,`{"id":${BigInt('0x'+randomBytes(7).toString('hex'))},"first_name":"SYNTHETIC WP1C"}`,Math.floor(now),{query_id:randomUUID()});
 const headers={origin:f.c.publicOrigin,cookie:String(boot.headers['set-cookie']).split(';')[0]!,'x-bootstrap-csrf':boot.json().csrfToken};
 const exchange=await f.ctx.app.inject({method:'POST',url:'/api/v1/session/max',headers,payload:{initData:raw,exchangeKey:randomUUID()}});
 assert.equal(exchange.statusCode,200);assert.ok(exchange.headers['set-cookie']);
 // A reload requires one further bootstrap; this measured workflow consumes two permits.
 assert.equal((await f.request()).statusCode,200);
 const bad=await f.ctx.app.inject({method:'POST',url:'/api/v1/session/max',headers:{...headers,'x-bootstrap-csrf':'wrong'},payload:{initData:raw,exchangeKey:randomUUID()}});errorResponse(bad,401,'BOOTSTRAP_INVALID');
});
test('bootstrap 128 same-peer requests are bounded before database insertion',async t=>{
 const f=await fixture(t),responses=[];
 for(let batch=0;batch<8;batch++)responses.push(...await Promise.all(Array.from({length:16},()=>f.request())));
 assert.equal(responses.filter(r=>r.statusCode===200).length,peerLimit);
 for(const r of responses.filter(r=>r.statusCode!==200))errorResponse(r,429,'BOOTSTRAP_LIMIT');
 assert.equal(await countRows(f.ctx,'session_bootstraps'),f.before+peerLimit);
});
test('bootstrap independent peers have separate budgets within a global ceiling',async t=>{
 const f=await fixture(t);
 for(let i=0;i<peerLimit;i++)assert.equal((await f.request()).statusCode,200);
 errorResponse(await f.request(),429,'BOOTSTRAP_LIMIT');assert.equal((await f.request('203.0.113.10')).statusCode,200);
 assert.equal(await countRows(f.ctx,'session_bootstraps'),f.before+peerLimit+1);
});
test('bootstrap forwarded headers cannot rotate or replace direct peer identity',async t=>{
 const f=await fixture(t);
 for(let i=0;i<peerLimit;i++)assert.equal((await f.request('203.0.113.9',{'x-forwarded-for':`198.51.100.${i+1}`,forwarded:`for=198.51.100.${i+1}`})).statusCode,200);
 errorResponse(await f.request('203.0.113.9',{'x-forwarded-for':'127.0.0.1'}),429,'BOOTSTRAP_LIMIT');
 assert.equal(await countRows(f.ctx,'session_bootstraps'),f.before+peerLimit);
});
test('bootstrap IPv4 and mapped IPv6 peers share one budget',async t=>{
 const f=await fixture(t);
 for(let i=0;i<peerLimit;i++)assert.equal((await f.request('127.0.0.1')).statusCode,200);
 errorResponse(await f.request('::ffff:127.0.0.1'),429,'BOOTSTRAP_LIMIT');errorResponse(await f.request('::ffff:7f00:1'),429,'BOOTSTRAP_LIMIT');
});
test('bootstrap global budget is atomic across applications and many independent peers',async t=>{
 const f=await fixture(t),other=await buildApp(f.c);t.after(()=>other.app.close());await other.app.ready();
 let release!:()=>void;const barrier=new Promise<void>(resolve=>release=resolve);
 const pending=Array.from({length:globalLimit+32},async(_,i)=>{await barrier;const app=i%2?other.app:f.ctx.app;return app.inject({url:'/api/v1/session/bootstrap',remoteAddress:`2001:db8::${(i+1).toString(16)}`});});
 release();const responses=await Promise.all(pending);
 assert.equal(responses.filter(r=>r.statusCode===200).length,globalLimit);
 for(const r of responses.filter(r=>r.statusCode!==200))errorResponse(r,429,'BOOTSTRAP_LIMIT');
 assert.equal(await countRows(f.ctx,'session_bootstraps'),f.before+globalLimit);
 const keys=await f.keys();assert.equal(keys.length,1);assert.equal(await redis.hlen(keys[0]!),globalLimit+1);
 const memory=Number(await redis.call('MEMORY','USAGE',keys[0]!));assert.ok(memory>0&&memory<=131072);
 console.log(JSON.stringify({test:t.name,redisKeys:keys.length,hashFields:globalLimit+1,memoryBytes:memory}));
 const state=await redis.hgetall(keys[0]!);assert.ok(!JSON.stringify(state).includes('2001:db8'));
 assert.ok(await redis.pttl(keys[0]!)>0);assert.ok(await redis.pttl(keys[0]!)<=ttlMs);
 // Denials never create new peer state or extend expiry.
 const ttl=await redis.pttl(keys[0]!);errorResponse(await f.request('198.51.100.99'),429,'BOOTSTRAP_LIMIT');
 assert.equal(await redis.hlen(keys[0]!),globalLimit+1);assert.ok(await redis.pttl(keys[0]!)<=ttl);
});
test('bootstrap expiry releases bounded state without arbitrary sleeps',async t=>{
 const f=await fixture(t);for(let i=0;i<peerLimit;i++)assert.equal((await f.request()).statusCode,200);
 errorResponse(await f.request(),429,'BOOTSTRAP_LIMIT');const keys=await f.keys();assert.equal(keys.length,1);
 assert.ok(await redis.pttl(keys[0]!)>0);
 // Move the real Redis expiry into the past: the next command observes actual key expiration.
 await redis.pexpireat(keys[0]!,1);assert.equal(await redis.exists(keys[0]!),0);
 assert.equal((await f.request()).statusCode,200);assert.ok(await redis.pttl(keys[0]!)>0);
});
test('bootstrap foreign Origin consumes neither a permit nor a database row',async t=>{
 const f=await fixture(t);
 for(const headers of [{origin:'https://foreign.invalid'},{origin:'null'},{'sec-fetch-site':'cross-site'}] as Record<string,string>[])errorResponse(await f.request('203.0.113.9',headers),403,'ORIGIN_INVALID');
 assert.equal(await countRows(f.ctx,'session_bootstraps'),f.before);assert.equal((await f.keys()).length,0);
 assert.equal((await f.request()).statusCode,200);
});
test('bootstrap Redis temporary unavailability fails closed then recovers',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).statusCode,200);
 const before=await countRows(f.ctx,'session_bootstraps');
 // Real Redis pauses command processing; its protocol reply is the barrier, not a blind sleep.
 await redis.call('CLIENT','PAUSE','1200','ALL');
 errorResponse(await f.request(),503,'BOOTSTRAP_ADMISSION_UNAVAILABLE');
 assert.equal(await countRows(f.ctx,'session_bootstraps'),before);
 await redis.ping();assert.equal((await f.request()).statusCode,200);
});
test('bootstrap expired records retain the existing one-hour cleanup grace',async t=>{
 const f=await fixture(t),old=await f.request(),recent=await f.request();
 await f.ctx.pool.query("UPDATE session_bootstraps SET expires_at=clock_timestamp()-interval '2 hours' WHERE id=$1",[old.json().bootstrapId]);
 await f.ctx.pool.query("UPDATE session_bootstraps SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[recent.json().bootstrapId]);
 const queue=new Queue('wp1c-cleanup-'+randomUUID(),{connection:{host:new URL(f.c.redisUrl).hostname,port:Number(new URL(f.c.redisUrl).port)}});
 try{await reconcile(f.ctx.pool,queue);}finally{await queue.obliterate({force:true});await queue.close();}
 const ids=(await f.ctx.pool.query('SELECT id FROM session_bootstraps WHERE id=ANY($1::uuid[])',[[old.json().bootstrapId,recent.json().bootstrapId]])).rows.map(r=>r.id);
 assert.deepEqual(ids,[recent.json().bootstrapId]);
});
test('bootstrap bounds pending Redis work during an outage',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).statusCode,200);
 const before=await countRows(f.ctx,'session_bootstraps');await redis.call('CLIENT','PAUSE','1200','ALL');
 let release!:()=>void;const barrier=new Promise<void>(resolve=>release=resolve);
 const pending=Array.from({length:globalLimit+16},async()=>{await barrier;return f.request();});release();
 const responses=await Promise.all(pending);
 assert.equal(responses.filter(r=>r.statusCode===429).length,16);
 for(const r of responses)errorResponse(r,r.statusCode,r.statusCode===429?'BOOTSTRAP_LIMIT':'BOOTSTRAP_ADMISSION_UNAVAILABLE');
 assert.equal(responses.filter(r=>r.statusCode===503).length,globalLimit);assert.equal(await countRows(f.ctx,'session_bootstraps'),before);
 await redis.ping();
});
