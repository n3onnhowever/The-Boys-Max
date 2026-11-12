/** WP1A: real PostgreSQL barriers, synthetic sessions/data, no external delivery. */
import test,{before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {setImmediate} from 'node:timers/promises';
import {buildApp} from '../../apps/api/app.ts';
import {config} from '../../packages/platform/config.ts';
import {socialService} from '../../packages/persistence/social.ts';
import type {Plan,Slot} from '../../packages/contracts/domain.ts';
import {sign,terms} from '../fixtures.ts';

const cfg=config();assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');
const {app,pool,sessions,plans}=await buildApp(cfg),social=socialService(pool);
const owned:string[]=[];
before(async()=>{await app.ready()});
after(async()=>{await app.close()});
afterEach(async t=>{
 // Retain synthetic durable state before the external runner tears services down.
 const state=await pool.query(`SELECT p.id,p.state_version,p.state->'slots' slots,
  (SELECT jsonb_agg(jsonb_build_object('id',m.id,'actor',m.actor_id,'body',m.body)) FROM plan_messages m WHERE m.plan_id=p.id) messages,
  (SELECT jsonb_agg(jsonb_build_object('id',n.id,'actor',n.actor_id,'kind',n.kind,'read',n.read_at IS NOT NULL)) FROM in_app_notifications n WHERE n.plan_id=p.id) notifications
  FROM plans p WHERE p.id=ANY($1::uuid[])`,[owned]);
 console.log(JSON.stringify({test:t.name,state:state.rows}));owned.length=0;
});
async function actor(){
 const boot=await sessions.bootstrap(),external=BigInt('0x'+randomBytes(7).toString('hex')).toString();
 const now=Number((await pool.query('SELECT extract(epoch FROM clock_timestamp())::text seconds')).rows[0].seconds);
 const auth=await sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${external},"first_name":"SYNTHETIC WP1A"}`,Math.floor(now),{query_id:randomUUID()}),randomUUID(),undefined);
 return {id:auth.body.actor.id,headers:{cookie:`__Host-max_session=${auth.token}`,origin:cfg.publicOrigin,'x-csrf-token':auth.body.csrfToken}};
}
async function fixture(){
 const owner=await actor(),member=await actor();
 // Organizer deliberately has no ACTIVE slot: organizer authority is independent.
 const guest:Slot={slotId:randomUUID(),label:'SYNTHETIC guest',required:true,actorId:null,state:'UNBOUND'};
 const p=await plans.create(owner.id,randomUUID(),{title:'SYNTHETIC initial Plan',slots:[guest],rule:{kind:'ALL'},decisionDeadline:'2099-01-01T00:00:00.000Z',commitmentDeadline:'2099-01-02T00:00:00.000Z'});
 owned.push(p.planId);
 const invite=await plans.invite(owner.id,p.planId,randomUUID(),1);await plans.requestJoin(member.id,invite.inviteRef);
 await plans.command(owner.id,p.planId,randomUUID(),{kind:'ROSTER',expectedStateVersion:1,slots:[{...guest,actorId:member.id,state:'ACTIVE'}],rule:{kind:'ALL'},decisionDeadline:'2099-01-01T00:00:00.000Z',reason:'SYNTHETIC approval'},randomUUID());
 const state=(await pool.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[p.planId])).rows[0]!.state;
 await plans.command(owner.id,p.planId,randomUUID(),{kind:'ADD_OPTION',expectedStateVersion:state.stateVersion,optionId:randomUUID(),snapshotId:randomUUID(),terms:{...terms,title:'SYNTHETIC initial event',startsAt:'2099-02-01T12:00:00.000Z',endsAt:null}},randomUUID());
 await social.savePlanPresentation(owner.id,p.planId,{title:'SYNTHETIC initial presentation',meetingTime:null,meetingPoint:null,note:null,participantLimit:null,expectedVersion:0});
 return {owner,member,id:p.planId};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function remove(f:Fixture){
 const p=(await pool.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[f.id])).rows[0]!.state;
 return plans.command(f.owner.id,f.id,randomUUID(),{kind:'ROSTER',expectedStateVersion:p.stateVersion,slots:p.slots.map(s=>({...s,state:'LEFT' as const})),rule:p.rule,decisionDeadline:p.decisionDeadline,reason:'SYNTHETIC removal'},randomUUID());
}
async function rename(f:Fixture){
 await social.savePlanPresentation(f.owner.id,f.id,{title:'SYNTHETIC private presentation AFTER removal',meetingTime:null,meetingPoint:'SYNTHETIC private location',note:'SYNTHETIC private note',participantLimit:null,expectedVersion:1});
 const p=(await pool.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[f.id])).rows[0]!.state,o=p.options[0]!;
 await plans.command(f.owner.id,f.id,randomUUID(),{kind:'EDIT_OPTION',expectedStateVersion:p.stateVersion,optionId:o.optionId,snapshotId:randomUUID(),terms:{...o.snapshots[0]!.terms,title:'SYNTHETIC private event AFTER removal'},cosmetic:false,reason:'SYNTHETIC private update'},randomUUID());
}
async function waitFor<T>(probe:()=>Promise<T|undefined>):Promise<T>{
 const end=performance.now()+5000;
 do{const value=await probe();if(value!==undefined)return value;await setImmediate();}while(performance.now()<end);
 throw Error('WP1A_BARRIER_NOT_REACHED');
}
async function blocked(query:string){
 return waitFor(async()=>{const r=await pool.query<{pid:number}>("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query ILIKE $1",[query]);return r.rows[0]?.pid;});
}
async function blockedOrDone(pid:number,done:()=>boolean){
 return waitFor(async()=>{
  if(done())return false;
  const r=await pool.query('SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND $1=ANY(pg_blocking_pids(pid))',[pid]);
  return r.rowCount?true:undefined;
 });
}
const message=(f:Fixture,who=f.member,text='SYNTHETIC chat')=>app.inject({method:'POST',url:`/api/v1/plans/${f.id}/messages`,headers:who.headers,payload:{text}});
const messages=(f:Fixture,who=f.member)=>app.inject({url:`/api/v1/plans/${f.id}/messages`,headers:who.headers});
const page=(f:Fixture,who=f.member,query='')=>app.inject({url:'/api/v1/me/notifications'+query,headers:who.headers});
function redacted(n:Awaited<ReturnType<typeof social.notifications>>['items'][number]){
 assert.equal(n.planTitle,null);assert.equal(n.eventTitle,null);assert.equal(n.actorName,null);assert.equal(n.actorId,null);assert.equal(n.planId,null);assert.equal(n.inviteRef,null);assert.deepEqual(n.target,{kind:'UNAVAILABLE'});
}

test('WP1A notification current member and organizer retain enrichment and Plan navigation',async()=>{
 const f=await fixture();
 for(const who of [f.member,f.owner]){
  const r=await page(f,who);assert.equal(r.statusCode,200);const n=r.json().items.find((n:{planId:string})=>n.planId===f.id);
  assert.ok(n);assert.equal(n.planTitle,'SYNTHETIC initial presentation');assert.equal(n.eventTitle,'SYNTHETIC initial event');assert.deepEqual(n.target,{kind:'PLAN',planId:f.id});
 }
});
test('WP1A notification invitation locator retains separate flow without granting Plan metadata',async()=>{
 const f=await fixture(),invited=await actor();
 await social.requestFriend(f.owner.id,invited.id);await social.acceptFriend(invited.id,f.owner.id);
 const invite=await plans.inviteFriend(f.owner.id,invited.id,f.id,3);
 const notice=(await social.notifications(invited.id)).items.find(n=>n.kind==='PLAN_INVITE')!;
 assert.ok(notice);assert.equal(notice.planId,null);assert.equal(notice.planTitle,null);assert.equal(notice.eventTitle,null);assert.equal(notice.actorName,null);
 assert.deepEqual(notice.target,{kind:'INVITE',inviteRef:invite.inviteRef});
 assert.equal((await app.inject({url:`/api/v1/plans/${f.id}`,headers:invited.headers})).statusCode,404);
});
test('WP1A notification former member history redacts post-removal metadata and navigation',async t=>{
 const f=await fixture(),before=await social.notifications(f.member.id);
 await remove(f);await rename(f);const after=await social.notifications(f.member.id);
 t.diagnostic(JSON.stringify({before,after}));
 assert.deepEqual(after.items.map(n=>n.id),before.items.map(n=>n.id));assert.equal(after.unreadCount,before.unreadCount);
 for(const n of after.items){redacted(n);assert.equal(n.read,false);assert.equal(n.createdAt,before.items.find(x=>x.id===n.id)!.createdAt);}
 assert.equal((await app.inject({url:`/api/v1/plans/${f.id}`,headers:f.member.headers})).statusCode,404);
});
test('WP1A notification redaction preserves cursors, exact unread count and owned read marking',async()=>{
 const f=await fixture(),before=await social.notifications(f.member.id,{limit:1});assert.ok(before.nextCursor);
 await remove(f);await rename(f);
 const first=await social.notifications(f.member.id,{limit:1});assert.equal(first.nextCursor,before.nextCursor);redacted(first.items[0]!);
 const second=await social.notifications(f.member.id,{cursor:first.nextCursor!,limit:1});assert.equal(second.items.length,1);redacted(second.items[0]!);
 assert.notEqual(first.items[0]!.id,second.items[0]!.id);
 const id=second.items[0]!.id;
 for(let i=0;i<2;i++){const read=await app.inject({method:'POST',url:`/api/v1/me/notifications/${id}/read`,headers:f.member.headers,payload:{}});assert.equal(read.statusCode,200);assert.equal(read.json().unreadCount,before.unreadCount-1);}
 assert.deepEqual(await social.unreadCount(f.member.id),{unreadCount:before.unreadCount-1});
 const seen=await social.notifications(f.member.id,{cursor:first.nextCursor!,limit:1});assert.equal(seen.items[0]!.read,true);redacted(seen.items[0]!);
 const foreign=await app.inject({method:'POST',url:`/api/v1/me/notifications/${id}/read`,headers:f.owner.headers,payload:{}});assert.equal(foreign.statusCode,404);
});
test('WP1A notification concurrent removal reads one authorized snapshot then redacts after commit',async()=>{
 const f=await fixture(),blocker=await pool.connect();let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query('LOCK TABLE command_audit IN ACCESS EXCLUSIVE MODE');
  pending=remove(f);await blocked('%insert into command_audit%');
  const concurrent=await social.notifications(f.member.id);assert.equal(concurrent.items[0]!.planTitle,'SYNTHETIC initial presentation');
  await blocker.query('COMMIT');await pending;await rename(f);
  for(const n of (await social.notifications(f.member.id)).items)redacted(n);
 }finally{await blocker.query('ROLLBACK');blocker.release();await pending;}
});
test('WP1A chat active member and organizer without slot read/write; removed member denied',async()=>{
 const f=await fixture();
 assert.equal((await message(f)).statusCode,200);assert.equal((await message(f,f.owner)).statusCode,200);
 assert.equal((await messages(f)).json().items.length,2);assert.equal((await messages(f,f.owner)).json().items.length,2);
 await remove(f);assert.equal((await message(f)).statusCode,403);assert.equal((await messages(f)).statusCode,403);
 const before=Number((await pool.query("SELECT count(*) n FROM in_app_notifications WHERE plan_id=$1 AND actor_id=$2 AND kind='PLAN_CHAT'",[f.id,f.member.id])).rows[0].n);
 assert.equal((await message(f,f.owner,'SYNTHETIC private after removal')).statusCode,200);
 assert.equal(Number((await pool.query("SELECT count(*) n FROM in_app_notifications WHERE plan_id=$1 AND actor_id=$2 AND kind='PLAN_CHAT'",[f.id,f.member.id])).rows[0].n),before);
 assert.equal((await messages(f,f.owner)).json().items.length,3);
});
for(const operation of ['read','write'] as const)test(`WP1A chat removal-first ${operation} waits for committed revocation and denies`,async t=>{
 const f=await fixture();await message(f,f.owner,'SYNTHETIC private message');
 const blocker=await pool.connect();let removal:Promise<unknown>|undefined,request:Promise<any>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query('LOCK TABLE command_audit IN ACCESS EXCLUSIVE MODE');
  removal=remove(f);const removalPid=await blocked('%insert into command_audit%');
  let done=false;request=Promise.resolve(operation==='write'?message(f):messages(f)).then(r=>{done=true;return r;});
  const waits=await blockedOrDone(removalPid,()=>done);
  await blocker.query('COMMIT');await removal;const result=await request;
  t.diagnostic(JSON.stringify({operation,waits,status:result.statusCode,body:result.json()}));
  assert.equal(waits,true,'operation must serialize behind roster change');assert.equal(result.statusCode,403);
 }finally{await blocker.query('ROLLBACK');blocker.release();await removal;await request;}
});
for(const operation of ['read','write'] as const)test(`WP1A chat admitted ${operation} orders removal after operation`,async t=>{
 const f=await fixture();await message(f,f.owner,'SYNTHETIC private message');
 const blocker=await pool.connect();let removal:Promise<unknown>|undefined,request:Promise<any>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query('LOCK TABLE plan_messages IN ACCESS EXCLUSIVE MODE');
  request=Promise.resolve(operation==='write'?message(f):messages(f));
  const admittedPid=await blocked(operation==='write'?'INSERT INTO plan_messages%':'SELECT m.id%');
  let done=false;removal=remove(f).then(r=>{done=true;return r;});
  const waits=await blockedOrDone(admittedPid,()=>done);
  t.diagnostic(JSON.stringify({operation,removalWaiting:waits}));
  await blocker.query('COMMIT');const result=await request;await removal;
  t.diagnostic(JSON.stringify({operation,status:result.statusCode,body:result.json(),membership:(await pool.query('SELECT state FROM plan_slots WHERE plan_id=$1',[f.id])).rows}));
  assert.equal(waits,true,'roster change must respect admitted chat operation');assert.equal(result.statusCode,200);
  assert.equal((await messages(f)).statusCode,403);assert.equal((await message(f)).statusCode,403);
 }finally{await blocker.query('ROLLBACK');blocker.release();await request;await removal;}
});
test('WP1A chat concurrent admitted reads share authority until both finish',async()=>{
 const f=await fixture();await message(f,f.owner);const blocker=await pool.connect();let requests:Promise<any>[]=[];
 try{
  await blocker.query('BEGIN');await blocker.query('LOCK TABLE plan_messages IN ACCESS EXCLUSIVE MODE');
  requests=[Promise.resolve(messages(f)),Promise.resolve(messages(f))];
  await waitFor(async()=>{const r=await pool.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT m.id%'");return r.rows[0].n===2?true:undefined;});
  await blocker.query('COMMIT');for(const response of await Promise.all(requests)){assert.equal(response.statusCode,200);assert.equal(response.json().items.length,1);}
 }finally{await blocker.query('ROLLBACK');blocker.release();await Promise.all(requests);}
});
for(const failure of ['message','notification'] as const)test(`WP1A chat ${failure} failure rolls back message and notifications atomically`,async()=>{
 const f=await fixture(),table=failure==='message'?'plan_messages':'in_app_notifications';
 const name='wp1a_'+randomBytes(8).toString('hex');
 await pool.query(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.plan_id='${f.id}'::uuid THEN RAISE EXCEPTION 'SYNTHETIC_WP1A_WRITE_FAILURE'; END IF; RETURN NEW; END $$`);
 await pool.query(`CREATE TRIGGER ${name} BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION ${name}()`);
 try{
  const result=await message(f);assert.equal(result.statusCode,503);
  assert.equal((await pool.query('SELECT 1 FROM plan_messages WHERE plan_id=$1',[f.id])).rowCount,0);
  assert.equal((await pool.query("SELECT 1 FROM in_app_notifications WHERE plan_id=$1 AND kind='PLAN_CHAT'",[f.id])).rowCount,0);
 }finally{await pool.query(`DROP TRIGGER ${name} ON ${table}`);await pool.query(`DROP FUNCTION ${name}()`);}
});
test('WP1A chat successful message and exactly one corresponding notification commit together',async()=>{
 const f=await fixture(),result=await message(f);assert.equal(result.statusCode,200);
 assert.equal((await pool.query('SELECT 1 FROM plan_messages WHERE id=$1 AND plan_id=$2',[result.json().id,f.id])).rowCount,1);
 const notices=await pool.query("SELECT actor_id FROM in_app_notifications WHERE plan_id=$1 AND kind='PLAN_CHAT'",[f.id]);assert.deepEqual(notices.rows,[{actor_id:f.owner.id}]);
});
