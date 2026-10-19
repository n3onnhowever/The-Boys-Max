import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotificationFeed,type NotificationPage} from '../../apps/miniapp/src/core/notification-feed.ts';
type Item={id:string;read:boolean};
test('K6 client appends unique IDs, keeps items and cursor on failure, retries same page, hides load more at end',async()=>{
 const calls:(string|null)[]=[];let fail=true;
 const feed=createNotificationFeed<Item>(async cursor=>{calls.push(cursor);if(!cursor)return {items:[{id:'new',read:false}],unreadCount:2,nextCursor:'next'};if(fail){fail=false;throw Error('offline')}return {items:[{id:'new',read:false},{id:'old',read:false}],unreadCount:2,nextCursor:null}},async()=>({unreadCount:1}));
 await feed.load();assert.deepEqual(feed.getSnapshot().items,[{id:'new',read:false}]);assert.equal(feed.getSnapshot().nextCursor,'next');
 await feed.load();assert.match(feed.getSnapshot().error,/загрузить/);assert.equal(feed.getSnapshot().nextCursor,'next');assert.equal(feed.getSnapshot().items!.length,1);
 await feed.load();assert.deepEqual(calls,[null,'next','next']);assert.equal(feed.getSnapshot().items!.length,2);assert.equal(feed.getSnapshot().nextCursor,null);assert.equal(feed.getSnapshot().error,'');
 await feed.load();assert.equal(calls.length,3,'no load more after final page');
 assert.equal(await feed.markRead('old'),true);assert.equal(feed.getSnapshot().items!.find(n=>n.id==='old')!.read,true);assert.equal(feed.getSnapshot().items![0]!.read,false);assert.equal(feed.getSnapshot().unreadCount,1);
});
test('K6 client gates duplicate load and read requests and uses authoritative unread count',async()=>{
 let resolvePage!:(value:NotificationPage<Item>)=>void,resolveRead!:(value:{unreadCount:number})=>void,loads=0,reads=0;
 const feed=createNotificationFeed<Item>(()=>{loads++;return new Promise(r=>{resolvePage=r})},()=>{reads++;return new Promise(r=>{resolveRead=r})});
 const first=feed.load();await feed.load();assert.equal(loads,1);assert.equal(feed.getSnapshot().pending,true);resolvePage({items:[{id:'one',read:false}],unreadCount:111,nextCursor:'next'});await first;
 const read=feed.markRead('one');assert.equal(await feed.markRead('one'),false);await feed.load();assert.equal(reads,1);assert.equal(loads,1);resolveRead({unreadCount:7});assert.equal(await read,true);assert.equal(feed.getSnapshot().unreadCount,7);
 const second=feed.load();resolvePage({items:[{id:'one',read:false},{id:'two',read:false}],unreadCount:7,nextCursor:null});await second;
 assert.equal(feed.getSnapshot().items![0]!.read,true,'duplicate record cannot revert a successful visible read');assert.equal(feed.getSnapshot().items!.length,2);
});
test('K6 client can retry an initial failure and failed read keeps items/count',async()=>{
 let loads=0;const feed=createNotificationFeed<Item>(async()=>{if(++loads===1)throw Error('offline');return {items:[{id:'old',read:false}],unreadCount:1,nextCursor:null}},async()=>{throw Error('offline')});
 await feed.load();assert.equal(feed.getSnapshot().items,null);assert.equal(feed.getSnapshot().pending,false);await feed.load();
 assert.equal(await feed.markRead('old'),false);assert.deepEqual(feed.getSnapshot().items,[{id:'old',read:false}]);assert.equal(feed.getSnapshot().unreadCount,1);assert.match(feed.getSnapshot().error,/открыть/);
});
