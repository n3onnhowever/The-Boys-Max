import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {initialize,assertSessionCsrf} from '../../apps/miniapp/client.ts';
import {attachBack,share} from '../../apps/miniapp/bridge.ts';

// Synthetic browser boundaries only; no mock Bridge ships in the application.
const session={actor:{id:'10000000-0000-4000-8000-000000000001',displayName:'SYNTHETIC'},csrfToken:'synthetic-csrf',absoluteExpiresAt:'2099-01-01T00:00:00.000Z',idleTtlSeconds:900};
function browser(t:TestContext,app:unknown,fetcher:typeof fetch){
 const original=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{WebApp:app,location:{hash:'',href:'https://test.invalid/'}}});
 t.after(()=>{if(original)Object.defineProperty(globalThis,'window',original);else Reflect.deleteProperty(globalThis,'window');});
 t.mock.method(globalThis,'fetch',fetcher);
}
test('fresh MAX launch is verified before an existing cookie can select identity',async t=>{
 const calls:{path:string;options:RequestInit|undefined}[]=[];
 browser(t,{initData:'signed-synthetic-launch',initDataUnsafe:{user:{id:42}}},async(path,options)=>{
  calls.push({path:String(path),options});
  return Response.json(String(path).endsWith('/bootstrap')?{csrfToken:'synthetic-bootstrap'}:session);
 });
 await initialize();
 assert.equal(calls[0]?.path,'/api/v1/session/bootstrap');
 assert.equal(calls[1]?.path,'/api/v1/session/max');
 const body=JSON.parse(String(calls[1]?.options?.body));
 assert.equal(body.initData,'signed-synthetic-launch');assert.equal('user' in body,false);
 assert.ok(calls.every(c=>c.options?.cache==='no-store'&&c.options?.redirect==='error'));
});
test('new launch rejection never falls back to the previous identity',async t=>{
 const paths:string[]=[];
 browser(t,{initData:'tampered-synthetic-launch'},async path=>{
  paths.push(String(path));
  if(String(path).endsWith('/bootstrap'))return Response.json({csrfToken:'synthetic-bootstrap'});
  if(String(path).endsWith('/max'))return Response.json({error:{code:'AUTH_INVALID'}},{status:401});
  return Response.json(session);
 });
 await assert.rejects(initialize(),/AUTH_INVALID/);assert.equal(paths.includes('/api/v1/session'),false);
});
test('external browser can resume only an existing server session',async t=>{
 browser(t,undefined,async()=>Response.json(session));assert.deepEqual(await initialize(),session);
});
test('unsafe identity alone cannot issue a session',async t=>{
 const paths:string[]=[];
 browser(t,{initData:'',initDataUnsafe:{user:{id:42}}},async path=>{paths.push(String(path));return Response.json({error:{code:'SESSION_REQUIRED'}},{status:401});});
 await assert.rejects(initialize());assert.deepEqual(paths,['/api/v1/session']);
});
test('transport retry reuses exact exchange body and bootstrap',async t=>{
 const bodies:string[]=[];let boot=0;
 browser(t,{initData:'signed-synthetic-launch'},async(path,options)=>{
  if(String(path).endsWith('/bootstrap')){boot++;return Response.json({csrfToken:'synthetic-bootstrap'});}
  if(String(path)==='/api/v1/session')return Response.json(session);
  bodies.push(String(options?.body));if(bodies.length===1)throw new TypeError('synthetic network loss');return Response.json(session);
 });
 await initialize();assert.equal(boot,1);assert.equal(bodies.length,2);assert.equal(bodies[0],bodies[1]);
});
test('partial BackButton does not break browser fallback',t=>{
 browser(t,{initData:'synthetic',platform:'android',BackButton:{}},async()=>Response.json({}));assert.doesNotThrow(()=>attachBack(()=>{})());
});
test('throwing share Bridge reports failure without throwing into UI',async t=>{
 browser(t,{initData:'synthetic',platform:'android',shareMaxContent(){throw new Error('unsupported host');}},async()=>Response.json({}));
 assert.equal(await share('SYNTHETIC','https://max.ru/test_bot?startapp=catalog'),'FAILED');
});

test('blocked cookie storage is explicit and never a successful login',async t=>{
 browser(t,{initData:'SYNTHETIC'},async path=>{
  if(String(path).endsWith('/bootstrap'))return Response.json({csrfToken:'synthetic-bootstrap'});
  if(String(path).endsWith('/max'))return Response.json(session);
  return Response.json({error:{code:'SESSION_REQUIRED'}},{status:401});
 });
 await assert.rejects(initialize(),/SESSION_STORAGE_UNSUPPORTED/);
});
test('external browser service outage does not trigger new session issuance',async t=>{
 const paths:string[]=[];browser(t,undefined,async path=>{paths.push(String(path));return Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503});});
 await assert.rejects(initialize(),/SERVICE_UNAVAILABLE/);assert.deepEqual(paths,['/api/v1/session']);
});

test('a tab cannot replace its CSRF binding after another MAX account changes the cookie',async t=>{
 browser(t,undefined,async()=>Response.json(session));await initialize();
 assert.doesNotThrow(()=>assertSessionCsrf(session.csrfToken));
 assert.throws(()=>assertSessionCsrf('another-session-csrf'),/SESSION_REPLACED/);
 assert.doesNotThrow(()=>assertSessionCsrf(session.csrfToken));
});
