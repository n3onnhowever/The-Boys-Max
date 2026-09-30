import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DEMO_ITEMS} from '../../packages/demo/catalog-v3.ts';
import {CONTRACT,type CatalogView,type EventCardView,type EventView} from '../../apps/miniapp/src/port/contracts.ts';
import {artworkCategory,categoryArtwork} from '../../apps/miniapp/src/view-model/category-artwork.ts';
import {catalogToHomeViewModel} from '../../apps/miniapp/src/view-model/home.ts';
import {catalogToSearchViewModel} from '../../apps/miniapp/src/view-model/search.ts';
import {eventToDetailViewModel} from '../../apps/miniapp/src/view-model/detail.ts';
import {savedOccurrenceToDetail,savedToViewModel} from '../../apps/miniapp/src/view-model/saved-runtime.ts';
import type {OccurrenceView} from '../../packages/domain/occurrence-view.ts';

function card(id:string,category:EventCardView['artworkCategory']):EventCardView{
 return {ref:{offerId:id,contextRevision:1,sourceId:'synthetic:povod-demo:v3',externalEventId:id,occurrenceId:id,observationId:id},
  title:`SYNTHETIC ${id}`,startLabel:'2 октября · 20:00',categoryLabel:'Намеренно не локализовано, и с запятой',artworkCategory:category,
  place:{address:'Демо-площадка',coordinates:null,navigationUrl:null,attribution:null},
  price:{baseLabel:'Цена не указана',totalLabel:null,basisLabel:'Неизвестно',fees_known:false,warnings:[]},
  sourceLabel:'Демо-каталог',sourceUrl:null,freshnessLabel:'Synthetic',eligibilityLabel:'PASS',description:'Synthetic test'};
}
function occurrence(id:string,categories:string[]):OccurrenceView{
 return {id,eventId:id,title:`SYNTHETIC ${id}`,categories,categoriesComplete:true,categoryMappingVerified:true,
  startsAt:'2027-10-02T20:00:00+03:00',endsAt:null,timeZone:'Europe/Moscow',timeState:'UPCOMING',
  venue:{state:'VENUE',name:'Демо-площадка',address:null,coordinates:null},
  price:{kind:'UNKNOWN',label:'Цена не указана',conditions:[],totalMinMinor:null,totalMaxMinor:null,currency:null,basis:'UNKNOWN',evidenceScope:'UNKNOWN'},
  source:{sourceId:'synthetic:povod-demo:v3',providerId:'ManualProvider',providerEventId:id,url:null,canOpen:false,fetchedAt:'2026-09-29T21:30:00.000Z'},
  lifecycle:'SCHEDULED',confirmation:'CONFIRMED',warnings:[]};
}

test('all 48 synthetic showcase records use the same local artwork in Home, Search, Detail, and Saved',()=>{
 assert.equal(DEMO_ITEMS.length,48);
 const counts=new Map<string,number>();
 for(const item of DEMO_ITEMS){
  counts.set(item.category,(counts.get(item.category)??0)+1);
  const event=card(item.id,item.category);
  const catalog:CatalogView={contract:CONTRACT,kind:'CATALOG',actorId:'synthetic',route:{kind:'CATALOG',scope:{kind:'PERSONAL'}},
   actions:['SEARCH'],revision:null,notice:null,query:{text:'',city:'Москва',date:'',startLocal:'',endLocal:'',timeZone:'Europe/Moscow',excludeCategories:[],includedCategories:[],participants:'1',budgetText:'',budgetCurrency:'RUB',priceBasis:'UNKNOWN'},
   approvedFilterLabels:[],events:[event],aiState:'UNAVAILABLE',aiMessage:''};
  const detail:EventView={contract:CONTRACT,kind:'EVENT',actorId:'synthetic',route:{kind:'EVENT',sourceId:event.ref.sourceId,externalEventId:event.ref.externalEventId,occurrenceId:event.ref.occurrenceId,scope:{kind:'PERSONAL'}},actions:[],revision:null,notice:null,event,targetPlanId:null,unknownReasons:[]};
  const saved=occurrence(item.id,[item.category]);
  const expected=categoryArtwork(item.category);
  const paths=[catalogToHomeViewModel(catalog).hero?.artwork,catalogToSearchViewModel(catalog).events[0]?.artwork,
   eventToDetailViewModel(detail,[]).heroArtwork,savedToViewModel({items:[{savedAt:'2026-09-30T00:00:00Z',occurrence:saved}]},new Date('2027-09-30T00:00:00Z')).events.upcoming[0]?.artwork,
   savedOccurrenceToDetail(saved,[]).heroArtwork];
  assert.deepEqual(paths,Array(5).fill(expected.url),item.id);
  assert.ok(expected.url.startsWith('/assets/events/'));
  assert.ok(existsSync(fileURLToPath(new URL(`../../apps/miniapp/public${expected.url}`,import.meta.url))),expected.url);
 }
 assert.deepEqual([...counts.values()],Array(8).fill(6));
});

test('multi-category priority is independent of label, source order, reload, and session',()=>{
 for(const categories of [['OTHER','THEATRE','CONCERT'],['CONCERT','OTHER','THEATRE'],['THEATRE','CONCERT','OTHER']]){
  assert.equal(artworkCategory(categories),'THEATRE');
  assert.equal(categoryArtwork(artworkCategory(categories)).url,'/assets/events/category-theatre.png');
 }
 assert.equal(artworkCategory([]),null);
 assert.throws(()=>artworkCategory(['KNOWN_NEW_CATEGORY']),/UNKNOWN_ARTWORK_CATEGORY/);
 assert.match(categoryArtwork('VOLUNTEER').alt,/отдельное изображение пока отсутствует/);
});
