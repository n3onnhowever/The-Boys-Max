import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {buildApp} from '../apps/api/app.ts';
import {envelopeFor} from '../apps/miniapp/src/core/commands.ts';
import {blankDraft,wallTime} from '../modules/integration/projections.ts';
import {sign} from '../tests/fixtures.ts';
import {launchPovodBrowser} from './lib/povod-browser.mjs';
import {categoryArtwork} from '../apps/miniapp/src/view-model/category-artwork.ts';

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
 await browser.until(page,'(()=>{const x=document.querySelector(".hero-event-card img");return !!x&&x.complete&&x.naturalWidth>0})()');
 await browser.capture(page,`${output}/home.png`);
 for(const category of ['cinema','theatre','concert','museum','sport','outdoor-v2','other-v2']){
  const response=await app.inject({url:`/assets/events/category-${category}.png`});assert.equal(response.statusCode,200,category);
 }
 const current=async()=>{const r=await app.inject({url:'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify({kind:'CATALOG',scope})),headers});assert.equal(r.statusCode,200,r.body);return r.json();};
 await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.__firstArtworkSrc=[];
  new MutationObserver(()=>{const src=document.querySelector('.search-screen .event-list-artwork')?.getAttribute('src');
   if(src&&window.__firstArtworkSrc.at(-1)!==src)window.__firstArtworkSrc.push(src);
  }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 `},page.sessionId);
 const search=async(name,patch)=>{
  const view=await current();
  const draft={...blankDraft(),city:'Москва',timeZone:'Europe/Moscow',...patch};
  const response=await app.inject({method:'POST',url:'/api/ui/v1/commands',headers,payload:envelopeFor(view,{type:'SEARCH',scope,draft},randomUUID())});
  assert.equal(response.statusCode,200,response.body);
  const events=response.json().view.events;assert.ok(events.length>0,`${name}: no events`);
  console.log(JSON.stringify({filter:name,count:events.length}));
  return events;
 };
 async function state(name,patch){
  const events=await search(name,patch);
  await browser.send('Page.navigate',{url:origin+'/'},page.sessionId);
  await browser.until(page,'Boolean(document.querySelector(".bottom-nav button:nth-child(2):not(:disabled)"))');
  await browser.evaluate(page,'document.querySelector(".bottom-nav button:nth-child(2)").click()');
  await browser.until(page,'Boolean(document.querySelector(".search-screen.runtime-search .event-list-card"))');
  await browser.evaluate(page,'document.querySelector(".search-screen .event-list-card")?.scrollIntoView({block:"center"})');
  await browser.until(page,'(()=>{const x=document.querySelector(".search-screen .event-list-artwork");return !!x&&x.complete&&x.naturalWidth>0})()');
  const expectedArt=categoryArtwork(events[0].artworkCategory).url;
  assert.equal(await browser.evaluate(page,'document.querySelector(".search-screen .event-list-artwork").getAttribute("src")'),expectedArt,`${name}: artwork key`);
  assert.deepEqual(await browser.evaluate(page,'window.__firstArtworkSrc'),[expectedArt],`${name}: artwork switched after hydration`);
  assert.equal(await browser.evaluate(page,'[...document.images].filter(x=>x.getBoundingClientRect().top<innerHeight&&x.getBoundingClientRect().bottom>0&&(!x.complete||!x.naturalWidth)).length'),0,`${name}: broken visible image`);
  assert.equal(await browser.evaluate(page,'document.body.textContent.includes("owner-preview")'),false,`${name}: owner marker`);
  await browser.evaluate(page,'window.scrollTo(0,0)');
  await new Promise(resolve=>setTimeout(resolve,250));
  assert.deepEqual(await browser.evaluate(page,'window.__firstArtworkSrc'),[expectedArt],`${name}: artwork switched after settling`);
  await browser.capture(page,`${output}/${name}.png`);
  return events;
 }
 async function detail(name,expected){
  await browser.evaluate(page,'document.querySelector(".search-screen .event-list-open").click()');
  await browser.until(page,'Boolean(document.querySelector(".detail-screen .event-detail-hero-artwork"))');
  await browser.ready(page);
  assert.equal(await browser.evaluate(page,'document.querySelector(".detail-screen .event-detail-hero-artwork").getAttribute("src")'),expected);
  assert.equal(await browser.evaluate(page,'[...document.images].filter(x=>x.getBoundingClientRect().top<innerHeight&&x.getBoundingClientRect().bottom>0&&(!x.complete||!x.naturalWidth)).length'),0);
  await browser.capture(page,`${output}/detail-${name}.png`);
 }
 const all=await state('all-events',{});assert.equal(all.length,200);
 const cinema=await state('cinema',{includedCategories:['CINEMA']});await detail('cinema',categoryArtwork(cinema[0].artworkCategory).url);
 await state('concert',{includedCategories:['CONCERT']});
 await state('sport',{includedCategories:['SPORT']});
 const theatre=await state('theatre',{includedCategories:['THEATRE']});await detail('theatre',categoryArtwork(theatre[0].artworkCategory).url);
 await state('museum',{includedCategories:['MUSEUM']});
 await state('outdoor',{includedCategories:['OUTDOOR']});
 const volunteer=await state('volunteer',{includedCategories:['VOLUNTEER']});await detail('volunteer',categoryArtwork(volunteer[0].artworkCategory).url);
 await state('other',{includedCategories:['OTHER']});
 await state('free',{budgetText:'0',priceBasis:'PER_PERSON',freeOnly:true});
 await state('budget-1000',{budgetText:'1000',priceBasis:'PER_PERSON'});
 await state('evening',{date:'2026-10-01',dateThrough:'2026-10-28',startLocal:'18:00',endLocal:'22:00'});
 const range={date:'2026-09-30',dateThrough:'2026-10-28'};
 for(const [name,patch] of [
  ['budget-500',{budgetText:'500',priceBasis:'PER_PERSON'}],
  ['budget-2000',{budgetText:'2000',priceBasis:'PER_PERSON'}],
  ['morning',{...range,startLocal:'06:00',endLocal:'12:00'}],
  ['day',{...range,startLocal:'12:00',endLocal:'18:00'}],
  ['night',{...range,startLocal:'22:00',endLocal:'23:59'}],
  ['category-budget',{includedCategories:['CINEMA'],budgetText:'500',priceBasis:'PER_PERSON'}],
  ['date-category',{date:'2026-10-03',includedCategories:['CINEMA']}],
  ['text-category',{text:'кино',includedCategories:['CINEMA']}],
 ])await search(name,patch);
 await browser.evaluate(page,'document.querySelector(".search-screen .event-list-open").click()');
 await browser.until(page,'Boolean(document.querySelector(".detail-screen"))');
 await browser.capture(page,`${output}/event-detail.png`);
 await browser.until(page,'Boolean(document.querySelector(".detail-screen .v2-detail-header-actions button[aria-label=Сохранить]:not(:disabled)"))');
 await browser.evaluate(page,'document.querySelector(".detail-screen .v2-detail-header-actions button[aria-label=Сохранить]").click()');
 await browser.until(page,'Boolean(document.querySelector(".detail-screen .v2-detail-header-actions button[aria-pressed=true]"))');
 for(const event of [cinema[0],volunteer[0]]){
  const ref=event.ref;
  const resolved=await app.inject({url:'/api/v1/me/saved/resolve?'+new URLSearchParams({sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceRef:ref.occurrenceId}),headers});
  assert.equal(resolved.statusCode,200,resolved.body);
  const saved=await app.inject({method:'PUT',url:'/api/v1/me/saved/'+resolved.json().occurrenceId,headers,payload:{}});
  assert.equal(saved.statusCode,200,saved.body);
 }
 await browser.send('Page.navigate',{url:origin+'/?ui=saved'},page.sessionId);
 await browser.until(page,'document.querySelectorAll(".saved-screen .event-list-card").length>=3');
 await browser.ready(page);
 assert.equal(await browser.evaluate(page,'[...document.images].filter(x=>x.getBoundingClientRect().top<innerHeight&&x.getBoundingClientRect().bottom>0&&(!x.complete||!x.naturalWidth)).length'),0);
 await browser.capture(page,`${output}/saved.png`);
 const eventRef=cinema[0].ref;
 const eventRoute={kind:'EVENT',scope,sourceId:eventRef.sourceId,externalEventId:eventRef.externalEventId,occurrenceId:eventRef.occurrenceId};
 const detailResponse=await app.inject({url:'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify(eventRoute)),headers});
 assert.equal(detailResponse.statusCode,200,detailResponse.body);
 const detailView=detailResponse.json();
 const deadline=(hours)=>wallTime(new Date(Date.now()+hours*3600000).toISOString(),'Europe/Moscow');
 const planResponse=await app.inject({method:'POST',url:'/api/ui/v1/commands',headers,payload:envelopeFor(detailView,{type:'ADD_TO_PLAN',eventRef:detailView.event.ref,targetPlanId:null,newPlan:{title:'SYNTHETIC visual smoke plan',participantSlots:1,organizerParticipates:true,decisionLocal:deadline(1),commitmentLocal:deadline(2),timeZone:'Europe/Moscow'},ackUnknownReasons:detailView.unknownReasons},randomUUID())});
 assert.equal(planResponse.statusCode,200,planResponse.body);
 const planId=planResponse.json().view.planId;assert.ok(planId);
 for(const [name,url,selector] of [
  ['plan-detail',origin+'/?ui=plan:'+planId,'.v2-plan-actions'],
  ['friends',origin+'/?ui=friends','main'],
  ['profile',origin+'/?ui=profile','main'],
  ['gigachat-fallback',origin+'/?ui=search&q='+encodeURIComponent('кино вечером'),'.v2-discovery[aria-label="Умный повод"]'],
 ]){
  await browser.send('Page.navigate',{url},page.sessionId);
  await browser.until(page,`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  await browser.ready(page);
  assert.equal(await browser.evaluate(page,'[...document.images].filter(x=>x.getBoundingClientRect().top<innerHeight&&x.getBoundingClientRect().bottom>0&&(!x.complete||!x.naturalWidth)).length'),0,`${name}: broken visible image`);
  await browser.capture(page,`${output}/${name}.png`);
 }
 assert.ok(browser.requests.filter(x=>/\.(png|jpe?g|webp)(?:\?|$)/i.test(x.url)).every(x=>x.url.startsWith(origin+'/assets/')),'remote image dependency');
 assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
 console.log(JSON.stringify({status:'PASS',all:all.length,screenshots:22,artworkHttp200:7,consoleErrors:0,filters:19,savedCategories:3}));
 await browser.closePage(page);
}finally{if(browser)await browser.close();await app.close();}
