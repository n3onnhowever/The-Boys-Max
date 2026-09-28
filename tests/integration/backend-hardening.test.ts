import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {config} from '../../packages/platform/config.ts';
import {buildApp} from '../../apps/api/app.ts';
import {socialService} from '../../packages/persistence/social.ts';
import {syntheticCandidate} from '../catalog-fixtures.ts';
import {sign} from '../fixtures.ts';
import {envelopeFor} from '../../apps/miniapp/src/core/commands.ts';
import {wallTime} from '../../modules/integration/projections.ts';
import type {CatalogView,EventView,PlanView} from '../../apps/miniapp/src/port/contracts.ts';

const cfg=config();assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');
const {app,pool,sessions,plans,ui}=await buildApp(cfg),social=socialService(pool);
type Actor={id:string;sessionId:string;token:string;csrf:string};
async function actor():Promise<Actor>{const boot=await sessions.bootstrap(),external=BigInt('0x'+randomBytes(7).toString('hex')).toString();const s=await sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${external},"first_name":"SYNTHETIC_HARDENING"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()}),randomUUID(),undefined);const authenticated=await sessions.authenticate(s.token);return {id:s.body.actor.id,sessionId:authenticated.id,token:s.token,csrf:s.body.csrfToken};}
const subject=(a:Actor)=>({actor_id:a.id,session_id:a.sessionId});
const slot=(actorId:string|null)=>({slotId:randomUUID(),label:'SYNTHETIC slot',required:true,actorId,state:actorId?'ACTIVE' as const:'UNBOUND' as const});
async function plan(owner:Actor,members:string[]=[]){const slots=[slot(owner.id),...members.map(id=>slot(id)),slot(null)];const created=await plans.create(owner.id,randomUUID(),{title:'SYNTHETIC hardening plan',slots,rule:{kind:'ALL'},decisionDeadline:new Date(Date.now()+3600000).toISOString(),commitmentDeadline:new Date(Date.now()+7200000).toISOString()});return {id:created.planId,slots};}
const count=async(sql:string,params:unknown[])=>Number((await pool.query<{count:string}>(sql,params)).rows[0]!.count);
before(async()=>{await app.ready();});
after(async()=>{await app.close();});

test('friendship pair, direction and notification survive parallel reverse requests and retries',async()=>{
 const a=await actor(),b=await actor();
 const results=await Promise.all(Array.from({length:12},(_,i)=>social.requestFriend(i%2?a.id:b.id,i%2?b.id:a.id)));
 assert.equal(results.filter(x=>x.requested).length,1);
 const relation=await pool.query<{requester_id:string;recipient_id:string;state:string}>('SELECT requester_id,recipient_id,state FROM friendships WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)',[a.id,b.id]);
 assert.equal(relation.rowCount,1);assert.equal(relation.rows[0]!.state,'PENDING');
 const requester=relation.rows[0]!.requester_id,recipient=relation.rows[0]!.recipient_id;
 assert.equal(await count("SELECT count(*) FROM in_app_notifications WHERE actor_id=$1 AND kind='FRIEND_REQUEST' AND actor_context_id=$2",[recipient,requester]),1);
 await social.acceptFriend(recipient,requester);await social.acceptFriend(recipient,requester);
 assert.deepEqual(await social.requestFriend(requester,recipient),{requested:false,state:'ACCEPTED'});
 assert.equal((await social.friends(a.id)).items.length,1);
});

test('rejected friendship and join request are durable, repeatable outcomes',async()=>{
 const a=await actor(),b=await actor();await social.requestFriend(a.id,b.id);await social.rejectFriend(b.id,a.id);await social.rejectFriend(b.id,a.id);
 assert.deepEqual(await social.requestFriend(a.id,b.id),{requested:false,state:'REJECTED'});
 assert.equal((await social.friends(a.id)).items.length,0);
});

test('friend invite and join retries converge to one active invite, one request and one notification each',async()=>{
 const owner=await actor(),friend=await actor();await social.requestFriend(owner.id,friend.id);await social.acceptFriend(friend.id,owner.id);
 const p=await plan(owner);
 const invited=await Promise.all(Array.from({length:10},()=>plans.inviteFriend(owner.id,friend.id,p.id,1)));
 assert.equal(invited.filter(x=>x.state==='SENT').length,1);
 const ref=invited.find(x=>x.inviteRef)?.inviteRef;assert.ok(ref);
 assert.equal(await count('SELECT count(*) FROM invites WHERE plan_id=$1',[p.id]),1);
 assert.equal(await count("SELECT count(*) FROM in_app_notifications WHERE plan_id=$1 AND actor_id=$2 AND kind='PLAN_INVITE'",[p.id,friend.id]),1);
 const requests=await Promise.all(Array.from({length:10},()=>plans.requestJoin(friend.id,ref)));
 assert.ok(requests.every(x=>x.state==='PENDING'));
 assert.equal(await count('SELECT count(*) FROM join_requests WHERE plan_id=$1 AND actor_id=$2',[p.id,friend.id]),1);
 assert.equal(await count("SELECT count(*) FROM in_app_notifications WHERE plan_id=$1 AND actor_id=$2 AND kind='JOIN_REQUEST'",[p.id,owner.id]),1);
 await social.rejectJoin(owner.id,p.id,friend.id);await social.rejectJoin(owner.id,p.id,friend.id);
 assert.equal(await count("SELECT count(*) FROM in_app_notifications WHERE plan_id=$1 AND actor_id=$2 AND kind='JOIN_REJECTED'",[p.id,friend.id]),1);
 await pool.query("UPDATE invites SET expires_at=clock_timestamp()-interval '1 second' WHERE plan_id=$1",[p.id]);
 assert.equal((await social.planInviteStatuses(owner.id,p.id)).items.some(x=>x.friendId===friend.id&&x.state==='PENDING'),false);
 const renewed=await Promise.all(Array.from({length:10},()=>plans.inviteFriend(owner.id,friend.id,p.id,1)));
 assert.equal(renewed.filter(x=>x.state==='SENT').length,1);
 const newRef=renewed.find(x=>x.inviteRef)?.inviteRef;assert.ok(newRef);assert.notEqual(newRef,ref);
 assert.equal(await count("SELECT count(*) FROM invites WHERE plan_id=$1 AND NOT revoked AND expires_at>clock_timestamp()",[p.id]),1);
 assert.equal(await count("SELECT count(*) FROM in_app_notifications WHERE plan_id=$1 AND actor_id=$2 AND kind='PLAN_INVITE'",[p.id,friend.id]),1);
 assert.equal((await social.planInviteStatuses(owner.id,p.id)).items.some(x=>x.friendId===friend.id&&x.state==='PENDING'),true);
 const second=await plan(owner),sent=await plans.inviteFriend(owner.id,friend.id,second.id,1);assert.ok(sent.inviteRef);
 await plans.requestJoin(friend.id,sent.inviteRef);
 const bound=second.slots.map(s=>s.state==='UNBOUND'?{...s,actorId:friend.id,state:'ACTIVE' as const}:s);
 const approval={kind:'ROSTER' as const,expectedStateVersion:1,slots:bound,rule:{kind:'ALL' as const},decisionDeadline:(await pool.query<{state:{decisionDeadline:string}}>('SELECT state FROM plans WHERE id=$1',[second.id])).rows[0]!.state.decisionDeadline,reason:'SYNTHETIC approval'};
 const approveKey=randomUUID(),approved=await plans.command(owner.id,second.id,approveKey,approval,randomUUID());
 assert.equal(approved.status,'APPLIED');
 assert.equal((await plans.command(owner.id,second.id,approveKey,approval,randomUUID())).commandId,approved.commandId);
 assert.equal((await plans.command(owner.id,second.id,randomUUID(),approval,randomUUID())).commandId,approved.commandId);
 assert.equal((await plans.inviteFriend(owner.id,friend.id,second.id,1)).state,'PARTICIPATING');
 assert.equal((await plans.requestJoin(friend.id,sent.inviteRef)).state,'APPROVED');
 assert.equal(await count("SELECT count(*) FROM in_app_notifications WHERE plan_id=$1 AND actor_id=$2 AND kind='JOIN_APPROVED'",[second.id,friend.id]),1);
});

test('notification count is exact beyond list limit, actor scoped, and legacy context degrades honestly',async()=>{
 const a=await actor(),b=await actor();
 await pool.query("INSERT INTO in_app_notifications(id,actor_id,kind,title) SELECT gen_random_uuid(),$1,'LEGACY','SYNTHETIC legacy' FROM generate_series(1,105)",[a.id]);
 const list=await social.notifications(a.id);assert.equal(list.items.length,100);assert.equal(list.unreadCount,105);
 assert.equal(list.items[0]!.target.kind,'UNAVAILABLE');assert.equal(list.items[0]!.actorId,null);
 await social.readNotification(a.id,list.items[0]!.id);await social.readNotification(a.id,list.items[0]!.id);
 assert.equal((await social.unreadCount(a.id)).unreadCount,104);assert.equal((await social.unreadCount(b.id)).unreadCount,0);
 const response=await app.inject({url:'/api/v1/me/notifications/count',headers:{cookie:`__Host-max_session=${a.token}`}});
 assert.equal(response.statusCode,200,response.body);assert.equal(response.json().unreadCount,104);
 await assert.rejects(social.readNotification(b.id,list.items[0]!.id));
});

test('YES binds to material reconfirm version; nonmaterial edit preserves response; notification failure rolls back metadata',async()=>{
 const owner=await actor(),friend=await actor(),p=await plan(owner);
 const invite=await plans.invite(owner.id,p.id,randomUUID(),1);await plans.requestJoin(friend.id,invite.inviteRef);
 const initialState=(await pool.query<{state:{decisionDeadline:string}}>('SELECT state FROM plans WHERE id=$1',[p.id])).rows[0]!.state;
 await plans.command(owner.id,p.id,randomUUID(),{kind:'ROSTER',expectedStateVersion:1,slots:p.slots.map(s=>s.state==='UNBOUND'?{...s,actorId:friend.id,state:'ACTIVE' as const}:s),rule:{kind:'ALL'},decisionDeadline:initialState.decisionDeadline,reason:'SYNTHETIC approval'},randomUUID());
 const initial=await social.savePlanPresentation(owner.id,p.id,{title:'SYNTHETIC hardening plan',meetingTime:null,meetingPoint:null,note:'initial',participantLimit:null,expectedVersion:0});
 assert.equal(initial.reconfirmVersion,0);
 await social.setPlanRsvp(friend.id,p.id,'YES',0);
 const changed=await social.savePlanPresentation(owner.id,p.id,{title:initial.title,meetingTime:new Date(Date.now()+5400000).toISOString(),meetingPoint:'SYNTHETIC point',note:'initial',participantLimit:null,expectedVersion:initial.version});
 assert.equal(changed.reconfirmVersion,1);assert.ok(changed.changedFields.meetingTime);
 const stale=await social.planRsvps(friend.id,p.id);assert.equal(stale.currentReconfirmVersion,1);assert.equal(stale.items.find(x=>x.actorId===friend.id)?.responseRequired,true);
 await assert.rejects(social.setPlanRsvp(friend.id,p.id,'YES',0),/VERSION_CONFLICT/);
 await social.setPlanRsvp(friend.id,p.id,'YES',1);await social.setPlanRsvp(friend.id,p.id,'YES',1);
 assert.equal((await social.planRsvps(friend.id,p.id)).items.find(x=>x.actorId===friend.id)?.responseRequired,false);
 const layered=await social.savePlanPresentation(owner.id,p.id,{title:changed.title,meetingTime:changed.meetingTime,meetingPoint:changed.meetingPoint,note:'second edit',participantLimit:null,expectedVersion:changed.version});
 const unseen=await social.planPresentation(friend.id,p.id);assert.ok(unseen.changedFields.meetingTime);assert.ok(unseen.changedFields.note);assert.equal(unseen.changeHistoryComplete,true);
 await social.acknowledgePlanPresentation(friend.id,p.id,layered.version);
 const afterNote=await social.savePlanPresentation(owner.id,p.id,{title:layered.title,meetingTime:layered.meetingTime,meetingPoint:layered.meetingPoint,note:'nonmaterial',participantLimit:null,expectedVersion:layered.version});
 assert.equal(afterNote.reconfirmVersion,1);assert.equal((await social.planRsvps(friend.id,p.id)).items.find(x=>x.actorId===friend.id)?.responseRequired,false);
 await pool.query("CREATE FUNCTION hardening_block_notice() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.kind='PLAN_CHANGED' THEN RAISE EXCEPTION 'SYNTHETIC_NOTICE_FAILURE'; END IF; RETURN NEW; END;$$");
 await pool.query('CREATE TRIGGER hardening_block_notice BEFORE INSERT ON in_app_notifications FOR EACH ROW EXECUTE FUNCTION hardening_block_notice()');
 try{
  await assert.rejects(social.savePlanPresentation(owner.id,p.id,{title:afterNote.title,meetingTime:afterNote.meetingTime,meetingPoint:'SYNTHETIC changed again',note:afterNote.note,participantLimit:null,expectedVersion:afterNote.version}));
  assert.equal((await social.planPresentation(owner.id,p.id)).version,afterNote.version);
 }finally{await pool.query('DROP TRIGGER hardening_block_notice ON in_app_notifications');await pool.query('DROP FUNCTION hardening_block_notice()');}
});

test('literal Search keeps structured filters and exact Event locator survives Search and cancelled plan',async()=>{
 const a=await actor(),id='0000-hardening-'+randomUUID(),candidate=syntheticCandidate(new Date().toISOString(),id);
 await pool.query("INSERT INTO catalog_occurrences(observation_id,provider_id,event_id,occurrence_id,body,data_mode) VALUES($1,$2,$3,$4,$5,'SYNTHETIC')",[id,candidate.ref.provider_id,candidate.ref.event_id,candidate.ref.occurrence_id,candidate]);
 const scope={kind:'PERSONAL' as const},initial=await ui.read(subject(a),{kind:'CATALOG',scope}) as CatalogView;
 const found=await ui.execute(subject(a),envelopeFor(initial,{type:'SEARCH',scope,draft:{...initial.query,text:'  ПЕРСОНАЛЬНАЯ   афиша '}},randomUUID()),randomUUID());
 const result=found.view as CatalogView;assert.ok(result.events.some(x=>x.ref.observationId===id));
 const filtered=await ui.execute(subject(a),envelopeFor(result,{type:'SEARCH',scope,draft:{...result.query,includedCategories:['CINEMA']}},randomUUID()),randomUUID());
 assert.ok(!(filtered.view as CatalogView).events.some(x=>x.ref.observationId===id));
 const detail=await ui.read(subject(a),{kind:'EVENT',scope,sourceId:candidate.ref.provider_id,externalEventId:candidate.ref.event_id,occurrenceId:candidate.ref.occurrence_id}) as EventView;
 assert.equal(detail.event.ref.observationId,id);
 const command={type:'ADD_TO_PLAN' as const,eventRef:detail.event.ref,targetPlanId:null,newPlan:{title:'SYNTHETIC locator plan',participantSlots:1,organizerParticipates:true,decisionLocal:wallTime(new Date(Date.now()+3600000).toISOString(),'Europe/Moscow'),commitmentLocal:wallTime(new Date(Date.now()+7200000).toISOString(),'Europe/Moscow'),timeZone:'Europe/Moscow'},ackUnknownReasons:detail.unknownReasons};
 const added=await ui.execute(subject(a),envelopeFor(detail,command,randomUUID()),randomUUID());const planId=(added.view as PlanView).planId;
 const raw=(await pool.query<{state:{stateVersion:number;options:{snapshots:{source:{ref:{provider_id:string;event_id:string;occurrence_id:string}}}[]}[]}}>('SELECT state FROM plans WHERE id=$1',[planId])).rows[0]!.state;
 const ref=raw.options[0]!.snapshots[0]!.source.ref;
 await plans.command(a.id,planId,randomUUID(),{kind:'CANCEL',expectedStateVersion:raw.stateVersion,reason:'SYNTHETIC cancel'},randomUUID());
 assert.deepEqual((await pool.query<{state:typeof raw}>('SELECT state FROM plans WHERE id=$1',[planId])).rows[0]!.state.options[0]!.snapshots[0]!.source.ref,ref);
 const original=await ui.read(subject(a),{kind:'EVENT',scope,sourceId:ref.provider_id,externalEventId:ref.event_id,occurrenceId:ref.occurrence_id}) as EventView;
 assert.equal(original.event.ref.observationId,id);
 const savedPrefs=await social.saveSettings(a.id,{city:'Казань',interests:[],budgetRub:null,radiusKm:15,notificationsEnabled:true,preferredTime:'ANY'});
 assert.equal(savedPrefs.catalogCoverage,'UNSUPPORTED');
 assert.equal((await ui.read(subject(a),{kind:'CATALOG',scope}) as CatalogView).events.length,0);
 assert.equal((await ui.read(subject(a),{kind:'EVENT',scope,sourceId:ref.provider_id,externalEventId:ref.event_id,occurrenceId:ref.occurrence_id}) as EventView).event.ref.observationId,id);
});
