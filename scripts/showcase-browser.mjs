import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {buildApp} from '../apps/api/app.ts';
import {envelopeFor} from '../apps/miniapp/src/core/commands.ts';
import {blankDraft} from '../modules/integration/projections.ts';
import {sign} from '../tests/fixtures.ts';
import {launchPovodBrowser} from './lib/povod-browser.mjs';

const databaseUrl=process.env.SHOWCASE_TEST_DATABASE_URL;
if(!databaseUrl||new URL(databaseUrl).hostname!=='127.0.0.1'||new URL(databaseUrl).pathname!=='/povod_full_catalog_verify')throw Error('ISOLATED_SHOWCASE_DB_REQUIRED');
const origin='http://127.0.0.1:3017',output='artifacts/catalog-showcase/screenshots';
const cfg={mode:'hybrid',demoCatalogVersion:'v3',databaseUrl,redisUrl:'redis://127.0.0.1:56390',publicOrigin:origin,
 sessionKey:randomBytes(32).toString('hex'),escrowKey:randomBytes(32).toString('hex'),botToken:randomBytes(24).toString('hex'),webhookSecret:randomBytes(32).toString('hex'),
 credentialScope:'SHOWCASE_BROWSER',cookieProfile:'LAX_FIRST_PARTY',ingressMode:'WEBHOOK',liveGate:'REVIEWED_MAX26_LIVE',
 externalOrigins:['https://www.darwinmuseum.ru','https://www.tretyakovgallery.ru','https://kudago.com']};
const {app,sessions}=await buildApp(cfg);
const scope={kind:'PERSONAL'};
let browser=null;
try{
 const boot=await sessions.bootstrap(),external=BigInt('0x'+randomBytes(7).toString('hex')).toString();
 const exchange=await sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${external},"first_name":"SHOWCASE_BROWSER"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()}),randomUUID(),undefined);
 const headers={cookie:`__Host-max_session=${exchange.token}`,origin,'content-type':'application/json','x-csrf-token':exchange.body.csrfToken};
 await app.listen({host:'127.0.0.1',port:3017});await mkdir(output,{recursive:true});
 browser=await launchPovodBrowser();
 await browser.send('Storage.setCookies',{cookies:[{name:'__Host-max_session',value:exchange.token,url:origin,secure:true,httpOnly:true,sameSite:'Lax'}]});
 const page=await browser.open(origin+'/',390);
 await browser.until(page,'Boolean(document.querySelector(".bottom-nav button:nth-child(2):not(:disabled)"))');
 await browser.capture(page,`${output}/home.png`);
 for(const category of ['cinema','theatre','concert','museum','sport','outdoor-v2','other-v2']){
  const response=await app.inject({url:`/assets/events/category-${category}.png`});assert.equal(response.statusCode,200,category);
 }
 const current=async()=>{const r=await app.inject({url:'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify({kind:'CATALOG',scope})),headers});assert.equal(r.statusCode,200,r.body);return r.json();};
 async function state(name,patch){
  const view=await current();
  const draft={...blankDraft(),city:'Москва',timeZone:'Europe/Moscow',...patch};
  const response=await app.inject({method:'POST',url:'/api/ui/v1/commands',headers,payload:envelopeFor(view,{type:'SEARCH',scope,draft},randomUUID())});assert.equal(response.statusCode,200,response.body);
  const events=response.json().view.events;assert.ok(events.length>0,`${name}: no events`);
  await browser.send('Page.reload',{},page.sessionId);
  await browser.until(page,'Boolean(document.querySelector(".bottom-nav button:nth-child(2):not(:disabled)"))');
  await browser.evaluate(page,'document.querySelector(".bottom-nav button:nth-child(2)").click()');
  await browser.until(page,'Boolean(document.querySelector(".search-screen.runtime-search .event-list-card"))');
  await browser.evaluate(page,'document.querySelector(".search-screen .event-list-card")?.scrollIntoView({block:"center"})');
  await browser.until(page,'(()=>{const x=document.querySelector(".search-screen .event-list-artwork");return !!x&&x.complete&&x.naturalWidth>0})()');
  await browser.evaluate(page,'window.scrollTo(0,0)');
  await new Promise(resolve=>setTimeout(resolve,250));
  await browser.capture(page,`${output}/${name}.png`);
  return events;
 }
 const all=await state('all-events',{});assert.equal(all.length,200);
 await state('cinema',{includedCategories:['CINEMA']});
 await state('concerts',{includedCategories:['CONCERT']});
 await state('sport',{includedCategories:['SPORT']});
 await state('theatre',{includedCategories:['THEATRE']});
 await state('museum',{includedCategories:['MUSEUM']});
 await state('outdoor',{includedCategories:['OUTDOOR']});
 await state('volunteer',{includedCategories:['VOLUNTEER']});
 await state('other',{includedCategories:['OTHER']});
 await state('free',{budgetText:'0',priceBasis:'PER_PERSON',freeOnly:true});
 await state('budget-1000',{budgetText:'1000',priceBasis:'PER_PERSON'});
 await state('evening',{date:'2026-10-01',dateThrough:'2026-10-28',startLocal:'18:00',endLocal:'22:00'});
 await browser.evaluate(page,'document.querySelector(".search-screen .event-list-open").click()');
 await browser.until(page,'Boolean(document.querySelector(".detail-screen"))');
 await browser.capture(page,`${output}/event-detail.png`);
 await browser.until(page,'Boolean(document.querySelector(".detail-screen .v2-detail-header-actions button[aria-label=Сохранить]:not(:disabled)"))');
 await browser.evaluate(page,'document.querySelector(".detail-screen .v2-detail-header-actions button[aria-label=Сохранить]").click()');
 await browser.until(page,'Boolean(document.querySelector(".detail-screen .v2-detail-header-actions button[aria-pressed=true]"))');
 await browser.send('Page.navigate',{url:origin+'/?ui=saved'},page.sessionId);
 await browser.until(page,'Boolean(document.querySelector(".saved-screen .event-list-card"))');
 await browser.capture(page,`${output}/saved.png`);
 assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
 console.log(JSON.stringify({status:'PASS',all:all.length,screenshots:15,artworkHttp200:7,consoleErrors:0}));
 await browser.closePage(page);
}finally{if(browser)await browser.close();await app.close();}
