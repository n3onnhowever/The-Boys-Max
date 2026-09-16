import {parsePrice} from '../../modules/search/core/price.ts';
import {requireThat} from './errors.ts';
import {CONTRACT_VERSION} from '../contracts/domain.ts';
import type {Plan,Terms,Slot,Rule,Option,Snapshot,Command,Price} from '../contracts/domain.ts';
export function current(option:Option):Snapshot { const s=option.snapshots.at(-1); requireThat(s,'SNAPSHOT_MISSING');return s; }
export function activeSlot(p:Plan,actor:string) { return p.slots.find(s=>s.actorId===actor && s.state==='ACTIVE'); }
export function capabilities(p:Plan,actor:string) {
 const organizer=p.organizerId===actor, participant=!!activeSlot(p,actor);
 return {canRead:organizer||participant,canPropose:organizer||participant,canManage:organizer,canRespond:participant};
}
export function assertRead(p:Plan,actor:string) { requireThat(capabilities(p,actor).canRead,'NOT_FOUND',404); }
export function assertCommandAccess(p:Plan,actor:string,c:Command) {
 assertRead(p,actor);
 requireThat(c.kind==='RESPOND'||c.kind==='COMMIT'?!!activeSlot(p,actor):c.kind==='ADD_OPTION'?capabilities(p,actor).canPropose:p.organizerId===actor,'FORBIDDEN',403);
}
export function validateRoster(slots:Slot[],rule:Rule) {
 requireThat(slots.length>0 && slots.length<=50,'ROSTER_SIZE');
 requireThat(new Set(slots.map(s=>s.slotId)).size===slots.length,'DUPLICATE_SLOT');
 const actors=slots.filter(s=>s.state==='ACTIVE').map(s=>s.actorId);
 requireThat(actors.every(Boolean)&&new Set(actors).size===actors.length,'SLOT_ACTOR_CONFLICT');
 requireThat(slots.every(s=>s.state!=='UNBOUND'||s.actorId===null),'UNBOUND_ACTOR');
 const n=rule.kind==='ALL'?slots.length:rule.n;
 requireThat(Number.isInteger(n)&&n>=1&&n<=slots.length&&n>=slots.filter(s=>s.required).length,'RULE_INVALID');
}
/** Owner19 is the only canonical price validator and arithmetic authority. */
export function validatePrice(p:Price) {
 try {parsePrice(p);} catch {requireThat(false,'PRICE_INVALID');}
}
export function validateTerms(t:Terms) {
 requireThat(typeof t.title==='string'&&t.title.trim().length>0&&t.title.length<=160,'TITLE');
 requireThat(typeof t.activityIdentity==='string'&&t.activityIdentity.trim().length>0,'ACTIVITY');
 try {new Intl.DateTimeFormat('ru',{timeZone:t.timeZone}).format();} catch {requireThat(false,'TIME_ZONE');}
 for(const date of [t.startsAt,t.endsAt]) if(date!==null) requireThat(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString()===date.replace(/(?<!\.\d{3})Z$/,'.000Z'),'UTC_INSTANT');
 if(t.endsAt!==null) requireThat(t.startsAt!==null&&Date.parse(t.endsAt)>Date.parse(t.startsAt),'TIME_ORDER');
 if(t.participationUrl!==null) { let u:URL;try {u=new URL(t.participationUrl);}catch{requireThat(false,'PARTICIPATION_URL');}
  requireThat(u!.protocol==='https:'&&!u!.username&&!u!.password,'PARTICIPATION_URL'); }
 validatePrice(t.price);
}
export function complete(t:Terms) {
 return !!t.startsAt && !!t.endsAt && !!t.place?.trim()
   && t.price.total_price.knownness==='KNOWN' && t.price.total_price.basis!=='UNKNOWN';
}
export function feasibility(p:Plan,option:Option) {
 const s=current(option);const values=p.slots.map(slot=>{
  if(slot.state!=='ACTIVE') return 'MISSING';
  const r=p.responses.findLast(r=>r.actorId===slot.actorId&&r.slotId===slot.slotId&&r.optionId===option.optionId);
  return !r?'MISSING':r.termsRevision!==s.termsRevision?'STALE':r.value;
 });
 const n=p.rule.kind==='ALL'?p.slots.length:p.rule.n;
 const can=values.filter(v=>v==='CAN').length, unresolved=values.filter(v=>['UNKNOWN','MISSING','STALE'].includes(v)).length;
 const required=p.slots.map((s,i)=>s.required?values[i]:null).filter(v=>v!==null);
 const status:'READY'|'PROVISIONAL'|'BLOCKED'=required.includes('CANNOT')||can+unresolved<n?'BLOCKED':complete(s.terms)&&can>=n&&required.every(v=>v==='CAN')?'READY':'PROVISIONAL';
 return {status,can,unresolved,n};
}
export function confirmation(p:Plan,now:string) {
 const option=p.options.find(o=>o.optionId===p.selectedOptionId);
 if(!option)return 'AWAITING_SELECTION';if(!complete(current(option).terms))return 'TERMS_INCOMPLETE';
 const values=p.slots.map(s=>s.state==='ACTIVE'?p.commitments.findLast(c=>c.actorId===s.actorId&&c.slotId===s.slotId&&c.selectionRevision===p.selectionRevision)?.value:undefined);
 const n=p.rule.kind==='ALL'?p.slots.length:p.rule.n, count=values.filter(v=>v==='CONFIRMED').length;
 if(count>=n&&p.slots.every((s,i)=>!s.required||values[i]==='CONFIRMED'))return 'CONFIRMED';
 if(p.slots.some((s,i)=>s.required&&values[i]==='DECLINED')||values.filter(v=>v!=='DECLINED').length<n)return 'AT_RISK';
 return Date.parse(now)>=Date.parse(p.commitmentDeadline)?'NOT_CONFIRMED':'AWAITING_CONFIRMATIONS';
}
export function createPlan(planId:string,actor:string,title:string,slots:Slot[],rule:Rule,decisionDeadline:string,commitmentDeadline:string,now:string):Plan {
 validateRoster(slots,rule);
 // Creation cannot bind other actors; a MAX chat or a caller-supplied UUID is not membership.
 requireThat(slots.every(s=>s.state==='UNBOUND'||s.state==='ACTIVE'&&s.actorId===actor),'JOIN_APPROVAL_REQUIRED',403);
 requireThat(Date.parse(decisionDeadline)>Date.parse(now)&&Date.parse(commitmentDeadline)>Date.parse(decisionDeadline),'DEADLINE');
 return {version:CONTRACT_VERSION,planId,organizerId:actor,title,stateVersion:1,configRevision:1,electorateVersion:0,selectionRevision:0,phase:'DRAFT',slots,rule,options:[],responses:[],commitments:[],selectedOptionId:null,decisionDeadline,commitmentDeadline};
}
export function apply(p:Plan,actor:string,c:Command,now:string):Plan {
 assertCommandAccess(p,actor,c);requireThat(p.stateVersion===c.expectedStateVersion,'VERSION_CONFLICT',409);
 requireThat(!['CLOSED','CANCELLED'].includes(p.phase),'TERMINAL',409);
 const q=structuredClone(p);
 const positive=(deadline:string)=>requireThat(Date.parse(now)<Date.parse(deadline),'DEADLINE_PASSED',409);
 const option=(id:string)=>{const o=q.options.find(o=>o.optionId===id);requireThat(o,'OPTION_NOT_FOUND',404);return o;};
 switch(c.kind){
 case 'ADD_OPTION':
  requireThat(q.phase!=='SELECTED'&&q.options.length<5,'OPTION_LIMIT_OR_PHASE');validateTerms(c.terms);
  requireThat(!q.options.some(o=>o.optionId===c.optionId),'OPTION_EXISTS',409);
  requireThat(!q.options.flatMap(o=>o.snapshots).some(s=>s.snapshotId===c.snapshotId),'SNAPSHOT_EXISTS',409);
  q.options.push({optionId:c.optionId,snapshots:[{snapshotId:c.snapshotId,termsRevision:1,presentationRevision:1,terms:structuredClone(c.terms)}]});q.configRevision++;break;
 case 'EDIT_OPTION': {
  const o=option(c.optionId),old=current(o);validateTerms(c.terms);requireThat(c.reason.trim().length>0,'REASON_REQUIRED');
  requireThat(!q.options.flatMap(o=>o.snapshots).some(s=>s.snapshotId===c.snapshotId),'SNAPSHOT_EXISTS');
  const {title:_a,...before}=old.terms, {title:_b,...after}=c.terms;
  // Only an explicit spelling change of title can be cosmetic in this supported API subset.
  requireThat(!c.cosmetic||JSON.stringify(before)===JSON.stringify(after),'NOT_COSMETIC');
  o.snapshots.push({snapshotId:c.snapshotId,termsRevision:old.termsRevision+(c.cosmetic?0:1),presentationRevision:old.presentationRevision+1,terms:structuredClone(c.terms),...(old.source?{source:structuredClone(old.source)}:{})});
  if(!c.cosmetic&&q.selectedOptionId===o.optionId)q.selectionRevision++;
  q.configRevision++;break;}
 case 'START':requireThat(q.phase==='DRAFT'&&q.options.length>0,'PHASE');positive(q.decisionDeadline);q.phase='COLLECTING';q.electorateVersion++;q.configRevision++;break;
 case 'RESPOND': {
  requireThat(q.phase==='COLLECTING','PHASE');requireThat(['CAN','CANNOT','UNKNOWN'].includes(c.value),'RESPONSE');positive(q.decisionDeadline);
  const o=option(c.optionId),s=current(o),slot=activeSlot(q,actor)!;requireThat(s.termsRevision===c.termsRevision,'TERMS_STALE',409);
  q.responses.push({actorId:actor,slotId:slot.slotId,optionId:o.optionId,answeredSnapshotId:s.snapshotId,termsRevision:s.termsRevision,value:c.value,acceptedAt:now});break;}
 case 'SELECT': {
  requireThat(q.phase==='COLLECTING','PHASE');positive(q.decisionDeadline);positive(q.commitmentDeadline);
  const o=option(c.optionId),f=feasibility(q,o);requireThat(f.status!=='BLOCKED','OPTION_BLOCKED',409);
  requireThat(f.status==='READY'||c.allowProvisional&&c.reason.trim().length>0,'PROVISIONAL_REQUIRES_REASON',409);
  q.selectedOptionId=o.optionId;q.selectionRevision++;q.phase='SELECTED';break;}
 case 'COMMIT': {
  requireThat(q.phase==='SELECTED','PHASE');requireThat(c.value==='CONFIRMED'||c.value==='DECLINED','COMMITMENT');
  requireThat(c.selectionRevision===q.selectionRevision,'SELECTION_STALE',409);
  const s=current(option(q.selectedOptionId!)),slot=activeSlot(q,actor)!;
  if(c.value==='CONFIRMED'){positive(q.commitmentDeadline);requireThat(complete(s.terms),'TERMS_INCOMPLETE',409);}
  // Always append on this revision, including CONFIRMED after a material edit. Never compare raw value alone.
  q.commitments.push({actorId:actor,slotId:slot.slotId,selectionRevision:q.selectionRevision,selectedSnapshotId:s.snapshotId,value:c.value,acceptedAt:now});break;}
 case 'ROSTER':
  validateRoster(c.slots,c.rule);requireThat(c.reason.trim().length>0,'REASON_REQUIRED');
  requireThat(Date.parse(c.decisionDeadline)>Date.parse(now)&&Date.parse(c.decisionDeadline)<Date.parse(q.commitmentDeadline),'DEADLINE');
  q.slots=structuredClone(c.slots);q.rule=structuredClone(c.rule);q.decisionDeadline=c.decisionDeadline;q.configRevision++;
  if(q.phase!=='DRAFT')q.electorateVersion++;
  if(q.phase==='SELECTED'){q.selectionRevision++;q.selectedOptionId=null;q.phase='COLLECTING';}break;
 case 'EXTEND':
  requireThat(c.reason.trim().length>0,'REASON_REQUIRED');requireThat(Date.parse(c.decisionDeadline)>=Date.parse(q.decisionDeadline)&&Date.parse(c.commitmentDeadline)>=Date.parse(q.commitmentDeadline)&&Date.parse(c.commitmentDeadline)>Date.parse(now)&&Date.parse(c.commitmentDeadline)>Date.parse(c.decisionDeadline),'DEADLINE');
  if(q.phase!=='SELECTED')requireThat(Date.parse(c.decisionDeadline)>Date.parse(now),'DEADLINE');
  q.decisionDeadline=c.decisionDeadline;q.commitmentDeadline=c.commitmentDeadline;q.configRevision++;break;
 case 'CANCEL':requireThat(c.reason.trim().length>0,'REASON_REQUIRED');q.phase='CANCELLED';break;
 }
 q.stateVersion++;return q;
}
export function view(p:Plan,actor:string,now:string) {
 assertRead(p,actor);const cap=capabilities(p,actor);
 return {planId:p.planId,title:p.title,stateVersion:p.stateVersion,configRevision:p.configRevision,electorateVersion:p.electorateVersion,selectionRevision:p.selectionRevision,
  phase:p.phase,selectedOptionId:p.selectedOptionId,rule:p.rule,decisionDeadline:p.decisionDeadline,commitmentDeadline:p.commitmentDeadline,
  options:p.options.map(o=>({optionId:o.optionId,...current(o),feasibility:feasibility(p,o)})),confirmation:confirmation(p,now),capabilities:cap,
  slots:cap.canManage?p.slots:p.slots.filter(s=>s.state==='ACTIVE').map(s=>({slotId:s.slotId,label:s.label,actorId:s.actorId,required:s.required,state:s.state})),
  responses:cap.canManage?p.responses:p.responses.filter(r=>r.actorId===actor),commitments:cap.canManage?p.commitments:p.commitments.filter(c=>c.actorId===actor)};
}
export type PlanView = ReturnType<typeof view>;
