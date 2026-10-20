/** Keyset acceptance on isolated PostgreSQL; fixed timestamps and synthetic actors. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {config} from '../../packages/platform/config.ts';
import {buildApp} from '../../apps/api/app.ts';
import {sign} from '../fixtures.ts';
const cfg=config();assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');
const {app,pool,sessions,plans}=await buildApp(cfg);
before(async()=>{await app.ready()});after(async()=>{await app.close()});
async function actor(){const boot=await sessions.bootstrap(),external=BigInt('0x'+randomBytes(7).toString('hex')).toString();return sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${external},"first_name":"SYNTHETIC K6"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()}),randomUUID(),undefined)}
type Auth=Awaited<ReturnType<typeof actor>>;
type Page={items:{id:string;read:boolean;kind:string}[];nextCursor:string|null;unreadCount:number};
const headers=(s:Auth)=>({cookie:`__Host-max_session=${s.token}`,origin:cfg.publicOrigin,'x-csrf-token':s.body.csrfToken});
const request=(s:Auth,query='')=>app.inject({url:'/api/v1/me/notifications'+query,headers:headers(s)});
async function page(s:Auth,cursor?:string,limit?:number):Promise<Page>{const q=new URLSearchParams();if(cursor!==undefined)q.set('cursor',cursor);if(limit!==undefined)q.set('limit',String(limit));const r=await request(s,'?'+q);assert.equal(r.statusCode,200,r.body);return r.json()}
async function seed(s:Auth,count=105,tied=false){
 const ids=Array.from({length:count},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
 // Unique per actor across tests while maintaining deterministic UUID ordering.
 const prefix=randomUUID().slice(0,8);const owned=ids.map(id=>prefix+id.slice(8));
 await pool.query(`INSERT INTO in_app_notifications(id,actor_id,kind,title,created_at,read_at)
  SELECT id::uuid,$1,'FRIEND_REQUEST','SYNTHETIC K6',timestamptz '2026-01-01 00:00:00.123456+00'+CASE WHEN $3 THEN interval '0' ELSE ord*interval '1 microsecond' END,NULL
  FROM unnest($2::text[]) WITH ORDINALITY AS s(id,ord)`,[s.body.actor.id,owned,tied]);return owned;
}
test('K6 default first page plus second exposes 105 records, older unread/read count and actor ownership',async()=>{
 const a=await actor(),foreign=await actor(),ids=await seed(a);await seed(foreign,3);
 const first=await page(a);assert.equal(first.items.length,100);assert.equal(first.unreadCount,105);assert.ok(first.nextCursor);
 const second=await page(a,first.nextCursor);assert.equal(second.items.length,5);assert.equal(second.nextCursor,null);assert.equal(second.unreadCount,105);
 assert.equal(new Set([...first.items,...second.items].map(n=>n.id)).size,105);assert.deepEqual(new Set([...first.items,...second.items].map(n=>n.id)),new Set(ids));
 assert.deepEqual(await page(a,first.nextCursor),second,'repeated request has stable results');
 const old=second.items[0]!;assert.equal(old.read,false);
 const read=await app.inject({method:'POST',url:`/api/v1/me/notifications/${old.id}/read`,headers:headers(a),payload:{}});assert.equal(read.statusCode,200,read.body);assert.equal(read.json().unreadCount,104);
 const again=await page(a,first.nextCursor);assert.equal(again.items.find(n=>n.id===old.id)!.read,true);assert.equal(again.unreadCount,104);
 const count=await app.inject({url:'/api/v1/me/notifications/count',headers:headers(a)});assert.equal(count.json().unreadCount,104);
 const denied=await app.inject({method:'POST',url:`/api/v1/me/notifications/${old.id}/read`,headers:headers(foreign),payload:{}});assert.equal(denied.statusCode,404);assert.equal((await page(foreign,first.nextCursor)).items.length<=3,true);
 const foreignIds=new Set((await page(foreign)).items.map(n=>n.id));assert.equal([...foreignIds].some(id=>ids.includes(id)),false);
});
test('K6 timestamp ties use descending UUID, deleted boundary works, new arrivals do not skip older rows',async()=>{
 const a=await actor(),ids=await seed(a,107,true),first=await page(a,undefined,40);assert.deepEqual(first.items.map(n=>n.id),[...ids].sort().reverse().slice(0,40));assert.ok(first.nextCursor);
 await pool.query('DELETE FROM in_app_notifications WHERE id=$1',[first.items.at(-1)!.id]);
 const fresh=randomUUID();await pool.query("INSERT INTO in_app_notifications(id,actor_id,kind,title,created_at) VALUES($1,$2,'FRIEND_REQUEST','SYNTHETIC NEW','2026-02-01Z')",[fresh,a.body.actor.id]);
 const second=await page(a,first.nextCursor,40);assert.deepEqual(second.items.map(n=>n.id),[...ids].sort().reverse().slice(40,80));assert.ok(second.nextCursor);
 const third=await page(a,second.nextCursor,40);assert.equal(third.items.length,27);assert.equal(third.nextCursor,null);const reached=[...first.items,...second.items,...third.items].map(n=>n.id);
 assert.equal(new Set(reached).size,107);assert.deepEqual(new Set(reached),new Set(ids));assert.equal(reached.includes(fresh),false);assert.equal((await page(a)).items[0]!.id,fresh);
});
test('K6 microsecond boundaries neither skip nor repeat records',async()=>{
 const a=await actor(),ids=await seed(a,109);let cursor: string|undefined,seen:string[]=[];
 do{const result=await page(a,cursor,7);seen.push(...result.items.map(n=>n.id));cursor=result.nextCursor??undefined}while(cursor);
 assert.equal(seen.length,109);assert.equal(new Set(seen).size,109);assert.deepEqual(seen,[...ids].reverse());
});
test('K6 empty/zero unread/last full page and bounded page sizes',async()=>{
 const a=await actor();assert.deepEqual(await page(a),{items:[],unreadCount:0,nextCursor:null});await seed(a,100);await pool.query('UPDATE in_app_notifications SET read_at=created_at WHERE actor_id=$1',[a.body.actor.id]);
 const full=await page(a);assert.equal(full.items.length,100);assert.equal(full.nextCursor,null);assert.equal(full.unreadCount,0);assert.ok(full.items.every(n=>n.read));
 for(const query of ['?limit=0','?limit=101','?limit=-1','?limit=1.5','?limit=wat','?actorId='+randomUUID()]){const r=await request(a,query);assert.equal(r.statusCode,400,r.body)}
});
test('K6 malformed cursors are bounded 400 errors; cursor cannot supply identity or SQL',async()=>{
 const a=await actor();const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const valid={v:1,at:'2026-01-01T00:00:00.123456Z',id:randomUUID()};
 for(const cursor of ['', 'a'.repeat(257),'!!!!','e30',encode({...valid,v:2}),encode({...valid,at:'2026-02-30T00:00:00.123456Z'}),encode({...valid,at:'0000-01-01T00:00:00.123456Z'}),encode({...valid,id:"'); DROP TABLE actors;--"}),encode({...valid,actorId:a.body.actor.id}),encode({...valid,at:'2026-01-01T00:00:00.123Z'}),encode(valid)+'=']){
  const r=await request(a,'?cursor='+encodeURIComponent(cursor));assert.equal(r.statusCode,400,r.body);assert.ok(r.body.length<300);
 }
 assert.equal((await page(a,encode(valid))).items.length,0,'boundary need not identify a live record');
});
test('K6 RSVP NO reminders and PLAN_CHAT remain hidden on every page and in exact counts',async()=>{
 const a=await actor(),ids=await seed(a,105),actorId=a.body.actor.id;
 const p=await plans.create(actorId,randomUUID(),{title:'SYNTHETIC K6',slots:[{slotId:randomUUID(),label:'SYNTHETIC',required:true,actorId,state:'ACTIVE'}],rule:{kind:'ALL'},decisionDeadline:'2099-01-01T00:00:00.000Z',commitmentDeadline:'2099-01-02T00:00:00.000Z'});
 await pool.query("INSERT INTO plan_rsvps(plan_id,actor_id,state,reconfirm_version) VALUES($1,$2,'NO',0)",[p.planId,actorId]);
 for(const kind of ['PLAN_CHAT','PLAN_REMINDER'])for(const createdAt of ['2025-01-01Z','2027-01-01Z'])await pool.query('INSERT INTO in_app_notifications(id,actor_id,kind,title,plan_id,created_at) VALUES($1,$2,$3,$3,$4,$5)',[randomUUID(),actorId,kind,p.planId,createdAt]);
 const first=await page(a);assert.equal(first.unreadCount,105);assert.equal(first.items.length,100);assert.ok(first.nextCursor);
 const second=await page(a,first.nextCursor);assert.equal(second.items.length,5);assert.equal(second.unreadCount,105);assert.equal(second.nextCursor,null);assert.deepEqual(new Set([...first.items,...second.items].map(n=>n.id)),new Set(ids));
});
