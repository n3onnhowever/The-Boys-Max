import {priceFromQuote} from '../../modules/search/core/price.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPlan,apply,current,capabilities,feasibility,confirmation,view,validateTerms,validateRoster} from '../../packages/domain/plan.ts';
import type {Command,Plan} from '../../packages/contracts/domain.ts';
import {O,A,B,P,OID,NOW,DEC,COM,self,terms} from '../fixtures.ts';
function base(){let p=createPlan(P,O,'Plan',[self],{kind:'ALL'},DEC,COM,NOW);return run(p,{kind:'ADD_OPTION',optionId:OID,snapshotId:randomUUID(),terms});}
function run(p:Plan,c:Omit<Command,'expectedStateVersion'>|Record<string,unknown>,actor=O,now=NOW){return apply(p,actor,{...c,expectedStateVersion:p.stateVersion} as Command,now);}
function selected(){let p=run(base(),{kind:'START'});p=run(p,{kind:'RESPOND',optionId:OID,termsRevision:1,value:'CAN'});return run(p,{kind:'SELECT',optionId:OID,allowProvisional:false,reason:''});}
test('R5-002 organizer without participation retains management, not a fictional vote',()=>{
 const p=createPlan(P,O,'Plan',[{...self,actorId:null,state:'UNBOUND'}],{kind:'ALL'},DEC,COM,NOW);
 assert.deepEqual(capabilities(p,O),{canRead:true,canPropose:true,canManage:true,canRespond:false});
 const q=run(p,{kind:'ADD_OPTION',optionId:OID,snapshotId:randomUUID(),terms});assert.equal(q.slots[0]!.actorId,null);assert.equal(feasibility(q,q.options[0]!).can,0);
 assert.throws(()=>run(run(q,{kind:'START'}),{kind:'RESPOND',optionId:OID,termsRevision:1,value:'CAN'}),/FORBIDDEN/);
});
test('R3 consent on changed terms is a new APPLIED domain revision, not raw NO_CHANGE',()=>{
 let p=selected();p=run(p,{kind:'COMMIT',selectionRevision:1,value:'CONFIRMED'});const old=p.commitments[0]!;
 const before=JSON.stringify(p);p=run(p,{kind:'EDIT_OPTION',optionId:OID,snapshotId:randomUUID(),terms:{...terms,startsAt:'2026-09-20T16:00:00.000Z'},cosmetic:false,reason:'Перенос'});
 assert.equal(p.selectionRevision,2);assert.equal(confirmation(p,NOW),'AWAITING_CONFIRMATIONS');
 p=run(p,{kind:'COMMIT',selectionRevision:2,value:'CONFIRMED'});assert.equal(p.commitments.length,2);assert.deepEqual(p.commitments[0],old);assert.notEqual(p.commitments[1]!.selectedSnapshotId,old.selectedSnapshotId);assert.equal(confirmation(p,NOW),'CONFIRMED');assert.ok(before.includes('15:30'));
 assert.equal(current(p.options[0]!).terms.startsAt,'2026-09-20T16:00:00.000Z');
});
test('cosmetic snapshot preserves terms revision and original receipt snapshot',()=>{
 let p=run(selected(),{kind:'COMMIT',selectionRevision:1,value:'CONFIRMED'}),old=p.commitments[0]!.selectedSnapshotId;
 p=run(p,{kind:'EDIT_OPTION',optionId:OID,snapshotId:randomUUID(),terms:{...terms,title:'Исправленная подпись'},cosmetic:true,reason:'Опечатка'});
 assert.equal(current(p.options[0]!).termsRevision,1);assert.equal(current(p.options[0]!).presentationRevision,2);assert.equal(p.commitments[0]!.selectedSnapshotId,old);assert.equal(confirmation(p,NOW),'CONFIRMED');
});
test('time change cannot claim cosmetic',()=>assert.throws(()=>run(base(),{kind:'EDIT_OPTION',optionId:OID,snapshotId:randomUUID(),terms:{...terms,startsAt:'2026-09-20T16:00:00.000Z'},cosmetic:true,reason:'x'}),/NOT_COSMETIC/));
test('outsider IDOR is neutral; cannot replay current access',()=>{const p=base();assert.throws(()=>view(p,A,NOW),/NOT_FOUND/);assert.throws(()=>run(p,{kind:'START'},A),/NOT_FOUND/);});
test('stale state command fails before mutation',()=>{const p=base(),before=JSON.stringify(p);assert.throws(()=>apply(p,O,{kind:'START',expectedStateVersion:1},NOW),/VERSION_CONFLICT/);assert.equal(JSON.stringify(p),before);});
test('stale selection command fails',()=>assert.throws(()=>run(selected(),{kind:'COMMIT',selectionRevision:99,value:'CONFIRMED'}),/SELECTION_STALE/));
test('stale terms response fails',()=>assert.throws(()=>run(run(base(),{kind:'START'}),{kind:'RESPOND',optionId:OID,termsRevision:99,value:'CAN'}),/TERMS_STALE/));
test('deadline equality rejects positive response',()=>assert.throws(()=>run(run(base(),{kind:'START'}),{kind:'RESPOND',optionId:OID,termsRevision:1,value:'CAN'},O,DEC),/DEADLINE_PASSED/));
test('deadline equality rejects CONFIRMED',()=>assert.throws(()=>run(selected(),{kind:'COMMIT',selectionRevision:1,value:'CONFIRMED'},O,COM),/DEADLINE_PASSED/));
test('DECLINED after deadline remains possible until terminal',()=>{const p=run(selected(),{kind:'COMMIT',selectionRevision:1,value:'DECLINED'},O,COM);assert.equal(confirmation(p,COM),'AT_RISK');});
test('UNBOUND allowed at start and counts MISSING',()=>{let p=base();p=run(p,{kind:'ROSTER',slots:[{...self,actorId:null,state:'UNBOUND'}],rule:{kind:'ALL'},decisionDeadline:DEC,reason:'x'});p=run(p,{kind:'START'});assert.equal(feasibility(p,p.options[0]!).status,'PROVISIONAL');assert.equal(feasibility(p,p.options[0]!).unresolved,1);});
test('BLOCKED cannot be selected even with provisional override',()=>{let p=run(base(),{kind:'START'});p=run(p,{kind:'RESPOND',optionId:OID,termsRevision:1,value:'CANNOT'});assert.throws(()=>run(p,{kind:'SELECT',optionId:OID,allowProvisional:true,reason:'x'}),/OPTION_BLOCKED/);});
test('provisional selection requires explicit warning acknowledgement and reason',()=>{const p=run(base(),{kind:'START'});assert.throws(()=>run(p,{kind:'SELECT',optionId:OID,allowProvisional:false,reason:''}),/PROVISIONAL/);assert.equal(run(p,{kind:'SELECT',optionId:OID,allowProvisional:true,reason:'Осознанно'}).phase,'SELECTED');});
test('organizer cannot create others as participants',()=>assert.throws(()=>createPlan(P,O,'Plan',[{...self,actorId:A}],{kind:'ALL'},DEC,COM,NOW),/JOIN_APPROVAL/));
test('duplicate actor cannot occupy two slots',()=>assert.throws(()=>validateRoster([self,{...self,slotId:randomUUID()}],{kind:'ALL'}),/SLOT_ACTOR_CONFLICT/));
test('MIN is not silently reduced',()=>assert.throws(()=>validateRoster([self],{kind:'MIN',n:2}),/RULE_INVALID/));
test('roster after selection returns collecting, archives commitments, retains same terms responses',()=>{let p=run(selected(),{kind:'COMMIT',selectionRevision:1,value:'CONFIRMED'});p=run(p,{kind:'ROSTER',slots:[self,{...self,slotId:randomUUID(),actorId:A,required:false}],rule:{kind:'MIN',n:1},decisionDeadline:DEC,reason:'Одобрено'});assert.equal(p.phase,'COLLECTING');assert.equal(p.selectedOptionId,null);assert.equal(p.commitments.length,1);assert.equal(p.responses.length,1);assert.equal(p.electorateVersion,2);});
test('participant sees own responses, not another actor matrix',()=>{let p=selected();p=run(p,{kind:'ROSTER',slots:[self,{...self,slotId:randomUUID(),actorId:A,required:false}],rule:{kind:'MIN',n:1},decisionDeadline:DEC,reason:'x'});assert.equal(view(p,A,NOW).responses.length,0);assert.equal(view(p,O,NOW).responses.length,1);});
test('removed actor loses read immediately',()=>{let p=base();p=run(p,{kind:'ROSTER',slots:[self,{...self,slotId:randomUUID(),actorId:A,required:false}],rule:{kind:'ALL'},decisionDeadline:DEC,reason:'x'});assert.equal(capabilities(p,A).canRead,true);p=run(p,{kind:'ROSTER',slots:[self],rule:{kind:'ALL'},decisionDeadline:DEC,reason:'x'});assert.throws(()=>view(p,A,NOW),/NOT_FOUND/);});
test('unknown required fee prevents final confirmation and retains warnings',()=>{let p=base();const t=structuredClone(terms);t.price=priceFromQuote({kind:'EXACT',exact_minor:'50000',basis:'PER_PERSON',currency:'RUB',fees_known:false,fee_mode:'UNKNOWN'},'test-unknown-fees');p=run(p,{kind:'EDIT_OPTION',optionId:OID,snapshotId:randomUUID(),terms:t,cosmetic:false,reason:'x'});p=run(p,{kind:'START'});p=run(p,{kind:'SELECT',optionId:OID,allowProvisional:true,reason:'Цена требует уточнения'});assert.equal(confirmation(p,NOW),'TERMS_INCOMPLETE');assert.throws(()=>run(p,{kind:'COMMIT',selectionRevision:1,value:'CONFIRMED'}),/TERMS_INCOMPLETE/);assert.deepEqual(current(p.options[0]!).terms.warnings,terms.warnings);});
test('terminal forbids writes',()=>assert.throws(()=>run(run(base(),{kind:'CANCEL',reason:'x'}),{kind:'START'}),/TERMINAL/));
test('unknown time zone rejected',()=>assert.throws(()=>validateTerms({...terms,timeZone:'Invented/Zone'}),/TIME_ZONE/));
test('invalid calendar date rejected',()=>assert.throws(()=>validateTerms({...terms,startsAt:'2026-02-31T10:00:00.000Z'}),/UTC_INSTANT/));
test('UTC instant survives exact comparison without milliseconds',()=>assert.doesNotThrow(()=>validateTerms({...terms,startsAt:'2026-09-20T15:30:00Z'})));
for(const bad of [null,[],{},'confirmed',1])test(`strict commitment value ${JSON.stringify(bad)}`,()=>assert.throws(()=>run(selected(),{kind:'COMMIT',selectionRevision:1,value:bad}),/COMMITMENT/));
