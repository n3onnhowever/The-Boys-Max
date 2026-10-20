/** Owned synthetic fixtures and a stub provider; no external AI. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSmartProposal,smartToSearch,type SmartIntent} from '../../modules/ai/smart-occasion.ts';
import {smartOccasionService} from '../../modules/ai/smart-service.ts';
import {context,fromUiDraft} from '../../modules/integration/projections.ts';
import {evaluateEligibility} from '../../modules/search/core/eligibility.ts';
import {priceFromQuote} from '../../modules/search/core/price.ts';
import {syntheticCandidate} from '../catalog-fixtures.ts';

const now='2026-10-19T21:30:00.000Z'; // October 20, 00:30 Europe/Moscow
const draft=(p:Partial<SmartIntent>={}):SmartIntent=>({query_text:'',date_from:null,date_to:null,daypart:null,categories:[],interests:[],budget_max:null,free_only:false,city:null,radius_preference:null,social_context:null,party_size:null,mood_tags:[],hard_constraints:[],soft_preferences:[],clarification_required:false,clarification_question:null,...p});
const supported:[string,Partial<SmartIntent>][]=[
 ['только бесплатно завтра в Москве',{free_only:true,date_from:'TOMORROW',city:'Москва',hard_constraints:['FREE','DATE','CITY']}],
 ['сегодня вечером до 2000 рублей',{date_from:'TODAY',daypart:'EVENING',budget_max:2000,hard_constraints:['DATE','TIME','BUDGET']}],
 ['завтра вечером до 1000 рублей',{date_from:'TOMORROW',daypart:'EVENING',budget_max:1000,hard_constraints:['DATE','TIME','BUDGET']}],
 ['на выходных',{date_from:'WEEKEND',hard_constraints:['DATE']}],
 ['бесплатно сегодня',{free_only:true,date_from:'TODAY',hard_constraints:['FREE','DATE']}],
 ['не дороже 500 рублей',{budget_max:500,hard_constraints:['BUDGET']}],
 ['на троих до 3000 рублей',{party_size:3,budget_max:3000,hard_constraints:['BUDGET']}]
];
for(const [text,fields] of supported)test(`K1 recognized constraints: ${text}`,()=>{
 const p=validateSmartProposal(draft(fields),text,now);
 assert.equal(p.clarification?.code??null,fields.party_size?'BUDGET_BASIS':null);
 const mapped=smartToSearch(p,fields.party_size?'GROUP_TOTAL':null,now);
 assert.deepEqual(fromUiDraft(mapped.draft,context(now)),mapped.intent);
 if(fields.date_from==='TODAY')assert.deepEqual(mapped.intent.date,{kind:'EXACT',on:'2026-10-20'});
 if(fields.date_from==='TOMORROW')assert.deepEqual(mapped.intent.date,{kind:'EXACT',on:'2026-10-21'});
 if(fields.date_from==='WEEKEND')assert.deepEqual(mapped.intent.date,{kind:'RANGE',from:'2026-10-24',through:'2026-10-25'});
 if(fields.budget_max!==undefined)assert.equal(mapped.intent.budget?.max_minor,String(fields.budget_max!*100));
 if(fields.free_only)assert.equal(mapped.intent.budget?.max_minor,'0');
});
for(const text of ['не кино','не концерт','не театр, лучше выставка','не бесплатно','послезавтра','в субботу','на следующую пятницу'])test(`K1 unsupported wording cannot be applied: ${text}`,()=>{
 for(const raw of [draft(),draft({date_from:'TOMORROW',categories:['CINEMA'],free_only:true,hard_constraints:['DATE','CATEGORY','FREE']})]){
  const p=validateSmartProposal(raw,text,now);
  assert.equal(p.clarification?.code,'HARD_AMBIGUITY');
  assert.deepEqual(p.draft.categories,[]);
  assert.throws(()=>smartToSearch(p,null,now),/AI_CLARIFICATION_REQUIRED/);
 }
});
test('K1 unsupported city is explicit even if the model omits it',()=>{
 const p=validateSmartProposal(draft(),'в Санкт-Петербурге завтра',now);
 assert.equal(p.clarification?.code,'UNSUPPORTED_CITY');
 assert.throws(()=>smartToSearch(p,null,now),/AI_CLARIFICATION_REQUIRED/);
});
test('K1 missing, changed and invented hard constraints fail closed',()=>{
 for(const [text,fields] of supported){
  assert.throws(()=>validateSmartProposal(draft(),text,now));
  for(const key of ['date_from','daypart','city','budget_max','free_only','party_size'] as const){
   if(fields[key]===undefined)continue;
   const p={...fields,[key]:key==='free_only'?false:null};
   p.hard_constraints=fields.hard_constraints?.filter(x=>x!==({date_from:'DATE',daypart:'TIME',city:'CITY',budget_max:'BUDGET',free_only:'FREE',party_size:''}[key]));
   assert.throws(()=>validateSmartProposal(draft(p),text,now),`${text}: ${key}`);
  }
 }
 for(const fields of [{date_from:'TOMORROW',hard_constraints:['DATE']},{city:'Москва',hard_constraints:['CITY']},{party_size:3},{categories:['CINEMA'],hard_constraints:['CATEGORY']}] as Partial<SmartIntent>[])
  assert.throws(()=>validateSmartProposal(draft(fields),'хочу куда-нибудь',now));
 assert.throws(()=>validateSmartProposal(draft({categories:[],interests:['Выставки'],soft_preferences:['INTEREST']}),'выставка',now));
});
test('K1 unsupported hard expressions never weaken to generic Search',()=>{
 for(const text of ['не завтра','сегодня или завтра','бесплатно до 500','вечером','сегодня ночью','до 500 долларов','в Казани завтра','около 500 рублей','в 19:00','завтрак','не очень дорого','не только кино','???','хочу $','хочу ₽']){
  const p=validateSmartProposal(draft(),text,now);
  assert.ok(p.clarification,text);assert.throws(()=>smartToSearch(p,null,now),/AI_CLARIFICATION_REQUIRED/);
 }
});
test('K1 date tokens have word boundaries and Moscow weekend resolution',()=>{
 for(const [instant,from,through] of [['2026-10-23T20:00:00Z','2026-10-24','2026-10-25'],['2026-10-23T21:30:00Z','2026-10-24','2026-10-25'],['2026-10-24T21:30:00Z','2026-10-25','2026-10-25']]){
  const result=smartToSearch(validateSmartProposal(draft({date_from:'WEEKEND',hard_constraints:['DATE']}),'на выходных',instant!),null,instant!);
  assert.equal(result.draft.date,from);assert.equal(result.draft.dateThrough??result.draft.date,through);
 }
 const exact=validateSmartProposal(draft({date_from:'2026-10-22',hard_constraints:['DATE']}),'2026-10-22',now);
 assert.deepEqual(smartToSearch(exact,null,now).intent.date,{kind:'EXACT',on:'2026-10-22'});
 assert.throws(()=>validateSmartProposal(draft({date_from:'2026-10-23',hard_constraints:['DATE']}),'2026-10-22',now),/AI_CONSTRAINT_MISMATCH/);
});
test('K1 text → stub → review → accept → SearchIntent → factual eligibility',async()=>{
 const [text,fields]=supported[0]!;
 const service=smartOccasionService({contractVersion:'smart-occasion-intent/1',parseIntent:async()=>({kind:'UNAVAILABLE',reason:'unused'}),interpretSmartOccasion:async input=>{assert.equal(input,text);return draft(fields);}},()=>Date.parse(now));
 const proposal=await service.propose('actor','session',text);assert.equal(proposal.state,'REVIEW');
 if(proposal.state!=='REVIEW')assert.fail('review required');
 assert.throws(()=>service.accept('other','session',proposal.proposalId,null),/AI_PROPOSAL_EXPIRED/);
 const accepted=service.accept('actor','session',proposal.proposalId,null);
 const intent=fromUiDraft(accepted.searchDraft,context(now));
 assert.equal(intent.city?.id,'msk');assert.deepEqual(intent.date,{kind:'EXACT',on:'2026-10-21'});assert.equal(intent.budget?.max_minor,'0');
 const base={...syntheticCandidate(now,'k1-contract'),starts_at:'2026-10-21T15:00:00.000Z',ends_at:null,price:priceFromQuote({kind:'FREE',basis:'PER_PERSON',currency:'RUB',fees_known:true,fee_mode:'NONE',fee_evidence_ref:'OWNED_SYNTHETIC_TEST_ONLY',extras:[],warnings:[]},'k1-contract')};
 assert.equal(evaluateEligibility(intent,base,context(now)).status,'PASS');
 for(const patch of [{city_id:'spb'},{starts_at:'2026-10-22T15:00:00.000Z'},{price:syntheticCandidate(now,'k1-contract').price}])
  assert.equal(evaluateEligibility(intent,{...base,...patch},context(now)).status,'FAIL');
 const unknown=priceFromQuote({kind:'UNKNOWN',basis:'UNKNOWN',currency:null,fees_known:false,fee_mode:'UNKNOWN',extras:[],warnings:[]},'k1-contract');
 assert.equal(evaluateEligibility(intent,{...base,price:unknown},context(now)).status,'UNKNOWN');
});
