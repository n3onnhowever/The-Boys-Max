import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import pg from 'pg';
import {buildApp} from '../../apps/api/app.ts';
import {hash,type SourcePrice,type SourceRecord} from '../../packages/domain/event.ts';
import {canonicalCatalog} from '../../packages/persistence/canonical-catalog.ts';
import {savedService} from '../../packages/persistence/saved.ts';
import type {Config} from '../../packages/platform/config.ts';
import {sign} from '../fixtures.ts';

const databaseUrl=process.env.P0_SAVE_TEST_DATABASE_URL;
assert.ok(databaseUrl&&new URL(databaseUrl).hostname==='127.0.0.1'&&/^\/povod_(?:save_fresh|t105_save_upgrade)$/.test(new URL(databaseUrl).pathname));
const cfg:Config={mode:'test',databaseUrl,redisUrl:'redis://127.0.0.1:6379',publicOrigin:'http://127.0.0.1:3000',
 sessionKey:randomBytes(32).toString('hex'),escrowKey:randomBytes(32).toString('hex'),botToken:'SYNTHETIC_SAVE_BOT_TOKEN',webhookSecret:randomBytes(32).toString('hex'),
 credentialScope:'SYNTHETIC_SAVE',cookieProfile:'LAX_FIRST_PARTY',ingressMode:'WEBHOOK',liveGate:''};
const {app,pool}=await buildApp(cfg);
const catalog=canonicalCatalog(pool),sourceId='synthetic:save:'+randomUUID();
const price:SourcePrice={kind:'UNKNOWN',currency:null,basis:'UNKNOWN',evidenceScope:'UNKNOWN',scopeAppliesToOccurrence:null,
 quoteMinMinor:null,quoteMaxMinor:null,feeMode:'UNKNOWN',explicitFree:null,mandatoryExtras:[],conditions:[],rawPriceText:null,
 evidencePaths:[],feeEvidencePaths:[],freeEvidencePath:null,parsedConfidence:'UNKNOWN'};
const starts=['2027-04-10T18:00:00+03:00','2027-06-10T18:00:00+03:00','2027-07-10T18:00:00+03:00'];
let ids:string[]=[];
before(async()=>{
 await app.ready();await catalog.registerSyntheticSource(sourceId,'SyntheticSave','synthetic/1');
 const record:SourceRecord={sourceId,providerId:'SyntheticSave',dataMode:'SYNTHETIC',providerEventId:'event-1',requestId:'save-fixture',recordOrdinal:0,
  fetchedAt:'2026-09-24T10:00:00.000Z',sourceUrl:null,responseSha256:hash('synthetic save'),apiVersion:'synthetic/1',transformVersion:'t105/1',rightsRevision:'synthetic/1',
  title:'SYNTHETIC Save event',categories:[],categoriesComplete:false,categoryMappingVerified:false,price,
  sessions:starts.map((start,i)=>({path:`dates[${i}]`,precision:'EXACT',startsAt:start,endsAt:null,timeZone:'Europe/Moscow',nativeSessionId:`session-${i}`,nativeIdVerified:true,
   place:{kind:'UNKNOWN',format:'UNKNOWN',providerVenueId:null,venueName:null,address:null,coordinates:null,coordinateMeaning:'UNKNOWN',evidencePaths:[]},
   price:i===2?{...price,kind:'KNOWN',currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,
    quoteMinMinor:'50000',quoteMaxMinor:'50000',conditions:['SYNTHETIC condition'],rawPriceText:'500 RUB under condition',evidencePaths:['price']}:null,
   timePaths:[`dates[${i}].start`],unsupportedReason:null})),lifecycle:'UNKNOWN'};
 const run=await catalog.beginRun(sourceId,hash('save scope'));
 const page=await catalog.dispatchPage(run.runId,run.epoch,1);
 const accepted=await catalog.commitPage(page.pageId,run.epoch,[record],{allowedHosts:[],allowLive:false},true);
 assert.equal(accepted.accepted,3);await catalog.finishRun(run.runId,run.epoch);
 ids=(await pool.query<{id:string}>('SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 ORDER BY o.starts_at',[sourceId])).rows.map(row=>row.id);
});
after(async()=>{await app.close();});
const cookie=(r:{headers:Record<string,unknown>},name:string)=>{
 const values=Array.isArray(r.headers['set-cookie'])?r.headers['set-cookie']:[r.headers['set-cookie']];
 const value=values.find(x=>typeof x==='string'&&x.startsWith(name+'='));assert.ok(typeof value==='string');return value.split(';')[0]!.slice(name.length+1);
};
async function launch(id:string){
 const b=await app.inject({url:'/api/v1/session/bootstrap'});assert.equal(b.statusCode,200);
 const raw=sign(cfg.botToken,`{"id":${id},"first_name":"SYNTHETIC_SAVE"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()});
 const x=await app.inject({method:'POST',url:'/api/v1/session/max',headers:{origin:cfg.publicOrigin,'content-type':'application/json','x-bootstrap-csrf':b.json().csrfToken,cookie:'__Host-max_bootstrap='+cookie(b,'__Host-max_bootstrap')},payload:{initData:raw,exchangeKey:randomUUID()}});
 assert.equal(x.statusCode,200,x.body);
 return {token:cookie(x,'__Host-max_session'),csrf:x.json().csrfToken,actor:x.json().actor.id};
}
const actorId=()=>String(900000000000000000n+BigInt('0x'+randomBytes(5).toString('hex')));
const read=(x:Awaited<ReturnType<typeof launch>>)=>({cookie:'__Host-max_session='+x.token});
const write=(x:Awaited<ReturnType<typeof launch>>)=>({...read(x),origin:cfg.publicOrigin,'content-type':'application/json','x-csrf-token':x.csrf});
const put=(x:Awaited<ReturnType<typeof launch>>,id:string)=>app.inject({method:'PUT',url:'/api/v1/me/saved/'+id,headers:write(x),payload:{}});
const remove=(x:Awaited<ReturnType<typeof launch>>,id:string)=>app.inject({method:'DELETE',url:'/api/v1/me/saved/'+id,headers:write(x),payload:{}});
const list=(x:Awaited<ReturnType<typeof launch>>)=>app.inject({url:'/api/v1/me/saved',headers:read(x)});

test('Save: idempotent PUT, concurrent duplicates, deterministic list and canonical UNKNOWN facts',async()=>{
 const a=await launch(actorId());
 assert.equal((await list(a)).json().items.length,0);
 assert.equal((await put(a,ids[1]!)).statusCode,200);
 const concurrent=await Promise.all(Array.from({length:8},()=>put(a,ids[0]!)));
 assert.ok(concurrent.every(r=>r.statusCode===200));
 assert.equal((await put(a,ids[0]!)).statusCode,200);
 const rows=await pool.query('SELECT 1 FROM saved_occurrences WHERE actor_id=$1',[a.actor]);assert.equal(rows.rowCount,2);
 const items=(await list(a)).json().items;
 assert.deepEqual(items.map((x:{occurrence:{id:string}})=>x.occurrence.id),ids.slice(0,2));
 assert.equal(items[0].occurrence.price.kind,'UNKNOWN');assert.equal(items[0].occurrence.price.label,'Цена не указана');
 assert.equal(items[0].occurrence.venue.state,'UNKNOWN');assert.equal(items[0].occurrence.endsAt,null);assert.equal(items[0].occurrence.source.url,null);
 assert.ok(items[0].occurrence.warnings.includes('SOURCE_UNAVAILABLE'));
 const resolved=await app.inject({url:'/api/v1/me/saved/resolve?'+new URLSearchParams({sourceId,externalEventId:'event-1',occurrenceRef:'session-0'}),headers:read(a)});
 assert.equal(resolved.json().occurrenceId,ids[0]);assert.equal(resolved.json().saved,true);
 const again=await launch((await pool.query<{external_id:string}>('SELECT external_id FROM actors WHERE id=$1',[a.actor])).rows[0]!.external_id);
 assert.equal(again.actor,a.actor);assert.equal((await list(again)).json().items.length,2);
 const freshPool=new pg.Pool({connectionString:databaseUrl});
 try{assert.equal((await savedService(freshPool).list(a.actor)).items.length,2);}finally{await freshPool.end();}
});
test('Save: DELETE converges, actor ownership, validation, session and Origin guards',async()=>{
 const a=await launch(actorId()),b=await launch(actorId());
 assert.equal((await put(a,ids[0]!)).statusCode,200);
 assert.equal((await list(b)).json().items.length,0);
 assert.equal((await remove(b,ids[0]!)).statusCode,200);
 assert.equal((await list(a)).json().items.length,1);
 assert.equal((await remove(a,ids[0]!)).statusCode,200);
 assert.equal((await remove(a,ids[0]!)).statusCode,200);
 assert.equal((await list(a)).json().items.length,0);
 assert.equal((await put(a,randomUUID())).statusCode,404);
 assert.equal((await put(a,'bad-id')).statusCode,400);
 assert.equal((await app.inject({url:'/api/v1/me/saved'})).statusCode,401);
 assert.equal((await app.inject({method:'PUT',url:'/api/v1/me/saved/'+ids[0],headers:{...write(a),origin:'https://foreign.invalid'},payload:{}})).statusCode,403);
 assert.equal((await app.inject({method:'PUT',url:'/api/v1/me/saved/'+ids[0],headers:{...write(a),'x-csrf-token':'wrong'},payload:{}})).statusCode,403);
 assert.equal((await app.inject({method:'PUT',url:'/api/v1/me/saved/'+ids[0],headers:write(a),payload:{actorId:b.actor}})).statusCode,400);
});
test('Save: conditional price stays conditional through persistence and API',async()=>{
 const a=await launch(actorId());assert.equal((await put(a,ids[2]!)).statusCode,200);
 const item=(await list(a)).json().items[0].occurrence;
 assert.equal(item.price.kind,'CONDITIONAL');assert.match(item.price.label,/Условия/);
 assert.equal(item.price.totalMaxMinor,null);assert.equal(item.endsAt,null);
});
