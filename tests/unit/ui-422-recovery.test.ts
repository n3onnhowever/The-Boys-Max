import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {ViewController} from '../../apps/miniapp/src/core/controller.ts';
import {HttpVisualPort} from '../../apps/miniapp/src/port/http.ts';
import {CONTRACT,type CatalogView,type SearchDraft} from '../../apps/miniapp/src/port/contracts.ts';

test('invalid search HTTP 422 clears pending and corrected search succeeds without reload',async()=>{
 const scope={kind:'PERSONAL' as const};
 const query:SearchDraft={text:'',city:'',date:'',startLocal:'',endLocal:'',timeZone:'Europe/Moscow',excludeCategories:[],includedCategories:[],participants:'',budgetText:'',budgetCurrency:'RUB',priceBasis:'PER_PERSON'};
 const view:CatalogView={contract:CONTRACT,actorId:'synthetic-actor',route:{kind:'CATALOG',scope},kind:'CATALOG',actions:['SEARCH'],revision:{state_version:1,search_context_revision:1,config_revision:1,electorate_version:0,selection_revision:0,snapshot_id:null,terms_revision:null},notice:null,query,approvedFilterLabels:[],events:[],aiState:'UNAVAILABLE',aiMessage:''};
 const keys:string[]=[];
 const port=new HttpVisualPort({origin:'https://example.test',csrfToken:async()=>'synthetic-csrf',codec:{view:input=>input as CatalogView,receipt:input=>input as never},fetcher:async(_url,options)=>{
  if(options?.method==='GET')return Response.json(view);
  const envelope=JSON.parse(String(options?.body));keys.push(envelope.idempotencyKey);
  if(envelope.command.draft.text==='invalid')return Response.json({error:{code:'TEXT_FILTER_UNSUPPORTED'}},{status:422});
  return Response.json({idempotencyKey:envelope.idempotencyKey,outcome:'APPLIED',view:{...view,query:envelope.command.draft}});
 }});
 const controller=new ViewController(port,()=>true,randomUUID);
 await controller.load({kind:'CATALOG',scope});
 controller.setDraft('search','invalid');
 await controller.execute({type:'SEARCH',scope,draft:{...query,text:'invalid'}});
 assert.equal(controller.getSnapshot().phase,'error');
 assert.match(controller.getSnapshot().error??'',/TEXT_FILTER_UNSUPPORTED/);
 assert.equal(controller.getSnapshot().draft.search,'invalid');
 controller.setDraft('search','corrected');
 await controller.execute({type:'SEARCH',scope,draft:{...query,text:'corrected'}});
 assert.equal(controller.getSnapshot().phase,'ready');
 assert.equal((controller.getSnapshot().view as CatalogView).query.text,'corrected');
 assert.equal(controller.getSnapshot().receipt,'APPLIED');
 assert.equal(keys.length,2);assert.notEqual(keys[0],keys[1]);
});

test('ambiguous transport keeps the pending key until the same command is retried',async()=>{
 const scope={kind:'PERSONAL' as const};
 const query:SearchDraft={text:'',city:'',date:'',startLocal:'',endLocal:'',timeZone:'Europe/Moscow',excludeCategories:[],includedCategories:[],participants:'',budgetText:'',budgetCurrency:'RUB',priceBasis:'PER_PERSON'};
 const view:CatalogView={contract:CONTRACT,actorId:'synthetic-actor',route:{kind:'CATALOG',scope},kind:'CATALOG',actions:['SEARCH'],revision:{state_version:1,search_context_revision:1,config_revision:1,electorate_version:0,selection_revision:0,snapshot_id:null,terms_revision:null},notice:null,query,approvedFilterLabels:[],events:[],aiState:'UNAVAILABLE',aiMessage:''};
 const keys:string[]=[];
 const port=new HttpVisualPort({origin:'https://example.test',csrfToken:async()=>'synthetic-csrf',codec:{view:input=>input as CatalogView,receipt:input=>input as never},fetcher:async(_url,options)=>{
  if(options?.method==='GET')return Response.json(view);
  const envelope=JSON.parse(String(options?.body));keys.push(envelope.idempotencyKey);
  if(keys.length===1)throw new TypeError('SYNTHETIC dropped response');
  return Response.json({idempotencyKey:envelope.idempotencyKey,outcome:'APPLIED',view:{...view,query:envelope.command.draft}});
 }});
 const controller=new ViewController(port,()=>true,randomUUID);
 await controller.load({kind:'CATALOG',scope});
 controller.setDraft('search','pending text');
 await controller.execute({type:'SEARCH',scope,draft:{...query,text:'pending text'}});
 assert.equal(controller.getSnapshot().phase,'uncertain');
 assert.equal(controller.getSnapshot().draft.search,'pending text');
 await controller.execute({type:'SEARCH',scope,draft:{...query,text:'different text'}});
 assert.equal(keys.length,1,'a new command cannot replace an uncertain request');
 await controller.retry();
 assert.equal(controller.getSnapshot().phase,'ready');
 assert.equal((controller.getSnapshot().view as CatalogView).query.text,'pending text');
 assert.deepEqual(keys,[keys[0],keys[0]]);
});
