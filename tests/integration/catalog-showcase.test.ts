import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {buildApp} from '../../apps/api/app.ts';
import {envelopeFor} from '../../apps/miniapp/src/core/commands.ts';
import {blankDraft} from '../../modules/integration/projections.ts';
import type {CatalogView,Receipt} from '../../apps/miniapp/src/port/contracts.ts';
import type {Config} from '../../packages/platform/config.ts';
import {sign} from '../fixtures.ts';

const databaseUrl=process.env.SHOWCASE_TEST_DATABASE_URL;
assert.ok(databaseUrl&&new URL(databaseUrl).hostname==='127.0.0.1'&&new URL(databaseUrl).pathname==='/povod_full_catalog_verify','isolated fully imported showcase database required');
const cfg:Config={mode:'hybrid',demoCatalogVersion:'v3',databaseUrl,redisUrl:'redis://127.0.0.1:56390',publicOrigin:'http://127.0.0.1:3000',
 sessionKey:randomBytes(32).toString('hex'),escrowKey:randomBytes(32).toString('hex'),botToken:randomBytes(24).toString('hex'),webhookSecret:randomBytes(32).toString('hex'),credentialScope:'SHOWCASE_TEST',cookieProfile:'LAX_FIRST_PARTY',ingressMode:'WEBHOOK',liveGate:'REVIEWED_MAX26_LIVE'};
const {app,pool,sessions}=await buildApp(cfg);
const scope={kind:'PERSONAL' as const};
let actor:{token:string;csrf:string};
const headers=()=>({cookie:`__Host-max_session=${actor.token}`,origin:cfg.publicOrigin,'content-type':'application/json','x-csrf-token':actor.csrf});
async function view(){const r=await app.inject({url:'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify({kind:'CATALOG',scope})),headers:headers()});assert.equal(r.statusCode,200,r.body);return r.json<CatalogView>();}
before(async()=>{await app.ready();const boot=await sessions.bootstrap();const exchanged=await sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${BigInt('0x'+randomBytes(7).toString('hex'))},"first_name":"SHOWCASE_TEST"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()}),randomUUID(),undefined);actor={token:exchanged.token,csrf:exchanged.body.csrfToken};});
after(async()=>{await app.close();});

test('all 167 curated LIVE results precede synthetic supplement at the 200 result ceiling',async()=>{
 const counts=(await pool.query<{data_mode:string;count:string}>('SELECT data_mode,count(*)::text AS count FROM catalog_occurrences GROUP BY data_mode ORDER BY data_mode')).rows;
 assert.deepEqual(counts,[{data_mode:'LIVE',count:'167'},{data_mode:'SYNTHETIC',count:'48'}]);
 const files=['curated-official-v1.json','curated-official-tretyakov-exact-v1.json','curated-kudago-moscow-a-v1.json','curated-kudago-moscow-b-v1.json'];
 const urls=new Set(files.flatMap(file=>(JSON.parse(readFileSync(`scripts/data/${file}`,'utf8')) as {records:{source_url:string}[]}).records.map(record=>record.source_url)));
 const result=await view();assert.equal(result.events.length,200);
 assert.ok(result.events.slice(0,167).every(item=>item.sourceUrl&&urls.has(item.sourceUrl)&&item.sourceLabel!=='Демо-каталог'&&!item.price.fees_known));
 assert.ok(result.events.slice(167).every(item=>item.sourceLabel==='Демо-каталог'&&item.sourceUrl?.includes('/demo/source/v3/')));
});

test('hybrid sport and hard budget recover labeled synthetic matches without uncertain real prices',async()=>{
 const current=await view();const draft={...blankDraft(),city:'Москва',timeZone:'Europe/Moscow',includedCategories:['SPORT'],budgetText:'500',priceBasis:'PER_PERSON' as const};
 const response=await app.inject({method:'POST',url:'/api/ui/v1/commands',headers:headers(),payload:envelopeFor(current,{type:'SEARCH',scope,draft},randomUUID())});assert.equal(response.statusCode,200,response.body);
 const filtered=response.json<Receipt>().view as CatalogView;assert.ok(filtered.events.length>=2);
 assert.ok(filtered.events.every(item=>item.sourceLabel==='Демо-каталог'&&item.price.fees_known&&item.price.totalLabel!==null));
});

test('hard budget excludes all 167 real rows with unconfirmed mandatory fees',async()=>{
 const current=await view();const draft={...blankDraft(),city:'Москва',timeZone:'Europe/Moscow',budgetText:'1000',priceBasis:'PER_PERSON' as const};
 const response=await app.inject({method:'POST',url:'/api/ui/v1/commands',headers:headers(),payload:envelopeFor(current,{type:'SEARCH',scope,draft},randomUUID())});assert.equal(response.statusCode,200,response.body);
 const filtered=response.json<Receipt>().view as CatalogView;assert.ok(filtered.events.length>0);
 assert.ok(filtered.events.every(item=>item.sourceLabel==='Демо-каталог'&&item.price.fees_known));
});

test('Save accepts an admitted real occurrence and an allowed demo occurrence',async()=>{
 const current=await view(),draft={...blankDraft(),city:'Москва',timeZone:'Europe/Moscow'};
 const response=await app.inject({method:'POST',url:'/api/ui/v1/commands',headers:headers(),payload:envelopeFor(current,{type:'SEARCH',scope,draft},randomUUID())});assert.equal(response.statusCode,200,response.body);
 const events=(response.json<Receipt>().view as CatalogView).events;
 for(const event of [events.find(x=>x.sourceLabel!=='Демо-каталог'),events.find(x=>x.sourceLabel==='Демо-каталог')]){
  assert.ok(event);
  const ref=event.ref;
  const resolved=await app.inject({url:'/api/v1/me/saved/resolve?'+new URLSearchParams({sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceRef:ref.occurrenceId!}),headers:headers()});
  assert.equal(resolved.statusCode,200,resolved.body);const id=resolved.json().occurrenceId;assert.ok(id);
  assert.equal((await app.inject({method:'PUT',url:'/api/v1/me/saved/'+id,headers:headers(),payload:{}})).statusCode,200);
 }
 const saved=await app.inject({url:'/api/v1/me/saved',headers:headers()});assert.equal(saved.statusCode,200,saved.body);
 assert.equal(saved.json().items.length,2);
});
