import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import pg from 'pg';
import {buildApp} from '../../apps/api/app.ts';
import {seedDemoCatalog} from '../../packages/demo/seed.ts';
import {DEMO_ITEMS,DEMO_NOTICE,DEMO_SOURCE_ID} from '../../packages/demo/catalog-v2.ts';
import {envelopeFor} from '../../apps/miniapp/src/core/commands.ts';
import type {CatalogView,EventView,Receipt,Route} from '../../apps/miniapp/src/port/contracts.ts';
import type {Config} from '../../packages/platform/config.ts';
import {sign} from '../fixtures.ts';

const databaseUrl=process.env.DEMO_TEST_DATABASE_URL;
assert.ok(databaseUrl&&new URL(databaseUrl).hostname==='127.0.0.1'&&new URL(databaseUrl).pathname==='/povod_demo_verify','fresh isolated demo database required');
const cfg:Config={mode:'demo',demoCatalogVersion:'v2',databaseUrl,redisUrl:'redis://127.0.0.1:6379',publicOrigin:'http://127.0.0.1:3000',
 sessionKey:randomBytes(32).toString('hex'),escrowKey:randomBytes(32).toString('hex'),botToken:'DEMO_SYNTHETIC_MAX_SIGNING_TOKEN',webhookSecret:randomBytes(32).toString('hex'),credentialScope:'DEMO_TEST',cookieProfile:'LAX_FIRST_PARTY',ingressMode:'WEBHOOK',liveGate:''};
const {app,pool,sessions}=await buildApp(cfg);
type Actor=Awaited<ReturnType<typeof launch>>;
async function launch(){const boot=await sessions.bootstrap(),external=BigInt('0x'+randomBytes(7).toString('hex')).toString();
 const exchanged=await sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${external},"first_name":"DEMO_TEST"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()}),randomUUID(),undefined);
 return {token:exchanged.token,csrf:exchanged.body.csrfToken,id:exchanged.body.actor.id};}
const headers=(a:Actor)=>({cookie:`__Host-max_session=${a.token}`,origin:cfg.publicOrigin,'content-type':'application/json','x-csrf-token':a.csrf});
async function view(a:Actor,route:Route){const r=await app.inject({url:'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify(route)),headers:headers(a)});assert.equal(r.statusCode,200,r.body);return r.json();}
const saved=(a:Actor)=>app.inject({url:'/api/v1/me/saved',headers:headers(a)});
let a:Actor,b:Actor;
before(async()=>{await app.ready();a=await launch();b=await launch();});
after(async()=>{await app.close();});

test('fresh PostgreSQL demo seed and rerun preserve canonical identities, Save and uncertainty',async()=>{
 const first=await seedDemoCatalog(pool,cfg.publicOrigin);
 assert.deepEqual(first,{demoCatalog:'v2',canonicalOccurrences:3,searchCandidates:3});
 const ids=(await pool.query<{id:string}>("SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 ORDER BY e.provider_event_id",[DEMO_SOURCE_ID])).rows.map(x=>x.id);
 assert.equal(ids.length,3);
 const put=await app.inject({method:'PUT',url:'/api/v1/me/saved/'+ids[0],headers:headers(a),payload:{}});assert.equal(put.statusCode,200,put.body);
 assert.deepEqual(await seedDemoCatalog(pool,cfg.publicOrigin),first);
 const afterIds=(await pool.query<{id:string}>("SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 ORDER BY e.provider_event_id",[DEMO_SOURCE_ID])).rows.map(x=>x.id);
 assert.deepEqual(afterIds,ids);assert.equal((await saved(a)).json().items.length,1);
 const items=(await pool.query<{price:{kind:string;totalMaxMinor:string|null}}>("SELECT o.price FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 ORDER BY e.provider_event_id",[DEMO_SOURCE_ID])).rows;
 assert.ok(items.some(x=>x.price.kind==='UNKNOWN'));
 assert.ok(items.every(x=>x.price.kind==='UNKNOWN'));
});
test('authenticated search → Detail → Save → Saved → reload, with cross-user isolation',async()=>{
 const scope={kind:'PERSONAL' as const};
 const initial=await view(a,{kind:'CATALOG',scope}) as CatalogView;
 assert.equal(initial.notice,DEMO_NOTICE);assert.equal(initial.events.length,DEMO_ITEMS.length);
 assert.ok(initial.events.every(x=>x.sourceUrl?.includes('/demo/source/')));
 const search=await app.inject({method:'POST',url:'/api/ui/v1/commands',headers:headers(a),payload:envelopeFor(initial,{type:'SEARCH',scope,draft:{...initial.query,city:'Москва',timeZone:'Europe/Moscow',includedCategories:['SPORT']}},randomUUID())});
 assert.equal(search.statusCode,200,search.body);
 const filtered=search.json<Receipt>().view as CatalogView;
 assert.equal(filtered.events.length,3);assert.match(filtered.events[0]!.title,/Вымышленное спортивное событие/);
 const ref=filtered.events[0]!.ref;
 const detail=await view(a,{kind:'EVENT',scope,sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceId:ref.occurrenceId}) as EventView;
 assert.equal(detail.notice,DEMO_NOTICE);assert.equal(detail.event.ref.observationId,ref.observationId);
 const resolved=await app.inject({url:'/api/v1/me/saved/resolve?'+new URLSearchParams({sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceRef:ref.occurrenceId!}),headers:headers(a)});
 assert.equal(resolved.statusCode,200,resolved.body);const id=resolved.json().occurrenceId;assert.ok(id);
 assert.equal((await app.inject({method:'PUT',url:'/api/v1/me/saved/'+id,headers:headers(a),payload:{}})).statusCode,200);
 const list=(await saved(a)).json().items;
 assert.ok(list.some((x:{occurrence:{id:string;price:{kind:string}}})=>x.occurrence.id===id&&x.occurrence.price.kind==='UNKNOWN'));
 assert.equal((await saved(b)).json().items.length,0);
 const fresh=new pg.Pool({connectionString:databaseUrl});try{assert.equal((await fresh.query('SELECT 1 FROM saved_occurrences WHERE actor_id=$1 AND occurrence_id=$2',[a.id,id])).rowCount,1);}finally{await fresh.end();}
 const reloaded=await view(a,{kind:'CATALOG',scope}) as CatalogView;assert.equal(reloaded.query.city,'Москва');assert.equal(reloaded.events.length,3);
 const sourcePage=await app.inject({url:'/demo/source/demo-curling'});assert.equal(sourcePage.statusCode,200);assert.match(sourcePage.body,/Демонстрационная афиша — события вымышлены/);
 assert.equal((await app.inject({url:'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify({kind:'CATALOG',scope}))})).statusCode,401);
});
test('live-mode negative control has no synthetic catalog or demo source page',async()=>{
 const live=await buildApp({...cfg,mode:'live',demoCatalogVersion:undefined});
 try{await live.app.ready();const v=await live.ui.read({actor_id:a.id,session_id:(await pool.query<{id:string}>('SELECT id FROM app_sessions WHERE actor_id=$1 LIMIT 1',[a.id])).rows[0]!.id},{kind:'CATALOG',scope:{kind:'PERSONAL'}});
  assert.equal(v.kind,'CATALOG');if(v.kind==='CATALOG'){assert.equal(v.events.length,0);assert.notEqual(v.notice,DEMO_NOTICE);}
  const hidden=await live.app.inject({url:'/api/v1/me/saved',headers:headers(a)});assert.equal(hidden.statusCode,200);assert.deepEqual(hidden.json().items,[]);
  const syntheticId=(await pool.query<{id:string}>("SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 LIMIT 1",[DEMO_SOURCE_ID])).rows[0]!.id;
  assert.equal((await live.app.inject({method:'PUT',url:'/api/v1/me/saved/'+syntheticId,headers:headers(a),payload:{}})).statusCode,404);
  assert.equal((await live.app.inject({url:'/demo/source/demo-curling'})).statusCode,404);
 }finally{await live.app.close();}
});
