/** Isolated PostgreSQL, independent authenticated sessions, synthetic actors only. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {config} from '../../packages/platform/config.ts';
import {buildApp} from '../../apps/api/app.ts';
import {sign} from '../fixtures.ts';
const cfg=config();assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');
const {app,pool,sessions}=await buildApp(cfg);
before(async()=>{await app.ready()});after(async()=>{await app.close()});
async function session(external=BigInt('0x'+randomBytes(7).toString('hex')).toString()){
 const boot=await sessions.bootstrap();return sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${external},"first_name":"SYNTHETIC K7"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()}),randomUUID(),undefined);
}
type Auth=Awaited<ReturnType<typeof session>>;
const headers=(s:Auth)=>({cookie:`__Host-max_session=${s.token}`,origin:cfg.publicOrigin,'x-csrf-token':s.body.csrfToken});
const read=async(s:Auth)=>(await app.inject({url:'/api/v1/me/preferences',headers:headers(s)})).json();
const write=(s:Auth,value:Record<string,unknown>)=>app.inject({method:'PUT',url:'/api/v1/me/preferences',headers:headers(s),payload:value});
const payload=(p:Record<string,unknown>,patch:Record<string,unknown>={})=>{const {catalogCoverage,version,...values}=p;return {...values,expectedVersion:version,...patch}};
test('K7 absent row reads defaults/version zero without creating a row; first save returns version one',async()=>{
 const a=await session(),initial=await read(a);assert.equal(initial.version,0);assert.equal(initial.city,'Москва');assert.equal(initial.notificationsEnabled,true);
 assert.equal((await pool.query('SELECT 1 FROM actor_preferences WHERE actor_id=$1',[a.body.actor.id])).rowCount,0);
 const saved=await write(a,payload(initial,{budgetRub:1000}));assert.equal(saved.statusCode,200,saved.body);assert.equal(saved.json().version,1);assert.equal((await read(a)).budgetRub,1000);
});
test('K7 two concurrent first writes have exactly one winner, including separate sessions',async()=>{
 const external=BigInt('0x'+randomBytes(7).toString('hex')).toString(),a=await session(external),b=await session(external);
 assert.equal(a.body.actor.id,b.body.actor.id);assert.notEqual(a.token,b.token);
 const initial=await read(a);const results=await Promise.all([write(a,payload(initial,{budgetRub:2000})),write(b,payload(initial,{interests:['Кино']}))]);
 assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,409]);
 const winner=results.find(r=>r.statusCode===200)!.json(),loser=results.find(r=>r.statusCode===409)!;
 assert.equal(loser.json().error.code,'PREFERENCES_VERSION_CONFLICT');assert.equal(winner.version,1);assert.deepEqual(await read(a),winner);
});
for(const field of ['same','unrelated'])test(`K7 ${field} field stale drafts repeatedly conflict and change no saved values`,async()=>{
 const external=BigInt('0x'+randomBytes(7).toString('hex')).toString(),a=await session(external),b=await session(external);
 const initial=await read(a);await write(a,payload(initial,{budgetRub:1000}));
 const draftA=await read(a),draftB=await read(b);
 const saved=await write(a,payload(draftA,{budgetRub:2000,notificationsEnabled:false,radiusKm:25,preferredTime:'EVENING'}));assert.equal(saved.statusCode,200,saved.body);assert.equal(saved.json().version,2);
 const stale=payload(draftB,field==='same'?{budgetRub:3000}:{interests:['Театр']});
 for(let i=0;i<2;i++){const conflict=await write(b,stale);assert.equal(conflict.statusCode,409,conflict.body);assert.equal(conflict.json().error.code,'PREFERENCES_VERSION_CONFLICT');assert.deepEqual(await read(b),saved.json())}
 const current=await read(b),success=await write(b,payload(current,{interests:['Театр']}));assert.equal(success.statusCode,200,success.body);assert.equal(success.json().version,3);assert.equal(success.json().budgetRub,2000);assert.equal(success.json().notificationsEnabled,false);
});
test('K7 simultaneous existing-row updates compare versions atomically and actors remain isolated',async()=>{
 const external=BigInt('0x'+randomBytes(7).toString('hex')).toString(),a=await session(external),b=await session(external),other=await session(),initial=await read(a);await write(a,payload(initial));const current=await read(a);
 const results=await Promise.all([write(a,payload(current,{city:'Казань'})),write(b,payload(current,{radiusKm:50})),write(other,payload(await read(other),{budgetRub:500}))]);
 assert.deepEqual(results.slice(0,2).map(r=>r.statusCode).sort(),[200,409]);assert.equal(results[2]!.statusCode,200);assert.equal((await read(a)).version,2);assert.equal((await read(other)).version,1);assert.equal((await read(other)).budgetRub,500);
});
test('K7 missing/invalid expected version fails bounded validation; nonzero version cannot create absent row',async()=>{
 const a=await session(),initial=await read(a),good=payload(initial);
 for(const v of [undefined,-1,0.5,'0',2147483648]){const bad={...good,expectedVersion:v};const r=await write(a,bad);assert.equal(r.statusCode,400,r.body)}
 const r=await write(a,{...good,expectedVersion:9});assert.equal(r.statusCode,409,r.body);assert.equal(r.json().error.code,'PREFERENCES_VERSION_CONFLICT');assert.deepEqual(await read(a),initial);
 const csrf=await app.inject({method:'PUT',url:'/api/v1/me/preferences',headers:{...headers(a),'x-csrf-token':''},payload:good});assert.equal(csrf.statusCode,403);
});
