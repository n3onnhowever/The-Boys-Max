import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {assertOfflinePortfolio,portfolioFixtures,syntheticPortfolioLaunch} from '../../packages/demo/portfolio.ts';
import {DEMO_ITEMS} from '../../packages/demo/catalog-v3.ts';
import {normalizePage} from '../../packages/domain/event-normalizer.ts';
import {verifyInitData} from '../../packages/platform/auth.ts';
import type {Config} from '../../packages/platform/config.ts';

const c:Config={mode:'test',databaseUrl:'postgres://local@127.0.0.1/max23_test',redisUrl:'redis://127.0.0.1:6379',publicOrigin:'http://127.0.0.1:3210',sessionKey:'SYNTHETIC',escrowKey:'SYNTHETIC',botToken:'SYNTHETIC',webhookSecret:'SYNTHETIC',credentialScope:'SYNTHETIC',cookieProfile:'LAX_FIRST_PARTY',ingressMode:'WEBHOOK',liveGate:''};
const env={POVOD_OFFLINE_DEMO:'1'};
test('offline portfolio activation fails closed outside explicit local test configuration',()=>{
 assert.doesNotThrow(()=>assertOfflinePortfolio(c,env));
 for(const patch of [{mode:'live' as const},{mode:'demo' as const},{publicOrigin:'http://0.0.0.0:3210'},{publicOrigin:'https://example.com'},{databaseUrl:'postgres://local@db.example.com/max23_test'},{databaseUrl:'postgres://local@127.0.0.1/production'},{redisUrl:'redis://cache.example.com'},{aiExternalEnabled:true}])assert.throws(()=>assertOfflinePortfolio({...c,...patch},env),/OFFLINE_PORTFOLIO_LOCAL_TEST_ONLY/);
 for(const patch of [{POVOD_OFFLINE_DEMO:''},{NODE_ENV:'production'},{POVOD_OWNER_PREVIEW:'1'},{RUNTIME_FILE:'private.json'}])assert.throws(()=>assertOfflinePortfolio(c,{...env,...patch}),/OFFLINE_PORTFOLIO_LOCAL_TEST_ONLY/);
});
test('portfolio reuses 48 synthetic fixtures with consistent future canonical/search dates',()=>{
 const before=JSON.stringify(DEMO_ITEMS),now=new Date('2035-05-10T22:00:00.000Z'),rows=portfolioFixtures(c.publicOrigin,now);
 assert.equal(rows.length,48);assert.equal(JSON.stringify(DEMO_ITEMS),before);
 const normalized=normalizePage(rows.map(x=>x.record),{allowedHosts:['127.0.0.1'],allowLive:false});
 for(const [index,row] of rows.entries()){
  assert.equal(normalized[index]!.outcome,'ACCEPT');
  assert.equal(row.record.dataMode,'SYNTHETIC');assert.equal(row.candidate.provenance.data_mode,'SYNTHETIC');
  assert.equal(row.record.providerEventId,row.candidate.ref.event_id);
  assert.equal(new Date(row.record.sessions[0]!.startsAt!).toISOString(),row.candidate.starts_at);
  assert.ok(Date.parse(row.candidate.starts_at!)>now.getTime());assert.equal(row.candidate.ends_at,null);
  assert.equal(row.record.sourceId,'synthetic:povod-demo:portfolio-v1');
 }
});
test('synthetic launch uses real HMAC verification, signature and expiry checks',()=>{
 const token=randomBytes(32).toString('hex'),proof=syntheticPortfolioLaunch(token),now=Math.floor(Date.now()/1000);
 assert.doesNotThrow(()=>verifyInitData(proof,token,now));
 assert.throws(()=>verifyInitData(proof,randomBytes(32).toString('hex'),now));
 assert.throws(()=>verifyInitData(proof,token,now+86400));
});
