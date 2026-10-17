import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {envelopeFor} from '../apps/miniapp/src/core/commands.ts';
import {wallTime} from '../modules/integration/projections.ts';
import type {CatalogView,EventView,PlanView,Receipt} from '../apps/miniapp/src/port/contracts.ts';
import {Queue} from 'bullmq';
import {Redis} from 'ioredis';

const origin=process.env.PUBLIC_ORIGIN!;
assert.equal(new URL(origin).hostname,'127.0.0.1');
const jar=new Map<string,string>();let csrf='';
async function request(path:string,method='GET',payload?:unknown,extra:Record<string,string>={}){
 const response=await fetch(origin+path,{method,headers:{origin,cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(payload===undefined?{}:{'content-type':'application/json','x-csrf-token':csrf}),...extra},...(payload===undefined?{}:{body:JSON.stringify(payload)}),signal:AbortSignal.timeout(10000)});
 for(const cookie of response.headers.getSetCookie()){const [pair]=cookie.split(';'),index=pair!.indexOf('=');jar.set(pair!.slice(0,index),pair!.slice(index+1));}
 return response;
}
async function json<T>(path:string,method='GET',payload?:unknown,extra:Record<string,string>={}):Promise<T>{const r=await request(path,method,payload,extra);assert.equal(r.status,200,`${method} ${path}: ${await r.clone().text()}`);return r.json() as Promise<T>;}
const scope={kind:'PERSONAL' as const},route=(value:unknown)=>'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify(value));
const page=await request('/'),html=await page.text();
assert.doesNotMatch(html,/st\.max\.ru/);assert.match(page.headers.get('content-security-policy')??'',/connect-src 'self'/);
const initData=JSON.parse(html.match(/<script id="povod-offline-launch" type="application\/json">(.*?)<\/script>/)![1]!) as string;
assert.equal((await request('/dev/owner-session','POST',{persona:'owner'})).status,404);
assert.equal((await request('/api/ui/v1/session')).status,401);
const boot=await json<{csrfToken:string}>('/api/v1/session/bootstrap');
const session=await json<{csrfToken:string;actor:{id:string}}>('/api/v1/session/max','POST',{initData,exchangeKey:randomUUID()},{'x-bootstrap-csrf':boot.csrfToken});csrf=session.csrfToken;
await json('/api/ui/v1/session');
let catalog=await json<CatalogView>(route({kind:'CATALOG',scope}));
assert.equal(catalog.events.length,48);assert.match(catalog.notice??'',/вымышлен/);assert.ok(catalog.events.every(x=>x.sourceLabel==='Демо-каталог'));
const searched=await json<Receipt>('/api/ui/v1/commands','POST',envelopeFor(catalog,{type:'SEARCH',scope,draft:{...catalog.query,city:'Москва',timeZone:'Europe/Moscow',includedCategories:['SPORT']}},randomUUID()));
catalog=searched.view as CatalogView;assert.equal(catalog.events.length,6);
const ref=catalog.events[0]!.ref;
const detail=await json<EventView>(route({kind:'EVENT',scope,sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceId:ref.occurrenceId}));
assert.ok(detail.event.sourceUrl?.startsWith(origin+'/demo/source/v3/'));
const explanatory=await request(new URL(detail.event.sourceUrl!).pathname);
assert.equal(explanatory.status,200);assert.match(await explanatory.text(),/события вымышлены/);
const resolved=await json<{occurrenceId:string}>('/api/v1/me/saved/resolve?'+new URLSearchParams({sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceRef:ref.occurrenceId!}));assert.ok(resolved.occurrenceId);
assert.equal((await request('/api/v1/me/saved/'+resolved.occurrenceId,'PUT',{}, {'x-csrf-token':'invalid'})).status,403);
assert.equal((await request('/api/v1/me/saved/'+resolved.occurrenceId,'PUT',{}, {origin:'https://foreign.invalid'})).status,403);
await json('/api/v1/me/saved/'+resolved.occurrenceId,'PUT',{});
const saved=await json<{items:{occurrence:{id:string;startsAt:string}}[]}>('/api/v1/me/saved');assert.equal(saved.items[0]?.occurrence.id,resolved.occurrenceId);assert.ok(Date.parse(saved.items[0]!.occurrence.startsAt)>Date.now());
const created=await json<Receipt>('/api/ui/v1/commands','POST',envelopeFor(detail,{type:'ADD_TO_PLAN',eventRef:detail.event.ref,targetPlanId:null,newPlan:{title:'DEMO · Локальный план',participantSlots:1,organizerParticipates:true,decisionLocal:wallTime(new Date(Date.now()+3600000).toISOString(),'Europe/Moscow'),commitmentLocal:wallTime(new Date(Date.now()+7200000).toISOString(),'Europe/Moscow'),timeZone:'Europe/Moscow'},ackUnknownReasons:detail.unknownReasons},randomUUID()));
const plan=created.view as PlanView;assert.equal(plan.kind,'PLAN');assert.equal(plan.options.length,1);
assert.equal((await json<PlanView>(route({kind:'PLAN',planId:plan.planId}))).planId,plan.planId);
assert.equal((await json<{items:unknown[]}>('/api/v1/me/friends')).items.length,1);
await json('/api/v1/me/preferences');
assert.deepEqual(await json('/api/v1/ai/smart-occasion/propose','POST',{text:'DEMO'}),{state:'DISABLED',code:'AI_DISABLED'});
const redis=new Redis(process.env.REDIS_URL!,{maxRetriesPerRequest:1}),queue=new Queue('max-effects',{connection:redis});
try{assert.equal(await redis.ping(),'PONG');assert.ok((await queue.getWorkers()).length>0);}finally{await queue.close();await redis.quit();}
console.log(JSON.stringify({status:'PASS',paths:['Home','Search','Event Detail','Save','Saved','New Plan','Plan Detail','Friends','Profile'],syntheticOccurrences:48,searchMatches:6,sessionAndCsrfGuards:'PASS',externalProviders:false}));
