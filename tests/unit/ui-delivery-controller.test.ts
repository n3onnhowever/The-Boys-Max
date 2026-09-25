import test from 'node:test';
import assert from 'node:assert/strict';
import {ViewController} from '../../apps/miniapp/src/core/controller.ts';
import {CONTRACT,type CatalogView,type VisualPort} from '../../apps/miniapp/src/port/contracts.ts';
import {completeMoscowSearchDraft} from '../../apps/miniapp/src/view-model/system-state.ts';

test('runtime date search supplies the required fixed Moscow context',()=>{
 const draft:CatalogView['query']={text:'',city:'',date:'2026-10-24',startLocal:'',endLocal:'',timeZone:'',excludeCategories:[],includedCategories:['THEATRE'],participants:'1',budgetText:'',budgetCurrency:'RUB',priceBasis:'UNKNOWN'};
 const complete=completeMoscowSearchDraft(draft);
 assert.equal(complete.city,'Москва');
 assert.equal(complete.timeZone,'Europe/Moscow');
 assert.equal(complete.date,'2026-10-24');
 assert.deepEqual(complete.includedCategories,['THEATRE']);
});

test('same-route catalog refresh retains only authenticated cards during offline recovery',async()=>{
 const route={kind:'CATALOG' as const,scope:{kind:'PERSONAL' as const}};
 const view:CatalogView={contract:CONTRACT,actorId:'synthetic-actor',route,kind:'CATALOG',actions:['SEARCH'],revision:null,notice:null,
  query:{text:'',city:'Москва',date:'',startLocal:'',endLocal:'',timeZone:'Europe/Moscow',excludeCategories:[],includedCategories:[],participants:'1',budgetText:'',budgetCurrency:'RUB',priceBasis:'UNKNOWN'},
  approvedFilterLabels:[],events:[],aiState:'UNAVAILABLE',aiMessage:''};
 let online=true;
 const port:VisualPort={read:async()=>view,execute:async()=>{throw Error('unused')}};
 const controller=new ViewController(port,()=>online);
 await controller.load(route);
 online=false;
 await controller.refresh();
 assert.equal(controller.getSnapshot().phase,'offline');
 assert.equal(controller.getSnapshot().view,view);
 await controller.load({kind:'EVENT',sourceId:'synthetic',externalEventId:'event',occurrenceId:null,scope:route.scope});
 assert.equal(controller.getSnapshot().view,null);
});
