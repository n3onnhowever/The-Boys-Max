/** Real PostgreSQL + real Fastify routing. All launch proofs and identities are SYNTHETIC. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {config} from '../../packages/platform/config.ts';
import {buildApp} from '../../apps/api/app.ts';
import {sign} from '../fixtures.ts';
const cfg=config();
assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');
const {app,pool,sessions}=await buildApp(cfg);
before(async()=>{await pool.query('SELECT 1');await app.ready();});
after(async()=>{await app.close();});
const identity=()=> (9223372036854775807n-BigInt('0x'+randomBytes(6).toString('hex'))).toString();
const proof=(id=identity(),extra:Record<string,string>={},age=0)=>sign(cfg.botToken,'{"id":'+id+',"first_name":"SYNTHETIC_MINIAPP"}',Math.floor(Date.now()/1000)+age,{query_id:randomUUID(),...extra});
const cookie=(response:{headers:Record<string,unknown>},name:string)=>{
 const cookies=response.headers['set-cookie'],values=Array.isArray(cookies)?cookies:[cookies];
 const value=values.find(v=>typeof v==='string'&&v.startsWith(name+'='));assert.ok(typeof value==='string');return value.split(';')[0]!.slice(name.length+1);
};
async function boot(){const r=await app.inject({url:'/api/v1/session/bootstrap'});assert.equal(r.statusCode,200);return {binding:cookie(r,'__Host-max_bootstrap'),csrf:r.json().csrfToken as string};}
async function exchange(raw:string,previous?:string,provided?:Awaited<ReturnType<typeof boot>>,key=randomUUID()){
 const b=provided??await boot();
 const r=await app.inject({method:'POST',url:'/api/v1/session/max',headers:{origin:cfg.publicOrigin,'content-type':'application/json','x-bootstrap-csrf':b.csrf,cookie:'__Host-max_bootstrap='+b.binding+(previous?'; __Host-max_session='+previous:'')},payload:{initData:raw,exchangeKey:key}});
 return {r,b,key};
}
async function launch(raw=proof(),previous?:string){const x=await exchange(raw,previous);assert.equal(x.r.statusCode,200,x.r.json().error?.code);return {...x,raw,token:cookie(x.r,'__Host-max_session'),body:x.r.json()};}
const headers=(x:Awaited<ReturnType<typeof launch>>)=>({origin:cfg.publicOrigin,cookie:'__Host-max_session='+x.token,'content-type':'application/json','x-csrf-token':x.body.csrfToken});
test('MAX-AUTH-01 valid launch preserves signed int64 and issues host-only secure HttpOnly cookie',async()=>{
 const id=identity(),x=await launch(proof(id));
 const actor=await pool.query('SELECT external_id FROM actors WHERE id=$1',[x.body.actor.id]);assert.equal(actor.rows[0].external_id,id);
 const attrs=String(x.r.headers['set-cookie']);assert.match(attrs,/HttpOnly/);assert.match(attrs,/Secure/);assert.match(attrs,/SameSite=Lax/);assert.doesNotMatch(attrs,/Domain=/);
 assert.equal('token' in x.body,false);assert.equal(x.r.headers['cache-control'],'no-store');assert.equal(x.r.headers['referrer-policy'],'no-referrer');
 assert.equal((await app.inject({url:'/api/v1/session',headers:headers(x)})).statusCode,200);
});
test('MAX-AUTH-02 tampered hash, stale/future date, duplicates and malformed encoding are rejected',async()=>{
 const raw=proof();
 const cases=[raw.replace(/hash=([a-f0-9])/,(_,n)=>'hash='+(n==='0'?'1':'0')),proof(identity(),{},-3600),proof(identity(),{},301),raw+'&hash='+'0'.repeat(64),raw+'&%75ser=forged','user=%ff&hash='+'0'.repeat(64)];
 for(const [i,candidate] of cases.entries()){const x=await exchange(candidate);assert.equal(x.r.statusCode,[401,401,401,422,422,422][i],x.r.json().error?.code);assert.equal(x.r.headers['set-cookie'],undefined);}
});
test('MAX-AUTH-03 Origin and bootstrap CSRF are required for exchange; foreign bootstrap reads rejected',async()=>{
 const b=await boot();
 for(const extras of [{origin:'https://foreign.invalid','x-bootstrap-csrf':b.csrf},{'x-bootstrap-csrf':b.csrf},{origin:cfg.publicOrigin,'x-bootstrap-csrf':'invalid'},{origin:cfg.publicOrigin}]){
  const r=await app.inject({method:'POST',url:'/api/v1/session/max',headers:{cookie:'__Host-max_bootstrap='+b.binding,'content-type':'application/json',...extras},payload:{initData:proof(),exchangeKey:randomUUID()}});
  assert.ok([401,403].includes(r.statusCode));
 }
 for(const h of [{origin:'null'},{origin:'https://foreign.invalid'},{'sec-fetch-site':'cross-site'}])assert.equal((await app.inject({url:'/api/v1/session/bootstrap',headers:h})).statusCode,403);
});
test('MAX-AUTH-04 anonymous access and query/unsafe identities cannot authorize',async()=>{
 for(const url of ['/api/v1/session?user=1&startapp=admin','/api/ui/v1/session','/api/v1/plans','/api/v1/plans/'+randomUUID()])assert.equal((await app.inject({url})).statusCode,401);
 const b=await boot();const r=await app.inject({method:'POST',url:'/api/v1/session/max',headers:{origin:cfg.publicOrigin,cookie:'__Host-max_bootstrap='+b.binding,'x-bootstrap-csrf':b.csrf},payload:{initData:proof(),exchangeKey:randomUUID(),initDataUnsafe:{user:{id:1}},startapp:'admin'}});
 assert.equal(r.statusCode,400);
});
test('MAX-AUTH-05 start_param tampering invalidates HMAC; valid context grants no foreign-object ACL',async()=>{
 const a=await launch(),b=await launch();
 const created=await app.inject({method:'POST',url:'/api/v1/plans',headers:{...headers(a),'idempotency-key':randomUUID()},payload:{title:'SYNTHETIC ACL',slots:[{slotId:randomUUID(),label:'Owner',required:true,actorId:a.body.actor.id,state:'ACTIVE'}],rule:{kind:'ALL'},decisionDeadline:new Date(Date.now()+3600000).toISOString(),commitmentDeadline:new Date(Date.now()+7200000).toISOString()}});
 assert.equal(created.statusCode,200);const id=created.json().planId;
 const raw=proof(identity(),{start_param:'catalog'});assert.equal((await exchange(raw.replace('start_param=catalog','start_param=p_'+id))).r.statusCode,401);
 const foreign=await launch(proof(identity(),{start_param:'p_'+id}));
 for(const x of [b,foreign]){
  assert.equal((await app.inject({url:'/api/v1/plans/'+id+'?startapp=p_'+id,headers:headers(x)})).statusCode,404);
  assert.equal((await app.inject({method:'POST',url:'/api/v1/plans/'+id+'/invites',headers:{...headers(x),'idempotency-key':randomUUID()},payload:{expectedStateVersion:1}})).statusCode,404);
 }
});
test('MAX-AUTH-06 replay same exchange is idempotent; new bootstrap resumes only exact active session',async()=>{
 const x=await launch(),retry=await exchange(x.raw,undefined,x.b,x.key);assert.equal(retry.r.statusCode,200);assert.ok(cookie(retry.r,'__Host-max_session')===x.token);
 await pool.query("UPDATE session_exchanges SET escrow=NULL,escrow_expires_at=clock_timestamp()-interval '1 second' WHERE binding_hash IS NOT NULL AND session_id=(SELECT id FROM app_sessions WHERE actor_id=$1 ORDER BY issued_at DESC LIMIT 1)",[x.body.actor.id]);
 const expired=await exchange(x.raw,undefined,x.b,x.key);assert.equal(expired.r.statusCode,401);assert.equal(expired.r.json().error.code,'REAUTH_REQUIRED');
 const resumed=await launch(x.raw,x.token);assert.ok(resumed.token===x.token);assert.equal(resumed.body.absoluteExpiresAt,x.body.absoluteExpiresAt);
 const other=await exchange(x.raw);assert.equal(other.r.statusCode,401);
});
test('MAX-AUTH-07 fresh launch rotates token and CSRF; new MAX account cannot inherit old identity',async()=>{
 const a=await launch(),b=await launch(proof(),a.token);
 assert.notEqual(a.body.actor.id,b.body.actor.id);assert.ok(a.token!==b.token);assert.ok(a.body.csrfToken!==b.body.csrfToken);
 assert.equal((await app.inject({url:'/api/v1/session',headers:headers(a)})).statusCode,401);
 assert.equal((await exchange(a.raw,undefined,a.b,a.key)).r.statusCode,401);
 assert.equal((await app.inject({method:'POST',url:'/api/v1/session/logout',headers:{...headers(b),'x-csrf-token':a.body.csrfToken},payload:{}})).statusCode,403);
});
test('MAX-AUTH-08 logout revokes session and escrow; missing/wrong Origin and CSRF cannot log out',async()=>{
 const x=await launch();
 for(const extra of [{origin:'https://foreign.invalid'}, {origin:'null'},{'x-csrf-token':'invalid'},{'x-csrf-token':''}]){
  assert.equal((await app.inject({method:'POST',url:'/api/v1/session/logout',headers:{...headers(x),...extra},payload:{}})).statusCode,403);
 }
 const r=await app.inject({method:'POST',url:'/api/v1/session/logout',headers:headers(x),payload:{}});assert.equal(r.statusCode,200);
 assert.equal((await app.inject({url:'/api/v1/session',headers:headers(x)})).statusCode,401);
 assert.equal((await exchange(x.raw,undefined,x.b,x.key)).r.statusCode,401);
 assert.equal((await exchange(x.raw,x.token)).r.statusCode,401);
});
test('MAX-AUTH-09 idle and absolute expiry reject auth and exchange replay',async()=>{
 for(const expiry of ["last_seen_at=clock_timestamp()-interval '901 seconds'","absolute_expires_at=clock_timestamp()-interval '1 second'"]){
  const x=await launch();await pool.query('UPDATE app_sessions SET '+expiry+' WHERE actor_id=$1',[x.body.actor.id]);
  assert.equal((await app.inject({url:'/api/v1/session',headers:headers(x)})).statusCode,401);
  assert.equal((await exchange(x.raw,undefined,x.b,x.key)).r.statusCode,401);
 }
});
test('MAX-AUTH-10 embedded cookie profile uses Secure SameSite=None Partitioned',async()=>{
 const embedded=await buildApp({...cfg,cookieProfile:'PARTITIONED_EMBEDDED'});
 try{const r=await embedded.app.inject({url:'/api/v1/session/bootstrap'});assert.equal(r.statusCode,200);const attrs=String(r.headers['set-cookie']);for(const expected of [/HttpOnly/,/Secure/,/SameSite=None/,/Partitioned/])assert.match(attrs,expected);}
 finally{await embedded.app.close();}
});

test('MAX-AUTH-11 simultaneous same exchange is idempotent and cross-browser proof replay has one winner',async()=>{
 const b=await boot(),raw=proof(),key=randomUUID();
 const same=await Promise.all([exchange(raw,undefined,b,key),exchange(raw,undefined,b,key)]);
 assert.deepEqual(same.map(x=>x.r.statusCode),[200,200]);
 assert.ok(cookie(same[0]!.r,'__Host-max_session')===cookie(same[1]!.r,'__Host-max_session'));
 const another=proof(),bindings=await Promise.all([boot(),boot()]);
 const cross=await Promise.all(bindings.map(binding=>exchange(another,undefined,binding)));
 assert.deepEqual(cross.map(x=>x.r.statusCode).sort(),[200,401]);
});
test('MAX-AUTH-12 same-account fresh launch rotates token; direct session revocation blocks escrow replay',async()=>{
 const id=identity(),a=await launch(proof(id)),b=await launch(proof(id),a.token);
 assert.equal(a.body.actor.id,b.body.actor.id);assert.ok(a.token!==b.token);assert.ok(a.body.csrfToken!==b.body.csrfToken);
 await pool.query('UPDATE app_sessions SET revoked=true WHERE actor_id=$1',[b.body.actor.id]);
 assert.equal((await exchange(b.raw,undefined,b.b,b.key)).r.statusCode,401);
});

test('MAX-AUTH-13 authenticated reads retain Origin and fetch-site isolation',async()=>{
 const x=await launch();for(const url of ['/api/v1/session','/api/ui/v1/session']){
  for(const extra of [{origin:'null'},{origin:'https://foreign.invalid'},{'sec-fetch-site':'cross-site'}])assert.equal((await app.inject({url,headers:{...headers(x),...extra}})).statusCode,403);
  assert.equal((await app.inject({url,headers:{cookie:'__Host-max_session='+x.token}})).statusCode,200);
 }
});
