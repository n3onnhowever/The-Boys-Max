/** WP1B: isolated PostgreSQL and synthetic authenticated actors; no provider calls. */
import test,{before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {buildApp} from '../../apps/api/app.ts';
import {config} from '../../packages/platform/config.ts';
import {digest} from '../../packages/platform/auth.ts';
import {socialService} from '../../packages/persistence/social.ts';
import type {Plan,Slot} from '../../packages/contracts/domain.ts';
import type {InviteView} from '../../apps/miniapp/src/port/contracts.ts';
import {codec} from '../../apps/miniapp/src/port/schema.ts';
import {sign,terms} from '../fixtures.ts';

const cfg=config();assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');
assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');assert.equal(cfg.aiExternalEnabled,false);
const {app,pool,sessions,plans}=await buildApp(cfg),social=socialService(pool);
const owned:string[]=[];
before(async()=>{await app.ready()});
after(async()=>{await app.close()});
afterEach(async t=>{
 // Capture actual synthetic state on both success and failure, before service teardown.
 const result=await pool.query(`SELECT p.id,p.organizer_id,p.state,a.display_name,pp.title presentation_title,
  (SELECT jsonb_agg(jsonb_build_object('revoked',i.revoked,'expires_at',i.expires_at,'unexpired',i.expires_at>clock_timestamp())) FROM invites i WHERE i.plan_id=p.id) invites,
  (SELECT jsonb_agg(jsonb_build_object('actor',s.actor_id,'state',s.state)) FROM plan_slots s WHERE s.plan_id=p.id) slots,
  (SELECT jsonb_agg(jsonb_build_object('actor',j.actor_id,'state',j.state)) FROM join_requests j WHERE j.plan_id=p.id) requests
  FROM plans p JOIN actors a ON a.id=p.organizer_id LEFT JOIN plan_presentation pp ON pp.plan_id=p.id WHERE p.id=ANY($1::uuid[])`,[owned]);
 console.log(JSON.stringify({test:t.name,database:result.rows}));owned.length=0;
});
async function actor(){
 const boot=await sessions.bootstrap(),external=BigInt('0x'+randomBytes(7).toString('hex')).toString();
 const now=Number((await pool.query('SELECT extract(epoch FROM clock_timestamp())::text seconds')).rows[0].seconds);
 const auth=await sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${external},"first_name":"SYNTHETIC WP1B"}`,Math.floor(now),{query_id:randomUUID()}),randomUUID(),undefined);
 return {id:auth.body.actor.id,headers:{cookie:`__Host-max_session=${auth.token}`,origin:cfg.publicOrigin,'x-csrf-token':auth.body.csrfToken}};
}
type Actor=Awaited<ReturnType<typeof actor>>;
async function fixture(){
 const owner=await actor(),guest=await actor();
 // Organizer has no slot: organizer and membership authority are independent.
 const slot:Slot={slotId:randomUUID(),label:'SYNTHETIC guest',required:true,actorId:null,state:'UNBOUND'};
 const created=await plans.create(owner.id,randomUUID(),{title:'SYNTHETIC private Plan',slots:[slot],rule:{kind:'ALL'},decisionDeadline:'2099-01-01T00:00:00.000Z',commitmentDeadline:'2099-01-02T00:00:00.000Z'});
 const id=created.planId;owned.push(id);
 await plans.command(owner.id,id,randomUUID(),{kind:'ADD_OPTION',expectedStateVersion:1,optionId:randomUUID(),snapshotId:randomUUID(),terms:{...terms,title:'SYNTHETIC private event',startsAt:'2099-02-01T12:00:00.000Z',endsAt:null,place:'SYNTHETIC private venue'}},randomUUID());
 const invite=await plans.invite(owner.id,id,randomUUID(),2);
 return {owner,guest,id,ref:invite.inviteRef};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function state(f:Fixture){return (await pool.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[f.id])).rows[0]!.state;}
function url(ref:string){return '/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify({kind:'INVITE',inviteRef:ref}));}
async function read(f:Fixture,who=f.guest,ref=f.ref){
 const response=await app.inject({url:url(ref),headers:who.headers});
 console.log(JSON.stringify({http:'INVITE',actor:who.id,status:response.statusCode,body:response.json()}));
 assert.equal(response.statusCode,200);const view=codec.view(response.json());assert.equal(view.kind,'INVITE');return view as InviteView;
}
function privateContext(view:InviteView,renamed=false){
 assert.deepEqual(view.context,{organizerName:renamed?'SYNTHETIC organizer AFTER invalidation':'SYNTHETIC WP1B',planTitle:renamed?'SYNTHETIC Plan AFTER invalidation':'SYNTHETIC private Plan',eventTitle:'SYNTHETIC private event',startsAt:'2099-02-01T12:00:00.000Z',venue:'SYNTHETIC private venue'});
}
function noNavigation(view:InviteView,f:Fixture){
 assert.equal(view.activePlanId,null);assert.deepEqual(view.route,{kind:'INVITE',inviteRef:f.ref});
 assert.ok(!JSON.stringify(view).includes(f.id),'private Plan locator absent');
 assert.ok(!JSON.stringify(view).includes('"kind":"PLAN"'),'protected navigation absent');
}
function neutral(view:InviteView,f:Fixture,expected:InviteView['state']='EXPIRED'){
 assert.equal(view.state,expected);assert.deepEqual(view.actions,[]);noNavigation(view,f);
 assert.equal(view.context,null);
 for(const field of ['organizerName','planTitle','eventTitle','startsAt','venue'])assert.ok(!JSON.stringify(view).includes('"'+field+'"'),field+' absent');
 for(const value of ['SYNTHETIC private','SYNTHETIC organizer AFTER','SYNTHETIC Plan AFTER','2099-02-01T12:00:00.000Z'])assert.ok(!JSON.stringify(view).includes(value),'private value absent');
}
async function invalidate(f:Fixture,kind:'expired'|'revoked'){
 await pool.query(kind==='expired'?"UPDATE invites SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1":'UPDATE invites SET revoked=true WHERE token_hash=$1',[digest(f.ref)]);
}
async function rename(f:Fixture){
 await social.savePlanPresentation(f.owner.id,f.id,{title:'SYNTHETIC Plan AFTER invalidation',meetingTime:null,meetingPoint:null,note:null,participantLimit:null,expectedVersion:0});
 await pool.query('UPDATE actors SET display_name=$2 WHERE id=$1',[f.owner.id,'SYNTHETIC organizer AFTER invalidation']);
}
async function approve(f:Fixture){
 await plans.requestJoin(f.guest.id,f.ref);const p=await state(f);
 await plans.command(f.owner.id,f.id,randomUUID(),{kind:'ROSTER',expectedStateVersion:p.stateVersion,slots:p.slots.map(s=>({...s,actorId:f.guest.id,state:'ACTIVE'})),rule:p.rule,decisionDeadline:p.decisionDeadline,reason:'SYNTHETIC explicit approval'},randomUUID());
}
async function remove(f:Fixture){
 const p=await state(f);
 await plans.command(f.owner.id,f.id,randomUUID(),{kind:'ROSTER',expectedStateVersion:p.stateVersion,slots:p.slots.map(s=>({...s,state:'LEFT'})),rule:p.rule,decisionDeadline:p.decisionDeadline,reason:'SYNTHETIC removal'},randomUUID());
}
async function planAccess(f:Fixture,who:Actor,expected:number){
 for(const path of ['/api/v1/plans/'+f.id,'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify({kind:'PLAN',planId:f.id}))]){
  const result=await app.inject({url:path,headers:who.headers});console.log(JSON.stringify({http:'PLAN',actor:who.id,status:result.statusCode,body:expected===200?{kind:result.json().kind??'domain Plan'}:result.json()}));assert.equal(result.statusCode,expected);
 }
}
test('WP1B valid unused token displays context and REQUESTABLE without PLAN authority',async()=>{
 const f=await fixture(),view=await read(f);assert.equal(view.state,'REQUESTABLE');assert.deepEqual(view.actions,['REQUEST_JOIN']);privateContext(view);noNavigation(view,f);
 assert.equal((await pool.query('SELECT 1 FROM join_requests WHERE plan_id=$1',[f.id])).rowCount,0);await planAccess(f,f.guest,404);
});
test('WP1B valid pending invitation retains context without PLAN authority',async()=>{
 const f=await fixture();await plans.requestJoin(f.guest.id,f.ref);const view=await read(f);assert.equal(view.state,'PENDING');assert.deepEqual(view.actions,[]);privateContext(view);noNavigation(view,f);await planAccess(f,f.guest,404);
});
for(const role of ['member','organizer'] as const)for(const validity of ['valid','expired','revoked'] as const)test(`WP1B current ${role} retains authority with ${validity} invitation`,async()=>{
 const f=await fixture();if(role==='member')await approve(f);if(validity!=='valid')await invalidate(f,validity);
 const who=role==='member'?f.guest:f.owner,view=await read(f,who);assert.equal(view.state,'ACTIVE');assert.equal(view.activePlanId,f.id);privateContext(view);await planAccess(f,who,200);
});
for(const validity of ['expired','revoked'] as const)for(const renamed of [false,true])test(`WP1B ${validity} outsider ${renamed?'after private rename':'without rename'} receives neutral context`,async()=>{
 const f=await fixture();await invalidate(f,validity);if(renamed)await rename(f);const view=await read(f);
 await planAccess(f,f.guest,404);
 for(const method of ['GET','POST'] as const){const response=await app.inject({method,url:'/api/v1/invites/'+f.ref+(method==='POST'?'/join':''),headers:f.guest.headers,...(method==='POST'?{payload:{}}:{})});console.log(JSON.stringify({http:'neutral invite / join',method,status:response.statusCode,body:response.json()}));assert.equal(response.statusCode,404);}
 neutral(view,f);
});
for(const validity of ['expired','revoked'] as const)test(`WP1B PENDING request does not outlive ${validity} invitation authority`,async()=>{
 const f=await fixture();await plans.requestJoin(f.guest.id,f.ref);await invalidate(f,validity);neutral(await read(f),f);
});
for(const phase of ['CANCELLED','CLOSED'] as const)test(`WP1B ${phase} Plan hides outsider context and preserves current authorities`,async()=>{
 const f=await fixture();await approve(f);const outsider=await actor(),p=await state(f);
 if(phase==='CANCELLED')await plans.command(f.owner.id,f.id,randomUUID(),{kind:'CANCEL',expectedStateVersion:p.stateVersion,reason:'SYNTHETIC cancellation'},randomUUID());
 // CLOSED is a supported persisted terminal phase without a public close command.
 else await pool.query("UPDATE plans SET state=jsonb_set(state,'{phase}','\"CLOSED\"'::jsonb) WHERE id=$1",[f.id]);
 const hidden=await read(f,outsider);for(const who of [f.owner,f.guest]){const view=await read(f,who);assert.equal(view.state,'ACTIVE');privateContext(view);await planAccess(f,who,200);}neutral(hidden,f);
});
for(const terminal of ['REJECTED','REMOVED'] as const)test(`WP1B ${terminal} request has no private context or renewed join authority`,async()=>{
 const f=await fixture();await plans.requestJoin(f.guest.id,f.ref);
 if(terminal==='REJECTED')await social.rejectJoin(f.owner.id,f.id,f.guest.id);else{await approve(f);await remove(f);}
 const view=await read(f);assert.equal((await plans.requestJoin(f.guest.id,f.ref)).state,terminal);await planAccess(f,f.guest,404);neutral(view,f,'REJECTED');
});
test('WP1B historical APPROVED request without ACTIVE membership is not private authority',async()=>{
 const f=await fixture();await plans.requestJoin(f.guest.id,f.ref);
 // Synthetic inconsistent legacy state: an approval record alone cannot substitute for membership.
 await pool.query("UPDATE join_requests SET state='APPROVED' WHERE plan_id=$1 AND actor_id=$2",[f.id,f.guest.id]);
 const view=await read(f);assert.equal(view.state,'REQUESTABLE');assert.deepEqual(view.actions,['REQUEST_JOIN']);assert.equal(view.context,null);noNavigation(view,f);await planAccess(f,f.guest,404);
});
test('WP1B random invitation is neutral even for an organizer of another Plan',async()=>{
 const f=await fixture(),unknown={...f,ref:randomBytes(32).toString('hex')};neutral(await read(unknown),unknown);neutral(await read(unknown,f.owner),unknown);
});
test('WP1B another authenticated actor inherits neither pending state nor membership',async()=>{
 const f=await fixture();await approve(f);const other=await actor();await invalidate(f,'revoked');const view=await read(f,other);await planAccess(f,other,404);neutral(view,f);
});
test('WP1B revocation/read overlap uses committed statement snapshot; post-commit read is neutral',async()=>{
 const f=await fixture(),writer=await pool.connect();
 try{
  await writer.query('BEGIN');await writer.query('UPDATE invites SET revoked=true WHERE token_hash=$1',[digest(f.ref)]);
  // No sleep or timing assumption: revocation is held uncommitted while the real HTTP read completes.
  const before=await read(f);assert.equal(before.state,'REQUESTABLE');privateContext(before);
  console.log(JSON.stringify({ordering:'read completed before revocation COMMIT',uncommitted:(await writer.query('SELECT revoked FROM invites WHERE token_hash=$1',[digest(f.ref)])).rows}));
  await writer.query('COMMIT');await rename(f);neutral(await read(f),f);
 }finally{await writer.query('ROLLBACK');writer.release();}
});
test('WP1B committed revocation precedes a new read and retains member control',async()=>{
 const f=await fixture();await approve(f);await invalidate(f,'revoked');await rename(f);const other=await actor(),hidden=await read(f,other);
 const member=await read(f);assert.equal(member.state,'ACTIVE');privateContext(member,true);neutral(hidden,f);
});
test('WP1B legitimate HTTP request remains pending and idempotent until explicit approval',async()=>{
 const f=await fixture();
 for(let n=0;n<2;n++){const response=await app.inject({method:'POST',url:'/api/v1/invites/'+f.ref+'/join',headers:f.guest.headers,payload:{}});assert.equal(response.statusCode,200);assert.equal(response.json().state,'PENDING');}
 assert.equal((await pool.query('SELECT 1 FROM join_requests WHERE plan_id=$1 AND actor_id=$2',[f.id,f.guest.id])).rowCount,1);
 assert.equal((await read(f)).state,'PENDING');await planAccess(f,f.guest,404);await approve(f);assert.equal((await read(f)).activePlanId,f.id);await planAccess(f,f.guest,200);
});
test('WP1B anonymous and revoked sessions cannot read even a valid invitation',async()=>{
 const f=await fixture();assert.equal((await app.inject({url:url(f.ref)})).statusCode,401);
 await pool.query('UPDATE app_sessions SET revoked=true WHERE actor_id=$1',[f.guest.id]);assert.equal((await app.inject({url:url(f.ref),headers:f.guest.headers})).statusCode,401);
});
