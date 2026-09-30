import test from 'node:test';
import assert from 'node:assert/strict';
import {savedOccurrenceToDetail,savedToViewModel,type SavedResponse} from '../../apps/miniapp/src/view-model/saved-runtime.ts';
import type {OccurrenceView} from '../../packages/domain/occurrence-view.ts';
import {createElement,type ComponentType} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

const occurrence=(id:string,startsAt:string,kind:OccurrenceView['price']['kind']='UNKNOWN'):OccurrenceView=>({
 id,eventId:'event',title:'SYNTHETIC event',categories:[],categoriesComplete:false,categoryMappingVerified:false,
 startsAt,endsAt:null,timeZone:'Europe/Moscow',timeState:'UPCOMING',venue:{state:'UNKNOWN',name:null,address:null,coordinates:null},
 price:{kind,label:kind==='UNKNOWN'?'Цена не указана':'Условия: требуется подтверждение',conditions:kind==='CONDITIONAL'?['требуется подтверждение']:[],totalMinMinor:null,totalMaxMinor:null,currency:null,basis:'UNKNOWN',evidenceScope:'UNKNOWN'},
 source:{providerId:'SYNTHETIC',providerEventId:'e',url:null,canOpen:false,fetchedAt:'2026-09-24T00:00:00.000Z'},
 lifecycle:'UNKNOWN',confirmation:'UNCONFIRMED',warnings:['END_UNKNOWN','PLACE_UNKNOWN','SOURCE_UNAVAILABLE'],
});
test('runtime Detail exposes Save and reports rejected mutation without false success',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try{
  const module=await server.ssrLoadModule('/apps/miniapp/src/components/DetailScreen.tsx') as {DetailScreen:ComponentType<Record<string,unknown>>};
  const model=savedOccurrenceToDetail(occurrence('one','2027-04-10T18:00:00+03:00'),[]);
  const plain=renderToStaticMarkup(createElement(module.DetailScreen,{model,savedState:false,onSave:()=>{}}));
  assert.match(plain,/Сохранить/);assert.match(plain,/aria-pressed="false"/);
  const rejected=renderToStaticMarkup(createElement(module.DetailScreen,{model,savedState:false,onSave:()=>{},saveError:'Не удалось изменить сохранение.'}));
  assert.match(rejected,/role="alert"/);assert.match(rejected,/Не удалось изменить сохранение/);
  assert.doesNotMatch(rejected,/aria-pressed="true"/);
  const persisted=renderToStaticMarkup(createElement(module.DetailScreen,{model,savedState:true,onSave:()=>{}}));
  assert.match(persisted,/Сохранено/);assert.match(persisted,/aria-pressed="true"/);
 }finally{await server.close();}
});
test('runtime Saved model uses only server occurrences and preserves unknown facts',()=>{
 const response:SavedResponse={items:[{savedAt:'2026-09-24T00:00:00.000Z',occurrence:occurrence('near','2027-04-10T18:00:00+03:00')},
  {savedAt:'2026-09-24T00:00:00.000Z',occurrence:occurrence('later','2027-06-10T18:00:00+03:00','CONDITIONAL')}]};
 const model=savedToViewModel(response,new Date('2027-04-01T00:00:00.000Z'));
 assert.equal(model.provenance,'SERVER_ADAPTER');
 assert.deepEqual(model.events.upcoming.map(e=>e.id),['near']);assert.deepEqual(model.events.later.map(e=>e.id),['later']);
 assert.equal(model.events.upcoming[0]!.priceLabel,'Цена не указана');assert.equal(model.events.upcoming[0]!.venue,'Место уточняется');
 assert.equal(model.events.later[0]!.priceLabel,'Цена с условиями');
 assert.equal(model.events.upcoming[0]!.artwork,'/assets/events/category-other-v2.png');
 assert.deepEqual(savedToViewModel({items:[]}).events,{upcoming:[],later:[]});
 const detail=savedOccurrenceToDetail(response.items[0]!.occurrence,[]);
 assert.equal(detail.saveCapability,'AVAILABLE');assert.equal(detail.saved,true);
 assert.equal(detail.price.displayLabel,'Цена не указана');assert.equal(detail.venue.displayLabel,'Место уточняется');
 assert.equal(detail.occurrence.endLabel,null);assert.equal(detail.source.url,null);assert.equal(detail.primaryAction.kind,'UNAVAILABLE');
 assert.equal(savedOccurrenceToDetail(response.items[1]!.occurrence,[]).price.displayLabel,'Условия: требуется подтверждение');
});
test('runtime Saved keeps synthetic source disclosure and local category artwork',()=>{
 const demo={...occurrence('demo','2027-04-10T18:00:00+03:00'),categories:['SPORT'],source:{...occurrence('demo','2027-04-10T18:00:00+03:00').source,sourceId:'synthetic:povod-demo:v3'}};
 const response:SavedResponse={items:[{savedAt:'2026-09-24T00:00:00.000Z',occurrence:demo}]};
 const card=savedToViewModel(response,new Date('2027-04-01T00:00:00.000Z')).events.upcoming[0]!;
 assert.equal(card.sourceLabel,'Демо-каталог');assert.equal(card.artwork,'/assets/events/category-sport.png');
});
