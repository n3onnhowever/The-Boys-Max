import type {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {transaction} from './sessions.ts';
import {catalogService} from './catalog.ts';
import type {CatalogItem,CatalogResult} from './catalog.ts';
import type {planService} from './plans.ts';
import type {Config} from '../platform/config.ts';
import {digest} from '../platform/auth.ts';
import {launchLink} from '../platform/links.ts';
import {canonical} from '../../modules/search/core/guard.ts';
import {context,geoView,priceView,wallTime,uniqueInstant} from '../../modules/integration/projections.ts';
import {preparePlace} from '../../modules/maps/component/core/geo.ts';
import type {Subject} from '../../modules/search/core/types.ts';
import type {Plan,Command as DomainCommand} from '../contracts/domain.ts';
import {assertRead,current,activeSlot,capabilities,feasibility,confirmation} from '../domain/plan.ts';
import {requireCanonicalPlan} from '../domain/price-upgrade.ts';
import {requireThat} from '../domain/errors.ts';
import {CONTRACT} from '../../apps/miniapp/src/port/contracts.ts';
import {DEMO_NOTICE,DEMO_PROVIDER_ID,demoSourceUrl,DEMO_ITEMS} from '../demo/catalog-v1.ts';
import type {View,Route,Envelope,Receipt,Revision,EventCardView,PlaceView,PlanView,OptionView} from '../../apps/miniapp/src/port/contracts.ts';
type Plans=ReturnType<typeof planService>;
type Mapped={kind:'PLAN';planId:string;command:DomainCommand}|{kind:'INVITE';planId:string;expected:number}|{kind:'JOIN';inviteRef:string};
const emptyPlace=(address:string|null):PlaceView=>({address:address??'Место пока не указано',coordinates:null,navigationUrl:null,attribution:null});
const CATEGORY_LABELS:Record<string,string>={CINEMA:'Кино',THEATRE:'Театр',CONCERT:'Концерт',MUSEUM:'Музеи и выставки',SPORT:'Спорт',OUTDOOR:'На воздухе',VOLUNTEER:'Волонтёрство',OTHER:'Другое'};
function eventTime(value:string,timeZone:string):string {
 return new Intl.DateTimeFormat('ru-RU',{timeZone,day:'numeric',month:'short',weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
}
function observationTime(value:string):string {
 const instant=new Date(value);
 return Number.isNaN(instant.getTime())?'Дата обновления не указана':`Обновлено ${new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short'}).format(instant)}`;
}
export function revision(p:Plan|null,contextRevision:number|null=null):Revision {
 const selected=p?.options.find(o=>o.optionId===p.selectedOptionId),s=selected?current(selected):null;
 return {state_version:p?.stateVersion??contextRevision??1,search_context_revision:contextRevision,config_revision:p?.configRevision??contextRevision??1,electorate_version:p?.electorateVersion??0,selection_revision:p?.selectionRevision??0,snapshot_id:s?.snapshotId??null,terms_revision:s?.termsRevision??null};
}
export function eventCard(item:CatalogItem,now:string,demoOrigin?:string):EventCardView {
 const c=item.candidate,g=geoView(c,context(now)),prepared=preparePlace(g);
 const demoItem=demoOrigin&&c.ref.provider_id===DEMO_PROVIDER_ID?DEMO_ITEMS.find(x=>`demo-v1-${x.id}`===c.ref.event_id):undefined;
 return {ref:{offerId:item.offerId,contextRevision:item.contextRevision,sourceId:c.ref.provider_id,externalEventId:c.ref.event_id,occurrenceId:c.ref.occurrence_id,observationId:c.provenance.observation_id},
  title:c.untrusted_title,startLabel:c.starts_at?eventTime(c.starts_at,c.city_id?context(now).cities.get(c.city_id)?.timezones[0]??'UTC':'UTC'):'Время не подтверждено',
  categoryLabel:c.categories.known.map(category=>CATEGORY_LABELS[category]??'Категория уточняется').join(', ')||'Категория не подтверждена',price:priceView(c.price),
  place:{address:g.geo.address??'Место уточняется',coordinates:prepared.marker,navigationUrl:null,attribution:c.provenance.data_mode==='SYNTHETIC'?'Демо-каталог':c.ref.provider_id==='ManualProvider'?'Официальный источник':c.ref.provider_id,geoView:g},
  sourceLabel:demoItem?'Демо-каталог':c.provenance.data_mode==='SYNTHETIC'?'Подготовленный пример':c.ref.provider_id==='ManualProvider'?'Официальный источник':c.ref.provider_id,sourceUrl:demoItem?demoSourceUrl(demoOrigin!,demoItem):c.provenance.source_url,
  freshnessLabel:observationTime(c.provenance.observed_at),eligibilityLabel:item.eligibility.status==='PASS'?'Подходит по проверенным условиям':`Не всё подтверждено: ${item.eligibility.checks.filter(x=>x.status==='UNKNOWN').map(x=>x.reason).join(', ')}`,description:c.untrusted_description};
}
export function uiService(pool:Pool,plans:Plans,cfg:Config){
 const catalog=catalogService(pool,cfg.mode);
 async function readPlan(actor:string,id:string):Promise<Plan>{const r=await pool.query<{state:Plan}>('SELECT state FROM plans WHERE id=$1',[id]);requireThat(r.rows[0],'NOT_FOUND',404);assertRead(r.rows[0].state,actor);requireCanonicalPlan(r.rows[0].state);return r.rows[0].state;}
 async function planView(actor:string,p:Plan,inviteUrl:string|null=null):Promise<PlanView>{
  const cap=capabilities(p,actor),slot=activeSlot(p,actor),now=new Date().toISOString();
  const options:OptionView[]=p.options.map((o):OptionView=>{
   const s=current(o),aggregate={CAN:0,CANNOT:0,UNKNOWN:0,MISSING:0,STALE:0};
   const answer=(actorId:string|null,slotId:string,state:string):OptionView['selfAnswer']=>{
    if(state!=='ACTIVE'||actorId===null)return 'MISSING';const r=p.responses.findLast(r=>r.actorId===actorId&&r.slotId===slotId&&r.optionId===o.optionId);
    return !r?'MISSING':r.termsRevision!==s.termsRevision?'STALE':r.value;
   };
   for(const row of p.slots)aggregate[answer(row.actorId,row.slotId,row.state)]++;
   const f=feasibility(p,o);return {optionId:o.optionId,snapshotId:s.snapshotId,termsRevision:s.termsRevision,presentationRevision:s.presentationRevision,title:s.terms.title,
    startLabel:s.terms.startsAt?wallTime(s.terms.startsAt,s.terms.timeZone)+' '+s.terms.timeZone:'Время неизвестно',startLocal:s.terms.startsAt?wallTime(s.terms.startsAt,s.terms.timeZone):'',timeZone:s.terms.timeZone,
    price:priceView(s.terms.price),place:emptyPlace(s.terms.place),description:[s.terms.obligations,...s.terms.warnings].filter(Boolean).join('\n'),eligibility:f.status,eligibilityMessage:f.status==='READY'?'Условия полны; порог ответов достигнут':f.status==='BLOCKED'?'Условие состава не выполнено':'Это предварительный вариант',aggregate,selfAnswer:slot?answer(actor,slot.slotId,'ACTIVE'):'MISSING'};
  });
  let organizer:PlanView['organizer']=null;
  if(cap.canManage){
   const joins=await pool.query<{actor_id:string;display_name:string;state:string}>("SELECT j.actor_id,a.display_name,j.state FROM join_requests j JOIN actors a ON a.id=j.actor_id WHERE j.plan_id=$1 AND j.state IN ('PENDING','APPROVED')",[p.planId]);
   organizer={slots:p.slots.map(s=>({slotId:s.slotId,label:s.label,required:s.required,boundActorId:s.state==='ACTIVE'?s.actorId:null})),joinRequests:joins.rows.map(r=>({requestId:r.actor_id,actorId:r.actor_id,displayName:r.display_name,state:r.state==='PENDING'?'PENDING':'ACTIVE'})),
    responseRows:p.slots.flatMap(s=>p.options.map(o=>{const r=p.responses.findLast(r=>r.actorId===s.actorId&&r.slotId===s.slotId&&r.optionId===o.optionId);return {displayName:s.label,optionId:o.optionId,value:s.state!=='ACTIVE'||!r?'MISSING' as const:r.termsRevision!==current(o).termsRevision?'STALE' as const:r.value};}))};
  }
  const commit=p.commitments.findLast(c=>c.actorId===actor&&c.slotId===slot?.slotId);
  const selfCommitment:PlanView['selfCommitment']=!slot?'NOT_PARTICIPATING':!commit?'MISSING':commit.selectionRevision!==p.selectionRevision?'STALE':commit.value;
  const actions:PlanView['actions']=[];
  if(!['CLOSED','CANCELLED'].includes(p.phase)){
   if(cap.canManage){actions.push('CREATE_INVITE','EDIT_OPTION','APPROVE_JOIN');if(p.phase==='DRAFT')actions.push('START_COLLECTION');if(p.phase==='COLLECTING')actions.push('SELECT_OPTION');}
   if(cap.canRespond&&p.phase==='COLLECTING')actions.push('SAVE_ANSWER');if(cap.canRespond&&p.phase==='SELECTED')actions.push('CONFIRM_SELECTED');
  }
  return {contract:CONTRACT,actorId:actor,route:{kind:'PLAN',planId:p.planId},kind:'PLAN',actions,revision:revision(p),notice:'План не является покупкой или бронированием.',planId:p.planId,title:p.title,phase:p.phase,
   role:cap.canManage?'ORGANIZER':'PARTICIPANT',organizerParticipates:!!activeSlot(p,p.organizerId),organizer,options,selectedOptionId:p.selectedOptionId,ruleLabel:p.rule.kind==='ALL'?'Все места состава':`Не менее ${p.rule.n}`,resultLabel:confirmation(p,now),decisionMessage:`Выбор до ${p.decisionDeadline}; подтверждение до ${p.commitmentDeadline}`,expectedCount:p.slots.length,unboundCount:p.slots.filter(s=>s.state!=='ACTIVE').length,selfCommitment,inviteUrl};
 }
 async function read(subject:Subject,route:Route):Promise<View>{
  if(route.kind==='PLAN')return planView(subject.actor_id,await readPlan(subject.actor_id,route.planId));
  if(route.kind==='INVITE'){
   const r=await pool.query<{plan_id:string;state:string|null;valid:boolean;active:boolean}>(`SELECT i.plan_id,j.state,NOT i.revoked AND i.expires_at>clock_timestamp() AND p.state->>'phase' NOT IN ('CANCELLED','CLOSED') AS valid,
    p.organizer_id=$2 OR EXISTS(SELECT 1 FROM plan_slots s WHERE s.plan_id=p.id AND s.actor_id=$2 AND s.state='ACTIVE') AS active
    FROM invites i JOIN plans p ON p.id=i.plan_id LEFT JOIN join_requests j ON j.plan_id=i.plan_id AND j.actor_id=$2 WHERE i.token_hash=$1`,[digest(route.inviteRef),subject.actor_id]);
   const row=r.rows[0],state=row?.active?'ACTIVE':!row?.valid?'EXPIRED':row.state==='PENDING'?'PENDING':row.state==='REJECTED'||row.state==='REMOVED'?'REJECTED':'REQUESTABLE';
   return {contract:CONTRACT,actorId:subject.actor_id,kind:'INVITE',route,actions:state==='REQUESTABLE'?['REQUEST_JOIN']:[],revision:null,notice:null,state,inviteRef:route.inviteRef,activePlanId:state==='ACTIVE'?row!.plan_id:null};
  }
  const b=await catalog.browse(subject,route.scope,route.kind==='EVENT'?{sourceId:route.sourceId,eventId:route.externalEventId,occurrenceId:route.occurrenceId}:undefined),base={contract:CONTRACT,actorId:subject.actor_id,route,revision:revision(b.plan,b.ctx.revision),notice:cfg.mode==='demo'?DEMO_NOTICE:cfg.mode==='hybrid'?'Сначала — проверенные реальные записи. При нехватке подходящих событий показаны помеченные демо-примеры.':cfg.mode==='test'?'Тестовый режим: подготовленные примеры, не работающая интеграция афиши.':'Показываются только допущенные источники; список может быть пустым.'};
  if(route.kind==='EVENT'){
   const item=b.items.find(i=>i.candidate.ref.provider_id===route.sourceId&&i.candidate.ref.event_id===route.externalEventId&&i.candidate.ref.occurrence_id===route.occurrenceId);requireThat(item,'EVENT_UNAVAILABLE_OR_STALE',409);
   return {...base,kind:'EVENT',actions:['ADD_TO_PLAN'],event:eventCard(item,b.now,['demo','hybrid'].includes(cfg.mode)?cfg.publicOrigin:undefined),targetPlanId:route.scope.kind==='PLAN'?route.scope.planId:null,unknownReasons:[...new Set(item.eligibility.checks.filter(c=>c.status==='UNKNOWN').map(c=>c.reason))].sort()};
  }
  const labels=Object.entries(b.ctx.hard).filter(([,value])=>value!==null&&(!Array.isArray(value)||value.length>0)).map(([key,value])=>key+': '+JSON.stringify(value));
  return {...base,kind:'CATALOG',actions:['SEARCH'],query:b.ctx.draft,approvedFilterLabels:labels,events:b.items.map(i=>eventCard(i,b.now,['demo','hybrid'].includes(cfg.mode)?cfg.publicOrigin:undefined)),aiState:'UNAVAILABLE',aiMessage:'ИИ и внешние модели отключены: допуск не подтверждён. Используйте поля условий; произвольный текст не будет молча проигнорирован.'};
 }
 async function mapped(subject:Subject,envelope:Envelope):Promise<Mapped>{
  const hash=digest(canonical(envelope)),actor=subject.actor_id,key=envelope.idempotencyKey;
  return transaction(pool,async db=>{
   await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['UI_MAP:'+actor+':'+key]);
   const old=await db.query<{payload_hash:string;mapped:Mapped}>('SELECT payload_hash,mapped FROM ui_mapped_commands WHERE actor_id=$1 AND key=$2',[actor,key]);
   if(old.rows[0]){requireThat(old.rows[0].payload_hash===hash,'IDEMPOTENCY_CONFLICT',409);return old.rows[0].mapped;}
   const c=envelope.command;let result:Mapped;
   if(c.type==='REQUEST_JOIN')result={kind:'JOIN',inviteRef:c.inviteRef};
   else {
    requireThat('planId' in c,'UNSUPPORTED_UI_COMMAND',422);
    const p=await readPlan(actor,c.planId),expected=envelope.expected;requireThat(expected&&p.stateVersion===expected.state_version,'VERSION_CONFLICT',409);
    if(c.type==='CREATE_INVITE')result={kind:'INVITE',planId:p.planId,expected:expected.state_version};
    else {
     let command:DomainCommand;const rev={expectedStateVersion:expected.state_version};
     const option=()=>{requireThat('optionId' in c,'OPTION_REQUIRED',422);const o=p.options.find(o=>o.optionId===c.optionId);requireThat(o,'OPTION_NOT_FOUND',404);const s=current(o);requireThat(s.snapshotId===expected.snapshot_id&&s.termsRevision===expected.terms_revision,'TERMS_STALE',409);return {o,s};};
     switch(c.type){
      case 'START_COLLECTION':command={kind:'START',...rev};break;
      case 'SAVE_ANSWER':{const {o,s}=option();command={kind:'RESPOND',...rev,optionId:o.optionId,termsRevision:s.termsRevision,value:c.value};break;}
      case 'SELECT_OPTION':option();command={kind:'SELECT',...rev,optionId:c.optionId,allowProvisional:!!c.provisionalReason,reason:c.provisionalReason??''};break;
      case 'CONFIRM_SELECTED':{
       const o=p.options.find(o=>o.optionId===p.selectedOptionId);requireThat(o&&current(o).snapshotId===expected.snapshot_id&&p.selectionRevision===expected.selection_revision,'SELECTION_STALE',409);
       command={kind:'COMMIT',...rev,selectionRevision:expected.selection_revision,value:c.value};break;}
      case 'EDIT_OPTION':{
       const {o,s}=option(),start=uniqueInstant(c.patch.startLocal,c.patch.timeZone);
       const duration=s.terms.startsAt&&s.terms.endsAt?Date.parse(s.terms.endsAt)-Date.parse(s.terms.startsAt):null;
       command={kind:'EDIT_OPTION',...rev,optionId:o.optionId,snapshotId:randomUUID(),terms:{...structuredClone(s.terms),title:c.patch.title,startsAt:start,endsAt:duration===null?null:new Date(Date.parse(start)+duration).toISOString(),timeZone:c.patch.timeZone},cosmetic:false,reason:'Явное изменение времени/названия; известная продолжительность сохранена'};break;}
      case 'APPROVE_JOIN':{
       requireThat(p.organizerId===actor&&c.requestId===c.actorId,'FORBIDDEN',403);
       const slot=p.slots.find(s=>s.slotId===c.slotId);requireThat(slot&&slot.state==='UNBOUND'&&slot.actorId===null,'SLOT_NOT_AVAILABLE',409);
       command={kind:'ROSTER',...rev,slots:p.slots.map(s=>s.slotId===c.slotId?{...s,actorId:c.actorId,state:'ACTIVE' as const}:s),rule:p.rule,decisionDeadline:p.decisionDeadline,reason:'Явное связывание заявки с выбранным свободным местом'};break;}
      default:throw new Error('UNSUPPORTED_UI_COMMAND');
     }
     result={kind:'PLAN',planId:p.planId,command};
    }
   }
   await db.query('INSERT INTO ui_mapped_commands(actor_id,key,payload_hash,mapped) VALUES($1,$2,$3,$4)',[actor,key,hash,result]);return result;
  });
 }
 return {read,
 async execute(subject:Subject,envelope:Envelope,requestId:string):Promise<Receipt>{
  const c=envelope.command,key=envelope.idempotencyKey;let route:Route,outcome:Receipt['outcome']='APPLIED',inviteUrl:string|null=null;
  if(c.type==='SEARCH'){
   const r=await catalog.search(subject,c.scope,c.draft,key,envelope.expected?.search_context_revision??null);route={kind:'CATALOG',scope:c.scope};outcome=r.outcome;
  }else if(c.type==='ADD_TO_PLAN'){
   const r=await catalog.add(subject,key,c.eventRef,c.targetPlanId,c.newPlan,c.ackUnknownReasons,envelope.expected,requestId);route={kind:'PLAN',planId:r.planId};outcome=r.outcome;
  }else{
   requireThat(c.type!=='CREATE_OWNED_OPTION','OWNED_OPTION_UI_NOT_IMPLEMENTED',422);
   const m=await mapped(subject,envelope);
   const previous=await pool.query<{result_route:Route|null}>('SELECT result_route FROM ui_mapped_commands WHERE actor_id=$1 AND key=$2',[subject.actor_id,key]);
   if(previous.rows[0]?.result_route){route=previous.rows[0].result_route;outcome='REPLAYED';}
   else if(m.kind==='JOIN'){await plans.requestJoin(subject.actor_id,m.inviteRef);route={kind:'INVITE',inviteRef:m.inviteRef};}
   else if(m.kind==='INVITE'){
    const r=await plans.invite(subject.actor_id,m.planId,key,m.expected);inviteUrl=launchLink({kind:'INVITE',inviteRef:r.inviteRef},cfg);route={kind:'PLAN',planId:m.planId};
   }else {await plans.command(subject.actor_id,m.planId,key,m.command,requestId);route={kind:'PLAN',planId:m.planId};}
   await pool.query('UPDATE ui_mapped_commands SET result_route=$3 WHERE actor_id=$1 AND key=$2',[subject.actor_id,key,route]);
   // Regenerate an existing invite receipt without creating another token; expiry and ACL are rechecked.
   if(m.kind==='INVITE'&&inviteUrl===null){const r=await plans.invite(subject.actor_id,m.planId,key,m.expected);inviteUrl=launchLink({kind:'INVITE',inviteRef:r.inviteRef},cfg);}
  }
  const result=await read(subject,route);if(result.kind==='PLAN')result.inviteUrl=inviteUrl;
  return {idempotencyKey:key,outcome,view:result};
 }};
}
