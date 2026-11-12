import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {buildApp} from '../../apps/api/app.ts';
import {httpConfig,signedSession,errorResponse} from './http-boundary-fixtures.ts';
const c=httpConfig(),ctx=await buildApp(c);let user:Awaited<ReturnType<typeof signedSession>>,issues=0,validations=0;
ctx.app.addHook('onError',async(_r,_p,e)=>{issues=Array.isArray(e.validation)?e.validation.length:0;});
// preValidation runs after onRequest/auth and parsing. Count actual lifecycle work, not a timing threshold.
ctx.app.addHook('preValidation',async r=>{if(r.method==='PUT'&&r.routeOptions.url==='/api/v1/me/preferences')validations++;});
before(async()=>{await ctx.app.ready();user=await signedSession(ctx,c);});after(async()=>{
 const state=await ctx.pool.query('SELECT version,cardinality(interests) interest_count FROM actor_preferences WHERE actor_id=$1',[user.actorId]);
 console.log(JSON.stringify({finding:'F079',syntheticPreferenceState:state.rows}));await ctx.app.close();
});
const body=(interests:unknown[]=[])=>({city:'Москва',interests,budgetRub:null,radiusKm:100,notificationsEnabled:false,preferredTime:'ANY',expectedVersion:0});
const put=(payload:unknown,headers:Record<string,string>=user.headers)=>ctx.app.inject({method:'PUT',url:'/api/v1/me/preferences',headers,payload:typeof payload==='string'?payload:JSON.stringify(payload)});
test('preferences authenticates before parsing or validation of 14000 invalid interests',async()=>{
 const before=validations;global.gc?.();const cpu=process.cpuUsage(),heap=process.memoryUsage().heapUsed,start=performance.now();
 const r=await put(body(Array(14000).fill(null)),{origin:c.publicOrigin,'content-type':'application/json','x-csrf-token':'synthetic'});
 console.log(JSON.stringify({finding:'F079',kind:'anonymous',status:r.statusCode,validationIssues:issues,preValidationCalls:validations-before,elapsedMs:performance.now()-start,cpuMicros:process.cpuUsage(cpu),heapDelta:process.memoryUsage().heapUsed-heap}));
 errorResponse(r,401,'SESSION_REQUIRED');assert.equal(validations,before);assert.equal(issues,0);
});
test('preferences rejects invalid session before malformed JSON',async()=>{const before=validations;errorResponse(await put('{', {...user.headers,cookie:'__Host-max_session='+'x'.repeat(43)}),401,'SESSION_EXPIRED');assert.equal(validations,before);});
test('preferences absent Origin rejects the original anonymous audit shape before validation',async()=>{
 const before=validations;errorResponse(await put(body(Array(14000).fill(null)),{'content-type':'application/json'}),403,'ORIGIN_INVALID');assert.equal(validations,before);assert.equal(issues,0);
});
test('preferences requires CSRF before parsing',async()=>{const before=validations;errorResponse(await put('{',{...user.headers,'x-csrf-token':''}),403,'CSRF_REQUIRED');assert.equal(validations,before);});
test('preferences requires correct CSRF before parsing',async()=>{errorResponse(await put('{',{...user.headers,'x-csrf-token':'invalid'}),403,'CSRF_INVALID');});
test('preferences rejects malformed JSON for authenticated requests',async()=>{errorResponse(await put('{'),422,'JSON_SYNTAX');});
test('preferences rejects authenticated oversized payload before validation',async()=>{const before=validations;errorResponse(await put(body(Array(14000).fill(null))),413,'BODY_TOO_LARGE');assert.equal(validations,before);assert.equal(issues,0);});
test('preferences bounds array structure before per-element validation',async()=>{
 const r=await put(body(Array(1000).fill(null)));errorResponse(r,400,'VALIDATION_FAILED');assert.equal(issues,0);
});
test('preferences retains twenty maximum multilingual interests and optimistic versioning',async()=>{
 const payload={...body(Array.from({length:20},(_,i)=>String.fromCharCode(0x4e00+i).repeat(80))),city:'界'.repeat(80)};
 // Escaped UTF-16 is a larger valid JSON representation than raw multilingual UTF-8.
 const raw=JSON.stringify(payload).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 assert.ok(Buffer.byteLength(raw)>10000);const r=await put(raw);assert.equal(r.statusCode,200);
 assert.deepEqual(r.json().interests,payload.interests);assert.equal(r.json().version,1);
 errorResponse(await put(payload),409);
 const emoji={...body(Array(20).fill('🎉'.repeat(40))),expectedVersion:1};assert.equal((await put(emoji)).statusCode,200);
});
test('preferences retains 21-item rejection and 80-character per-item limit',async()=>{
 errorResponse(await put(body(Array(21).fill('valid'))),400,'VALIDATION_FAILED');
 errorResponse(await put(body(['x'.repeat(81)])),400,'VALIDATION_FAILED');
});
test('preferences concurrent invalid requests do no parsing/validation without a session',async()=>{
 const before=validations;let release!:()=>void;const barrier=new Promise<void>(resolve=>release=resolve);
 const requests=Array.from({length:32},async()=>{await barrier;return put(body(Array(14000).fill(null)),{origin:c.publicOrigin,'content-type':'application/json','x-csrf-token':'synthetic'});});release();
 for(const r of await Promise.all(requests))errorResponse(r,401,'SESSION_REQUIRED');assert.equal(validations,before);
});
test('preferences concurrent authenticated structural failures create no Zod issues or updates',async()=>{
 const before=(await ctx.pool.query('SELECT version FROM actor_preferences WHERE actor_id=$1',[user.actorId])).rows;
 let release!:()=>void;const barrier=new Promise<void>(resolve=>release=resolve);
 const requests=Array.from({length:16},async()=>{await barrier;return put(body(Array(1000).fill(null)));});release();
 for(const r of await Promise.all(requests))errorResponse(r,400,'VALIDATION_FAILED');assert.equal(issues,0);
 assert.deepEqual((await ctx.pool.query('SELECT version FROM actor_preferences WHERE actor_id=$1',[user.actorId])).rows,before);
});
