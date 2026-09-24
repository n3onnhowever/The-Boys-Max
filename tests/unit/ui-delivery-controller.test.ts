import test from 'node:test';
import assert from 'node:assert/strict';
import {ViewController} from '../../apps/miniapp/src/core/controller.ts';
import {CONTRACT,type CatalogView,type VisualPort} from '../../apps/miniapp/src/port/contracts.ts';

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
