import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePage} from '../../packages/domain/event-normalizer.ts';
import {DEMO_ITEMS,DEMO_NOTICE,DEMO_SOURCE_ID,demoCandidate,demoRecord} from '../../packages/demo/catalog-v1.ts';
import {config} from '../../packages/platform/config.ts';

test('demo catalog requires explicit server mode and version',()=>{
 const env={APP_MODE:'demo',DEMO_CATALOG_VERSION:'v1',COOKIE_PROFILE:'LAX_FIRST_PARTY',PUBLIC_ORIGIN:'http://127.0.0.1:3000',SESSION_KEY:'a'.repeat(64),ESCROW_KEY:'b'.repeat(64),BOT_TOKEN:'DEMO_TEST_BOT',MAX_WEBHOOK_SECRET:'c'.repeat(64),CREDENTIAL_SCOPE:'DEMO_TEST',DATABASE_URL:'postgres://demo:demo@127.0.0.1/demo',REDIS_URL:'redis://127.0.0.1:6379'} as NodeJS.ProcessEnv;
 assert.equal(config(env).mode,'demo');
 assert.throws(()=>config({...env,DEMO_CATALOG_VERSION:''}),/DEMO_CATALOG_CONFIG_INVALID/);
 assert.throws(()=>config({...env,APP_MODE:'test'}),/DEMO_CATALOG_CONFIG_INVALID/);
});

test('demo v1 is bounded, fictional, Moscow, and canonical with explicit uncertainty',()=>{
 assert.equal(DEMO_ITEMS.length,6);
 const ids=new Set<string>();
 const rows=DEMO_ITEMS.map((item,index)=>{
  assert.match(item.title,/Вымышленн/);
  assert.ok(!ids.has(item.id));ids.add(item.id);
  const c=demoCandidate(item,index);
  assert.equal(c.city_id,'msk');assert.equal(c.provenance.data_mode,'SYNTHETIC');assert.equal(c.ref.provider_id,'ManualProvider');
  assert.equal(c.provenance.source_url,null);assert.equal(c.venue.coordinates,null);assert.equal(c.inventory.remaining,null);
  assert.ok(c.warnings.some(w=>w.message===DEMO_NOTICE));
  return demoRecord(item,index,'https://demo.example.test');
 });
 const normalized=normalizePage(rows,{allowedHosts:['demo.example.test'],allowLive:false});
 assert.equal(normalized.length,6);
 assert.ok(normalized.every(row=>row.event?.sourceId===DEMO_SOURCE_ID&&row.occurrences.length===1));
 assert.equal(normalized[0]!.occurrences[0]!.price.kind,'UNKNOWN');
 assert.equal(normalized[1]!.occurrences[0]!.price.kind,'CONDITIONAL');
 assert.equal(normalized[1]!.occurrences[0]!.price.totalMaxMinor,null);
 assert.equal(normalized[0]!.occurrences[0]!.place.coordinates,null);
});
