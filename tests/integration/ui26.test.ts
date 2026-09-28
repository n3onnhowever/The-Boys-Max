/** PREPARED, NOT_RUN in the package environment. Real PostgreSQL + Fastify inject, synthetic auth/data. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {config} from '../../packages/platform/config.ts';
import {buildApp} from '../../apps/api/app.ts';
import {syntheticCandidate} from '../catalog-fixtures.ts';
import {sign} from '../fixtures.ts';
import {wallTime} from '../../modules/integration/projections.ts';
import {envelopeFor} from '../../apps/miniapp/src/core/commands.ts';
import {socialService} from '../../packages/persistence/social.ts';
import type {Route,View,PlanView,CatalogView,EventView,Command,Envelope,Receipt} from '../../apps/miniapp/src/port/contracts.ts';
const cfg=config();assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');
const {app,pool,sessions}=await buildApp(cfg);
type Auth={token:string;body:{actor:{id:string};csrfToken:string}};
let a:Auth,b:Auth;
async function session():Promise<Auth>{const boot=await sessions.bootstrap(),external=BigInt('0x'+randomBytes(7).toString('hex')).toString();return sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${external},"first_name":"SYNTHETIC_UI26"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()}),randomUUID(),undefined);}
const headers=(a:Auth)=>({cookie:`__Host-max_session=${a.token}`,origin:cfg.publicOrigin,'x-csrf-token':a.body.csrfToken,'content-type':'application/json'});
async function get(a:Auth,route:Route):Promise<View>{const r=await app.inject({url:'/api/ui/v1/view?route='+encodeURIComponent(JSON.stringify(route)),headers:headers(a)});assert.equal(r.statusCode,200,r.body);return r.json();}
async function post(a:Auth,envelope:Envelope){return app.inject({method:'POST',url:'/api/ui/v1/commands',headers:headers(a),payload:envelope});}
const observation='ui26-'+randomUUID();
let seeded:ReturnType<typeof syntheticCandidate>;
before(async()=>{await app.ready();a=await session();b=await session();seeded=syntheticCandidate(new Date().toISOString(),observation);const c=seeded;await pool.query("INSERT INTO catalog_occurrences(observation_id,provider_id,event_id,occurrence_id,body,data_mode) VALUES($1,$2,$3,$4,$5,'SYNTHETIC')",[observation,c.ref.provider_id,c.ref.event_id,c.ref.occurrence_id,c]);});
after(async()=>{await app.close();});
test('UI26-01 actual API personal -> 500+30 -> explicit group -> persisted edit -> replay, no implicit membership',async()=>{
 const count=async()=>Number((await pool.query('SELECT count(*) AS n FROM plans')).rows[0]!.n),before=await count();
 const catalog=await get(a,{kind:'CATALOG',scope:{kind:'PERSONAL'}}) as CatalogView;assert.equal(await count(),before);assert.equal(catalog.kind,'CATALOG');
 const details=await get(a,{kind:'EVENT',scope:{kind:'PERSONAL'},sourceId:seeded.ref.provider_id,externalEventId:seeded.ref.event_id,occurrenceId:seeded.ref.occurrence_id}) as EventView;assert.equal(details.event.price.totalLabel,'530 ₽');
 const command:Command={type:'ADD_TO_PLAN',eventRef:details.event.ref,targetPlanId:null,newPlan:{title:'EXPLICIT SYNTHETIC GROUP',participantSlots:2,organizerParticipates:false,decisionLocal:wallTime(new Date(Date.now()+3600000).toISOString(),'Europe/Moscow'),commitmentLocal:wallTime(new Date(Date.now()+7200000).toISOString(),'Europe/Moscow'),timeZone:'Europe/Moscow'},ackUnknownReasons:details.unknownReasons};
 const envelope=envelopeFor(details,command,randomUUID());const foreign=await post(b,envelope);assert.equal(foreign.statusCode,409,foreign.body);assert.equal(await count(),before);
 const added=await post(a,envelope);assert.equal(added.statusCode,200,added.body);const receipt=added.json<Receipt>(),p=receipt.view as PlanView;assert.equal(p.kind,'PLAN');assert.equal(p.organizerParticipates,false);assert.equal(p.expectedCount,2);assert.equal(p.unboundCount,2);assert.equal(await count(),before+1);assert.equal(p.options[0]!.price.totalLabel,'530 ₽');
 const again=await post(a,envelope);assert.equal(again.statusCode,200,again.body);assert.equal(again.json<Receipt>().outcome,'REPLAYED');assert.equal(await count(),before+1);
 const raw=await app.inject({url:'/api/v1/plans/'+p.planId,headers:headers(a)});assert.equal(raw.statusCode,200,raw.body);const rv=raw.json();assert.equal(rv.options[0].terms.price.total_price.amount.exact_minor,'53000');assert.equal(rv.options[0].terms.price.base_price.amount.exact_minor,'50000');assert.equal(rv.options[0].source.ref.occurrence_id,details.event.ref.occurrenceId);assert.equal('hard' in rv.options[0].source,false);assert.deepEqual(rv.responses,[]);assert.deepEqual(rv.commitments,[]);
 const option=p.options[0]!,edit=envelopeFor(p,{type:'EDIT_OPTION',planId:p.planId,optionId:option.optionId,patch:{title:option.title,startLocal:wallTime(new Date(Date.now()+5*86400000).toISOString(),'Europe/Moscow'),timeZone:'Europe/Moscow'}},randomUUID());
 const edited=await post(a,edit);assert.equal(edited.statusCode,200,edited.body);const refreshed=await get(a,{kind:'PLAN',planId:p.planId}) as PlanView;assert.equal(refreshed.options[0]!.startLocal,(edit.command as Extract<Command,{type:'EDIT_OPTION'}>).patch.startLocal);assert.notEqual(refreshed.options[0]!.snapshotId,option.snapshotId);
 const editReplay=await post(a,edit);assert.equal(editReplay.statusCode,200,editReplay.body);assert.equal(editReplay.json<Receipt>().outcome,'REPLAYED');assert.equal((await get(a,{kind:'PLAN',planId:p.planId}) as PlanView).options[0]!.snapshotId,refreshed.options[0]!.snapshotId);
 const forbidden=await app.inject({url:'/api/v1/plans/'+p.planId,headers:headers(b)});assert.equal(forbidden.statusCode,404);
});
test('UI26-02 filter fields survive a new read and literal text search preserves structured filters',async()=>{
 const v=await get(a,{kind:'CATALOG',scope:{kind:'PERSONAL'}}) as CatalogView;
 const good=envelopeFor(v,{type:'SEARCH',scope:{kind:'PERSONAL'},draft:{...v.query,participants:'4',excludeCategories:['CINEMA']}},randomUUID());const saved=await post(a,good);assert.equal(saved.statusCode,200,saved.body);
 const fresh=await get(a,{kind:'CATALOG',scope:{kind:'PERSONAL'}}) as CatalogView;assert.equal(fresh.query.participants,'4');assert.deepEqual(fresh.query.excludeCategories,['CINEMA']);
 const search=envelopeFor(fresh,{type:'SEARCH',scope:{kind:'PERSONAL'},draft:{...fresh.query,text:'without cinema'}},randomUUID());const found=await post(a,search);assert.equal(found.statusCode,200,found.body);
 const next=await get(a,{kind:'CATALOG',scope:{kind:'PERSONAL'}}) as CatalogView;
 assert.equal(next.query.text,'without cinema');assert.equal(next.query.participants,'4');assert.deepEqual(next.query.excludeCategories,['CINEMA']);assert.deepEqual(next.events,[]);
});
test('catalog finds a matching occurrence after 100 earlier nonmatching rows and opens detail',async()=>{
 const scope={kind:'PERSONAL' as const}, prefix='catalog-limit-'+randomUUID();
 const observed=new Date().toISOString();
 for(let i=0;i<101;i++){
  const id=prefix+'-'+String(i).padStart(3,'0');
  const candidate=structuredClone(syntheticCandidate(observed,id));
  candidate.starts_at='2030-05-05T10:00:00.000Z';candidate.ends_at='2030-05-05T12:00:00.000Z';
  candidate.categories.known=i===100?['THEATRE']:['CINEMA'];
  await pool.query("INSERT INTO catalog_occurrences(observation_id,provider_id,event_id,occurrence_id,body,data_mode) VALUES($1,$2,$3,$4,$5,'SYNTHETIC')",[id,candidate.ref.provider_id,candidate.ref.event_id,candidate.ref.occurrence_id,candidate]);
 }
 const initial=await get(b,{kind:'CATALOG',scope}) as CatalogView;
 const searched=await post(b,envelopeFor(initial,{type:'SEARCH',scope,draft:{...initial.query,includedCategories:['THEATRE']}},randomUUID()));
 assert.equal(searched.statusCode,200,searched.body);
 const catalog=searched.json<Receipt>().view as CatalogView;
 const match=catalog.events.find(e=>e.ref.observationId===prefix+'-100');
 assert.ok(match,'matching occurrence beyond first 100 rows must be returned');
 const detail=await get(b,{kind:'EVENT',scope,sourceId:match.ref.sourceId,externalEventId:match.ref.externalEventId,occurrenceId:match.ref.occurrenceId}) as EventView;
 assert.equal(detail.event.ref.observationId,match.ref.observationId);
});
test('known occurrence detail remains available behind an incompatible Search filter',async()=>{
 const actor=await session(),scope={kind:'PERSONAL' as const};
 const initial=await get(actor,{kind:'CATALOG',scope}) as CatalogView;
 const filtered=await post(actor,envelopeFor(initial,{type:'SEARCH',scope,draft:{...initial.query,includedCategories:['CINEMA']}},randomUUID()));
 assert.equal(filtered.statusCode,200,filtered.body);
 assert.ok(!(filtered.json<Receipt>().view as CatalogView).events.some(e=>e.ref.observationId===observation));
 const detail=await get(actor,{kind:'EVENT',scope,sourceId:seeded.ref.provider_id,externalEventId:seeded.ref.event_id,occurrenceId:seeded.ref.occurrence_id}) as EventView;
 assert.equal(detail.event.ref.observationId,observation);
});
test('exact occurrence creates one plan behind unrelated category and budget filters without changing Search',async()=>{
 const actor=await session(),scope={kind:'PERSONAL' as const};
 const initial=await get(actor,{kind:'CATALOG',scope}) as CatalogView;
 const draft={...initial.query,includedCategories:['CINEMA'],budgetText:'1000',priceBasis:'PER_PERSON' as const};
 const filtered=await post(actor,envelopeFor(initial,{type:'SEARCH',scope,draft},randomUUID()));
 assert.equal(filtered.statusCode,200,filtered.body);
 const detail=await get(actor,{kind:'EVENT',scope,sourceId:seeded.ref.provider_id,externalEventId:seeded.ref.event_id,occurrenceId:seeded.ref.occurrence_id}) as EventView;
 assert.equal(detail.event.ref.observationId,observation);
 const before=Number((await pool.query<{count:string}>('SELECT count(*) FROM plans WHERE organizer_id=$1',[actor.body.actor.id])).rows[0]!.count);
 const command:Command={type:'ADD_TO_PLAN',eventRef:detail.event.ref,targetPlanId:null,newPlan:{title:'SYNTHETIC FILTER-INDEPENDENT PLAN',participantSlots:1,organizerParticipates:true,decisionLocal:wallTime(new Date(Date.now()+3600000).toISOString(),'Europe/Moscow'),commitmentLocal:wallTime(new Date(Date.now()+7200000).toISOString(),'Europe/Moscow'),timeZone:'Europe/Moscow'},ackUnknownReasons:detail.unknownReasons};
 const envelope=envelopeFor(detail,command,randomUUID());
 const added=await post(actor,envelope);assert.equal(added.statusCode,200,added.body);
 assert.equal(added.json<Receipt>().outcome,'APPLIED');
 const replay=await post(actor,envelope);assert.equal(replay.statusCode,200,replay.body);assert.equal(replay.json<Receipt>().outcome,'REPLAYED');
 assert.equal(Number((await pool.query<{count:string}>('SELECT count(*) FROM plans WHERE organizer_id=$1',[actor.body.actor.id])).rows[0]!.count),before+1);
 const after=await get(actor,{kind:'CATALOG',scope}) as CatalogView;
 assert.deepEqual(after.query,draft);
});
test('friendship has one persisted state per unordered actor pair',async()=>{
 const left=await session(),right=await session(),social=socialService(pool);
 assert.deepEqual(await social.requestFriend(left.body.actor.id,right.body.actor.id),{requested:true,state:'PENDING'});
 assert.deepEqual(await social.requestFriend(right.body.actor.id,left.body.actor.id),{requested:false,state:'PENDING'});
 await social.acceptFriend(right.body.actor.id,left.body.actor.id);
 assert.deepEqual(await social.requestFriend(right.body.actor.id,left.body.actor.id),{requested:false,state:'ACCEPTED'});
 const rows=await pool.query<{state:string}>(`SELECT state FROM friendships WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)`,[left.body.actor.id,right.body.actor.id]);
 assert.deepEqual(rows.rows.map(x=>x.state),['ACCEPTED']);
 await assert.rejects(pool.query(`INSERT INTO friendships(requester_id,recipient_id,state) VALUES($1,$2,'PENDING')`,[right.body.actor.id,left.body.actor.id]));
});

test('visible budget results require a verified payable total within the cap',async()=>{
 const actor=await session(),scope={kind:'PERSONAL' as const};
 const initial=await get(actor,{kind:'CATALOG',scope}) as CatalogView;
 const low=await post(actor,envelopeFor(initial,{type:'SEARCH',scope,draft:{...initial.query,includedCategories:['THEATRE'],budgetText:'500',priceBasis:'PER_PERSON'}},randomUUID()));
 assert.equal(low.statusCode,200,low.body);
 const lowView=low.json<Receipt>().view as CatalogView;
 assert.ok(!lowView.events.some(e=>e.ref.observationId===observation),'530 RUB payable total must not match a 500 RUB chip');
 const high=await post(actor,envelopeFor(lowView,{type:'SEARCH',scope,draft:{...lowView.query,budgetText:'600',priceBasis:'PER_PERSON'}},randomUUID()));
 assert.equal(high.statusCode,200,high.body);
 const highView=high.json<Receipt>().view as CatalogView;
 assert.ok(highView.events.some(e=>e.ref.observationId===observation),'verified 530 RUB total must match a 600 RUB chip');
});
