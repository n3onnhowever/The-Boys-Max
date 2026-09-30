import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePage} from '../../packages/domain/event-normalizer.ts';
import {DEMO_ITEMS,DEMO_NOTICE,DEMO_SOURCE_ID,demoCandidate,demoRecord} from '../../packages/demo/catalog-v3.ts';
import {currentDemoEventIds,knownDemoEventIds,demoByEventId} from '../../packages/demo/catalog-versions.ts';
import {config} from '../../packages/platform/config.ts';
import {listedForDiscovery} from '../../packages/persistence/catalog.ts';
import {evaluateEligibility} from '../../modules/search/core/eligibility.ts';
import {context,defaultIntent} from '../../modules/integration/projections.ts';

test('demo catalog requires explicit server mode and version',()=>{
 const env={APP_MODE:'demo',DEMO_CATALOG_VERSION:'v3',COOKIE_PROFILE:'LAX_FIRST_PARTY',PUBLIC_ORIGIN:'http://127.0.0.1:3000',SESSION_KEY:'a'.repeat(64),ESCROW_KEY:'b'.repeat(64),BOT_TOKEN:'DEMO_TEST_BOT',MAX_WEBHOOK_SECRET:'c'.repeat(64),CREDENTIAL_SCOPE:'DEMO_TEST',DATABASE_URL:'postgres://demo@127.0.0.1/demo',REDIS_URL:'redis://127.0.0.1:6379'} as NodeJS.ProcessEnv;
 assert.equal(config(env).mode,'demo');
 assert.throws(()=>config({...env,DEMO_CATALOG_VERSION:''}),/DEMO_CATALOG_CONFIG_INVALID/);
 assert.throws(()=>config({...env,APP_MODE:'test'}),/DEMO_CATALOG_CONFIG_INVALID/);
});

test('cancelled and unavailable candidates are excluded from normal discovery',()=>{
 const candidate=demoCandidate(DEMO_ITEMS[0]!,0),semantic=context('2026-09-30T00:30:00.000Z');
 const cancelled=evaluateEligibility(defaultIntent(),{...candidate,status:'CANCELLED'},semantic);
 const unavailable=evaluateEligibility(defaultIntent(),{...candidate,listing_state:'MISSING_FROM_FEED'},semantic);
 assert.equal(listedForDiscovery(cancelled,false),false);
 assert.equal(listedForDiscovery(unavailable,false),false);
 assert.equal(listedForDiscovery(evaluateEligibility(defaultIntent(),candidate,semantic),false),true);
});

test('demo v3 has 48 synthetic exact sessions with eight categories and price evidence',()=>{
 assert.equal(DEMO_ITEMS.length,48);
 const ids=new Set<string>();
 const rows=DEMO_ITEMS.map((item,index)=>{
  assert.ok(!ids.has(item.id));ids.add(item.id);
  const c=demoCandidate(item,index);
  assert.equal(c.city_id,'msk');assert.equal(c.provenance.data_mode,'SYNTHETIC');assert.equal(c.ref.provider_id,'ManualProvider');
  assert.equal(c.provenance.source_url,null);assert.equal(c.venue.coordinates,null);assert.equal(c.inventory.remaining,null);
  assert.match(c.venue.address??'',/вымышленное место/);
  assert.ok(c.warnings.some(w=>w.message===DEMO_NOTICE));
  assert.ok(demoByEventId(c.ref.event_id));
  return demoRecord(item,index,'https://demo.example.test');
 });
 const normalized=normalizePage(rows,{allowedHosts:['demo.example.test'],allowLive:false});
 assert.equal(normalized.length,48);
 assert.ok(normalized.every(row=>row.event?.sourceId===DEMO_SOURCE_ID&&row.occurrences.length===1));
 assert.deepEqual([...new Set(DEMO_ITEMS.map(item=>item.category))].sort(),['CINEMA','CONCERT','MUSEUM','OTHER','OUTDOOR','SPORT','THEATRE','VOLUNTEER']);
 assert.ok([...new Set(normalized.map(row=>row.occurrences[0]!.price.kind))].includes('CONDITIONAL'));
 assert.ok(DEMO_ITEMS.some(item=>item.price==='UNKNOWN'&&demoCandidate(item,DEMO_ITEMS.indexOf(item)).price.total_price.knownness==='UNKNOWN'));
 assert.ok(DEMO_ITEMS.some(item=>item.price==='FREE'&&demoCandidate(item,DEMO_ITEMS.indexOf(item)).price.fees_known));
 assert.equal(normalized[0]!.occurrences[0]!.place.coordinates,null);
 assert.ok(knownDemoEventIds.length>DEMO_ITEMS.length);
 assert.equal(currentDemoEventIds.length,DEMO_ITEMS.length);
 assert.ok(currentDemoEventIds.every(id=>id.startsWith('demo-v3-')));
});
