import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {buildApp} from '../apps/api/app.ts';
import {sign} from '../tests/fixtures.ts';
import {launchPovodBrowser} from './lib/povod-browser.mjs';
import {syntheticCandidate} from '../tests/catalog-fixtures.ts';
import {canonicalCatalog} from '../packages/persistence/canonical-catalog.ts';
import {hash} from '../packages/domain/event.ts';

const databaseUrl=process.env.P0_SAVE_TEST_DATABASE_URL;
if(!databaseUrl||new URL(databaseUrl).hostname!=='127.0.0.1'||new URL(databaseUrl).pathname!=='/povod_save_browser')throw Error('ISOLATED_SAVE_DB_REQUIRED');
const origin='http://127.0.0.1:43001';
const cfg={mode:'test',databaseUrl,redisUrl:'redis://127.0.0.1:6379',publicOrigin:origin,
 sessionKey:randomBytes(32).toString('hex'),escrowKey:randomBytes(32).toString('hex'),botToken:'SYNTHETIC_SAVE_BOT_TOKEN',webhookSecret:randomBytes(32).toString('hex'),
 credentialScope:'SYNTHETIC_SAVE',cookieProfile:'LAX_FIRST_PARTY',ingressMode:'WEBHOOK',liveGate:''};
const {app,pool}=await buildApp(cfg);
let browser=null;
const cookie=(r,name)=>{
 const values=Array.isArray(r.headers['set-cookie'])?r.headers['set-cookie']:[r.headers['set-cookie']];
 const value=values.find(x=>typeof x==='string'&&x.startsWith(name+'='));assert.ok(value);return value.split(';')[0].slice(name.length+1);
};
try{
 const catalog=canonicalCatalog(pool),sourceId='synthetic:browser:'+randomUUID(),eventId='event-'+randomUUID(),start=new Date(Date.now()+4*86400000).toISOString();
 await catalog.registerSyntheticSource(sourceId,'ManualProvider','synthetic/1');
 const unknownPrice={kind:'UNKNOWN',currency:null,basis:'UNKNOWN',evidenceScope:'UNKNOWN',scopeAppliesToOccurrence:null,
  quoteMinMinor:null,quoteMaxMinor:null,feeMode:'UNKNOWN',explicitFree:null,mandatoryExtras:[],conditions:[],rawPriceText:null,
  evidencePaths:[],feeEvidencePaths:[],freeEvidencePath:null,parsedConfidence:'UNKNOWN'};
 const record={sourceId,providerId:'ManualProvider',dataMode:'SYNTHETIC',providerEventId:eventId,requestId:'browser-fixture',recordOrdinal:0,
  fetchedAt:new Date().toISOString(),sourceUrl:null,responseSha256:hash('browser '+sourceId),apiVersion:'synthetic/1',transformVersion:'t105/1',rightsRevision:'synthetic/1',
  title:'SYNTHETIC Save event',categories:[],categoriesComplete:false,categoryMappingVerified:false,price:unknownPrice,
  sessions:[{path:'dates[0]',precision:'EXACT',startsAt:start,endsAt:null,timeZone:'Europe/Moscow',nativeSessionId:'session-0',nativeIdVerified:true,
   place:{kind:'UNKNOWN',format:'UNKNOWN',providerVenueId:null,venueName:null,address:null,coordinates:null,coordinateMeaning:'UNKNOWN',evidencePaths:[]},
   price:null,timePaths:['dates[0].start'],unsupportedReason:null}],lifecycle:'UNKNOWN'};
 const run=await catalog.beginRun(sourceId,hash('browser scope'));
 const catalogPage=await catalog.dispatchPage(run.runId,run.epoch,1);
 assert.equal((await catalog.commitPage(catalogPage.pageId,run.epoch,[record],{allowedHosts:[],allowLive:false},true)).accepted,1);
 await catalog.finishRun(run.runId,run.epoch);
 const occurrence=(await pool.query('SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1',[sourceId])).rows[0];
 assert.ok(occurrence);
 const candidate=structuredClone(syntheticCandidate(new Date().toISOString(),randomUUID()));
 const title='SYNTHETIC Save '+sourceId.slice(-8);
 candidate.ref.provider_id='ManualProvider';candidate.ref.event_id=eventId;candidate.ref.occurrence_id='session-0';
 candidate.untrusted_title=title;candidate.starts_at=start;candidate.ends_at=null;
 await pool.query("INSERT INTO catalog_occurrences(observation_id,provider_id,event_id,occurrence_id,body,data_mode) VALUES($1,$2,$3,$4,$5,'SYNTHETIC')",
  [candidate.provenance.observation_id,candidate.ref.provider_id,candidate.ref.event_id,candidate.ref.occurrence_id,candidate]);
 const boot=await app.inject({url:'/api/v1/session/bootstrap'});
 const actorId=String(900000000000000000n+BigInt('0x'+randomBytes(5).toString('hex')));
 const raw=sign(cfg.botToken,`{"id":${actorId},"first_name":"SYNTHETIC_BROWSER"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()});
 const exchange=await app.inject({method:'POST',url:'/api/v1/session/max',headers:{origin,'content-type':'application/json','x-bootstrap-csrf':boot.json().csrfToken,cookie:'__Host-max_bootstrap='+cookie(boot,'__Host-max_bootstrap')},payload:{initData:raw,exchangeKey:randomUUID()}});
 assert.equal(exchange.statusCode,200,exchange.body);
 const token=cookie(exchange,'__Host-max_session');
 await app.listen({host:'127.0.0.1',port:43001});
 browser=await launchPovodBrowser();
 await browser.send('Storage.setCookies',{cookies:[{name:'__Host-max_session',value:token,url:origin,secure:true,httpOnly:true,sameSite:'Lax'}]});
 const page=await browser.open(origin+'/');
 const click=async selector=>assert.equal(await browser.evaluate(page,'(()=>{const el=document.querySelector('+JSON.stringify(selector)+');if(!el||el.disabled)return false;el.click();return true})()'),true,selector);
 await browser.until(page,'[...document.querySelectorAll(".event-card-compact")].some(x=>x.textContent.includes('+JSON.stringify(title)+'))');
 assert.equal(await browser.evaluate(page,'(()=>{const card=[...document.querySelectorAll(".event-card-compact")].find(x=>x.textContent.includes('+JSON.stringify(title)+'));const button=card?.querySelector("button:not(.save-action)");if(!button||button.disabled)return false;button.click();return true})()'),true);
 await browser.until(page,"Boolean(document.querySelector('.detail-screen .detail-secondary-actions button:first-child:not(:disabled)'))");
 const saveButton='.detail-screen .detail-secondary-actions button:first-child';
 assert.equal(await browser.evaluate(page,'document.querySelector('+JSON.stringify(saveButton)+').getAttribute("aria-pressed")'),'false');
 await click(saveButton);
 await browser.until(page,'document.querySelector('+JSON.stringify(saveButton)+').getAttribute("aria-pressed")==="true"');
 await browser.until(page,"Boolean(document.querySelector('.bottom-nav button:nth-child(5):not(:disabled)'))");
 await click('.bottom-nav button:nth-child(5)');
 await browser.until(page,"document.querySelectorAll('.saved-screen .event-list-card').length===1");
 assert.match(await browser.evaluate(page,"document.querySelector('.saved-screen .event-list-card').innerText"),/Цена не указана/);
 assert.match(await browser.evaluate(page,"document.querySelector('.saved-screen .event-list-card').innerText"),/Место уточняется/);
 assert.equal(await browser.evaluate(page,"document.querySelector('.saved-screen').getAttribute('data-provenance')"),null);
 await click('.saved-screen .event-list-open');
 await browser.until(page,"Boolean(document.querySelector('.detail-screen .detail-secondary-actions button'))");
 assert.equal(await browser.evaluate(page,'document.querySelector('+JSON.stringify(saveButton)+').getAttribute("aria-pressed")'),'true');
 await click(saveButton);
 await browser.until(page,'document.querySelector('+JSON.stringify(saveButton)+').getAttribute("aria-pressed")==="false"');
 await click(saveButton);
 await browser.until(page,'document.querySelector('+JSON.stringify(saveButton)+').getAttribute("aria-pressed")==="true"');
 await browser.send('Page.reload',{},page.sessionId);
 await browser.until(page,"Boolean(document.querySelector('.bottom-nav button:nth-child(5):not(:disabled)'))");
 await click('.bottom-nav button:nth-child(5)');
 await browser.until(page,"document.querySelectorAll('.saved-screen .event-list-card').length===1");
 await click('.saved-screen .event-list-open');
 await browser.until(page,"Boolean(document.querySelector('.detail-screen .detail-secondary-actions button:first-child'))");
 await browser.send('Fetch.enable',{patterns:[{urlPattern:origin+'/api/v1/me/saved/'+occurrence.id}]},page.sessionId);
 await click(saveButton);
 await browser.until(page,"Boolean(document.querySelector('.detail-screen [role=alert]'))");
 assert.equal(await browser.evaluate(page,'document.querySelector('+JSON.stringify(saveButton)+').getAttribute("aria-pressed")'),'true');
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM saved_occurrences WHERE actor_id=$1',[exchange.json().actor.id])).rows[0].n,1);
 assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
 console.log('PASS runtime authenticated Event Detail Save → canonical Saved → unsave/resave → reload → rejected mutation stays saved');
 await browser.closePage(page);
}finally{if(browser)await browser.close();await app.close();}
