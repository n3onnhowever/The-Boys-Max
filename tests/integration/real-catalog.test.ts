import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {buildApp} from '../../apps/api/app.ts';
import {importCuratedOfficialCatalog} from '../../packages/real-catalog/import.ts';
import {seedDemoCatalog} from '../../packages/demo/seed.ts';
import type {CuratedFile} from '../../packages/real-catalog/adapters.ts';
import type {Config} from '../../packages/platform/config.ts';
import type {CatalogView,EventView} from '../../apps/miniapp/src/port/contracts.ts';
import {sign} from '../fixtures.ts';

const databaseUrl=process.env.REAL_CATALOG_TEST_DATABASE_URL;
assert.ok(databaseUrl&&new URL(databaseUrl).hostname==='127.0.0.1'&&new URL(databaseUrl).pathname==='/povod_real_catalog_verify','fresh isolated real-catalog database required');
const cfg:Config={mode:'live',databaseUrl,redisUrl:'redis://127.0.0.1:6379',publicOrigin:'http://127.0.0.1:3000',
 sessionKey:randomBytes(32).toString('hex'),escrowKey:randomBytes(32).toString('hex'),botToken:randomBytes(24).toString('hex'),webhookSecret:randomBytes(32).toString('hex'),credentialScope:'REAL_CATALOG_TEST',cookieProfile:'LAX_FIRST_PARTY',ingressMode:'WEBHOOK',liveGate:'REVIEWED_MAX26_LIVE',externalOrigins:['https://www.darwinmuseum.ru']};
const {app,pool,sessions}=await buildApp(cfg);
const file=JSON.parse(readFileSync('tests/fixtures/real-catalog/curated-official-v1.json','utf8')) as CuratedFile;
const scope={kind:'PERSONAL' as const};
let actor:{id:string;token:string;csrf:string};
const headers=()=>({cookie:`__Host-max_session=${actor.token}`,origin:cfg.publicOrigin,'content-type':'application/json','x-csrf-token':actor.csrf});
async function view(route:unknown){const r=await app.inject({url:'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify(route)),headers:headers()});assert.equal(r.statusCode,200,r.body);return r.json();}
before(async()=>{await app.ready();const boot=await sessions.bootstrap();const exchanged=await sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${BigInt('0x'+randomBytes(7).toString('hex'))},"first_name":"REAL_TEST"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()}),randomUUID(),undefined);actor={id:exchanged.body.actor.id,token:exchanged.token,csrf:exchanged.body.csrfToken};});
after(async()=>{await app.close();});

test('real Search → Detail → Save, exact source and rerun identity',async()=>{
 const result=await importCuratedOfficialCatalog(pool,file);assert.deepEqual(result,{events:4,occurrences:5,searchCandidates:5,quarantined:0});
 const catalog=await view({kind:'CATALOG',scope}) as CatalogView;
 assert.equal(catalog.events.length,5);assert.ok(catalog.events.every(e=>e.sourceUrl?.startsWith('https://www.darwinmuseum.ru/')));
 const exactSources=new Map(file.records.map(record=>[record.identity,record.source_url]));
 assert.ok(catalog.events.every(event=>event.sourceUrl===exactSources.get(event.ref.externalEventId)));
 assert.ok(catalog.events.every(e=>e.sourceLabel==='Дарвиновский музей'));
 const ref=catalog.events[0]!.ref;
 const detail=await view({kind:'EVENT',scope,sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceId:ref.occurrenceId}) as EventView;
 assert.equal(detail.event.sourceUrl,catalog.events[0]!.sourceUrl);
 const resolved=await app.inject({url:'/api/v1/me/saved/resolve?'+new URLSearchParams({sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceRef:ref.occurrenceId!}),headers:headers()});
 assert.equal(resolved.statusCode,200,resolved.body);const id=resolved.json().occurrenceId;assert.ok(id);
 const saved=await app.inject({method:'PUT',url:'/api/v1/me/saved/'+id,headers:headers(),payload:{}});assert.equal(saved.statusCode,200,saved.body);
 const canonicalIds=async()=>(await pool.query<{id:string}>("SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id='real:curated-official:v1' ORDER BY o.id")).rows.map(row=>row.id);
 const beforeRerun=await canonicalIds();
 assert.deepEqual(await importCuratedOfficialCatalog(pool,file),result);
 assert.deepEqual(await canonicalIds(),beforeRerun);
 const again=await app.inject({url:'/api/v1/me/saved',headers:headers()});assert.equal(again.statusCode,200,again.body);
 assert.ok(again.json().items.some((x:{occurrence:{id:string}})=>x.occurrence.id===id));
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id='real:curated-official:v1'")).rows[0].n,5);
});
test('hybrid shows accepted real first and explicitly disclosed demo fallback',async()=>{
 await seedDemoCatalog(pool,cfg.publicOrigin);
 const hybrid=await buildApp({...cfg,mode:'hybrid',demoCatalogVersion:'v3'});
 try{await hybrid.app.ready();const r=await hybrid.app.inject({url:'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify({kind:'CATALOG',scope})),headers:headers()});assert.equal(r.statusCode,200,r.body);
  const catalog=r.json<CatalogView>();assert.equal(catalog.events.length,53);
  assert.ok(catalog.events.slice(0,5).every(e=>e.sourceLabel==='Дарвиновский музей'));
  assert.ok(catalog.events.slice(5).every(e=>e.sourceLabel==='Демо-каталог'));
 }finally{await hybrid.app.close();}
});
