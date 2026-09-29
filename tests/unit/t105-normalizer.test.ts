import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hash,type Event,type Occurrence,type SourcePlace,type SourcePrice,type SourceRecord,type SourceSession} from '../../packages/domain/event.ts';
import {budgetVerdict,normalizePage,normalizePrice,normalizeRecord} from '../../packages/domain/event-normalizer.ts';
import {toOccurrenceView} from '../../packages/domain/occurrence-view.ts';
import {adaptKudaGoRecord,kudagoPrice,parseKudaGoPage} from '../../modules/search/core/kudago-t105.ts';

const policy={allowedHosts:['example.org'],allowLive:false};
const at='2027-01-10T10:00:00+03:00',later='2027-01-10T12:00:00+03:00';
const place:SourcePlace={kind:'VENUE',format:'OFFLINE',providerVenueId:'venue-1',venueName:'Synthetic Hall',address:'Synthetic street 1',coordinates:null,coordinateMeaning:'UNKNOWN',evidencePaths:['place']};
const price:SourcePrice={kind:'KNOWN',currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,
  quoteMinMinor:'50000',quoteMaxMinor:'50000',feeMode:'NONE',explicitFree:false,mandatoryExtras:[],conditions:[],
  rawPriceText:'500 рублей',evidencePaths:['price'],feeEvidencePaths:['synthetic.fees.none'],freeEvidencePath:null,parsedConfidence:'HIGH'};
const session=(overrides:Partial<SourceSession>={}):SourceSession=>({
  path:'dates[0]',precision:'EXACT',startsAt:at,endsAt:null,timeZone:'Europe/Moscow',
  nativeSessionId:null,nativeIdVerified:false,place:structuredClone(place),price:null,timePaths:['dates[0].start'],unsupportedReason:null,...overrides,
});
const record=(overrides:Partial<SourceRecord>={}):SourceRecord=>({
  sourceId:'synthetic:t105',providerId:'SyntheticProvider',dataMode:'SYNTHETIC',providerEventId:'event-1',
  requestId:'request-1',recordOrdinal:0,fetchedAt:'2026-09-23T10:00:00.000Z',sourceUrl:'https://example.org/events/1',
  responseSha256:hash('synthetic response'),apiVersion:'synthetic/1',transformVersion:'t105/1',rightsRevision:'synthetic/1',
  title:'Synthetic concert',categories:['CONCERT'],categoriesComplete:true,categoryMappingVerified:true,price:structuredClone(price),sessions:[session()],lifecycle:'UNKNOWN',...overrides,
});
test('Event is conceptual; two sessions yield two distinct occurrence proposals',()=>{
  const r=normalizeRecord(record({sessions:[session(),session({path:'dates[1]',startsAt:later})]}),policy);
  assert.equal(r.outcome,'ACCEPT');assert.equal(r.event?.title,'Synthetic concert');
  assert.equal(r.occurrences.length,2);assert.notEqual(r.occurrences[0]?.aliasValue,r.occurrences[1]?.aliasValue);
  assert.equal(r.event?.providerEventId,'event-1');
  assert.equal(r.event?.provenance.transformVersion,'t105/1+povod-event/1');
});
test('anonymous aliases ignore array order, title, price and end; duplicate session does not multiply',()=>{
  const a=normalizeRecord(record({sessions:[session(),session({path:'dates[1]'})]}),policy);
  const b=normalizeRecord(record({title:'Renamed synthetic event',price:{...price,quoteMinMinor:'60000',quoteMaxMinor:'60000'},sessions:[session({endsAt:later})]}),policy);
  assert.equal(a.occurrences.length,1);assert.equal(a.fragments[1]?.outcome,'DUPLICATE');
  assert.equal(a.occurrences[0]?.aliasValue,b.occurrences[0]?.aliasValue);
});
test('conflicting duplicate aliases quarantine that identity and preserve siblings',()=>{
  const r=normalizeRecord(record({sessions:[session(),session({path:'dates[1]',price:{...price,quoteMinMinor:'60000',quoteMaxMinor:'60000'}}),session({path:'dates[2]',startsAt:later}),session({path:'dates[3]'})]}),policy);
  assert.equal(r.occurrences.length,1);assert.equal(r.occurrences[0]?.startsAt,'2027-01-10T09:00:00.000Z');
  assert.equal(r.fragments.filter(f=>f.outcome==='QUARANTINE').length,3);
});
test('T104 free admission with mandatory 700 RUB deposit is conditional and never free',()=>{
  const q=kudagoPrice('вход бесплатный, депозит на еду — 700 рублей',true),p=normalizePrice({...q,basis:'PER_PERSON',scopeAppliesToOccurrence:true});
  assert.equal(p.kind,'CONDITIONAL');assert.equal(p.quoteMinMinor,'0');assert.equal(p.mandatoryExtraMinMinor,'70000');
  assert.equal(p.totalMinMinor,'70000');assert.equal(p.totalMaxMinor,null);
  assert.equal(budgetVerdict(p,'0','RUB'),'FAIL');
});
test('explicit proven free, claimed free with unknown fees, numeric zero and missing price remain distinct',()=>{
  const explicit=normalizePrice({...price,kind:'FREE',quoteMinMinor:'0',quoteMaxMinor:'0',explicitFree:true,freeEvidencePath:'price.is_free'});
  assert.equal(explicit.kind,'FREE');assert.equal(explicit.totalMaxMinor,'0');assert.equal(budgetVerdict(explicit,'0','RUB'),'PASS');
  assert.throws(()=>normalizePrice({...price,kind:'FREE',quoteMinMinor:'0',quoteMaxMinor:'0',explicitFree:true,freeEvidencePath:null}),/PRICE_FREE_SHAPE/);
  assert.throws(()=>normalizePrice({...price,feeEvidencePaths:[]}),/FEE_EVIDENCE_MISSING/);
  assert.equal(normalizePrice(kudagoPrice('',true)).kind,'UNKNOWN');
  assert.equal(normalizePrice({...price,quoteMinMinor:'0',quoteMaxMinor:'0'}).kind,'KNOWN');
  assert.equal(normalizePrice(null).kind,'UNKNOWN');assert.equal(budgetVerdict(normalizePrice(null),'0','RUB'),'UNKNOWN');
});
test('FROM and RANGE preserve bounds without inventing affordable ceiling',()=>{
  const from=normalizePrice({...price,kind:'FROM',quoteMaxMinor:null});
  const range=normalizePrice({...price,kind:'RANGE',quoteMaxMinor:'90000'});
  assert.equal(from.totalMaxMinor,null);assert.equal(budgetVerdict(from,'100000','RUB'),'UNKNOWN');
  assert.equal(range.quoteMaxMinor,'90000');assert.equal(budgetVerdict(range,'80000','RUB'),'UNKNOWN');
  assert.equal(budgetVerdict(range,'40000','RUB'),'FAIL');
});
test('unknown fees and event-level scope cannot prove occurrence budget',()=>{
  assert.equal(budgetVerdict(normalizePrice({...price,feeMode:'UNKNOWN'}),'60000','RUB'),'UNKNOWN');
  assert.equal(budgetVerdict(normalizePrice({...price,evidenceScope:'EVENT',scopeAppliesToOccurrence:null}),'60000','RUB'),'UNKNOWN');
});
test('null end, null place and venue without coordinates remain honest',()=>{
  const r=normalizeRecord(record({sessions:[session({place:{...place,providerVenueId:null,venueName:null,address:null}}),session({path:'dates[1]',startsAt:later,place:{...place,coordinates:null}})]}),policy);
  assert.equal(r.occurrences[0]?.endsAt,null);assert.equal(r.occurrences[0]?.place.kind,'UNKNOWN');
  assert.equal(r.occurrences[0]?.place.coordinates,null);assert.equal(r.occurrences[1]?.place.kind,'VENUE');
  assert.equal(r.occurrences[1]?.place.coordinates,null);
});
test('invalid end is quarantined as a field, valid start survives',()=>{
  const r=normalizeRecord(record({sessions:[session({endsAt:'2027-02-31T12:00:00+03:00'})]}),policy);
  assert.equal(r.outcome,'PARTIAL_ACCEPT');assert.equal(r.occurrences[0]?.endsAt,null);
  assert.equal(r.fragments[0]?.reasons[0]?.code,'END_INVALID');
});
test('invalid start, timezone, impossible date and source URL isolate records',()=>{
  for(const bad of ['2027-02-31T10:00:00+03:00','2027-01-10T10:00:00','1900-01-01T00:00:00Z']){
    const r=normalizeRecord(record({sessions:[session({startsAt:bad}),session({path:'dates[1]',startsAt:later})]}),policy);
    assert.equal(r.occurrences.length,1);assert.equal(r.fragments[0]?.outcome,'QUARANTINE');
  }
  assert.equal(normalizeRecord(record({sessions:[session({timeZone:'Mars/Base'})]}),policy).occurrences.length,0);
  assert.equal(normalizeRecord(record({sourceUrl:'javascript:alert(1)'}),policy).outcome,'QUARANTINE');
  assert.equal(normalizeRecord(record({title:'<script>x</script>'}),policy).outcome,'QUARANTINE');
});
test('a malformed record is isolated and no page silently truncates 399 sessions',()=>{
  const sessions=Array.from({length:399},(_,i)=>session({path:'dates['+i+']',startsAt:new Date(Date.UTC(2027,0,10+i,7)).toISOString()}));
  const rows=normalizePage([record({sessions}),{bad:true}],policy);
  assert.equal(rows[0]?.occurrences.length,399);assert.equal(rows[1]?.outcome,'QUARANTINE');
  assert.throws(()=>normalizePage([record({sessions:Array.from({length:5001},(_,i)=>session({path:'dates['+i+']'}))})],policy),/PAGE_FRAGMENT_BOUND_EXCEEDED/);
});
test('duplicate provider rows dedupe; conflicting rows quarantine both',()=>{
  const duplicate=normalizePage([record(),record({recordOrdinal:1})],policy);
  assert.equal(duplicate[0]?.occurrences.length,1);assert.equal(duplicate[1]?.occurrences.length,0);
  const conflict=normalizePage([record(),record({recordOrdinal:1,title:'Other synthetic title'})],policy);
  assert.equal(conflict[0]?.event,null);assert.equal(conflict[1]?.event,null);
  const three=normalizePage([record(),record({recordOrdinal:1}),record({recordOrdinal:2,title:'Conflicting synthetic title'})],policy);
  assert.ok(three.every(item=>item.event===null));
});
test('T104 KudaGo null end, null place, 399 dates and actual_since do not create a cursor or fake facts',()=>{
  const dates=Array.from({length:399},(_,i)=>({start:Date.UTC(2027,0,10+i,7)/1000,end:Date.UTC(2027,0,10+i,7)/1000,
    start_date:new Date(Date.UTC(2027,0,10+i,7)).toISOString().slice(0,10),start_time:'10:00:00',end_date:null,end_time:null,
    is_continuous:false,is_endless:false,is_startless:false,use_place_schedule:false,schedules:[]}));
  const context={sourceId:'synthetic:t105',dataMode:'SYNTHETIC' as const,requestId:'k1',fetchedAt:'2026-09-23T10:00:00.000Z',
    responseSha256:hash('t104 synthetic'),rightsRevision:'synthetic/1',timeZone:'Europe/Moscow',categoryMap:{}};
  const raw={id:202293,title:'Synthetic T104 fixture',site_url:'https://example.org/e/202293',price:'',is_free:false,place:null,dates,actual_since:123};
  const r=normalizeRecord(adaptKudaGoRecord(raw,0,context),policy);
  assert.equal(r.occurrences.length,399);assert.equal(r.occurrences[0]?.endsAt,null);
  assert.equal(r.occurrences[0]?.place.kind,'UNKNOWN');
  assert.equal(r.event?.categoriesComplete,false);
  assert.equal(r.occurrences[0]?.timeEvidence.startEpoch,String(dates[0]!.start));
  assert.equal('actual_since' in (r.event??{}),false);
});
test('KudaGo conflicting expanded start quarantines only that date; page size is bounded',()=>{
  const context={sourceId:'synthetic:t105',dataMode:'SYNTHETIC' as const,requestId:'k2',fetchedAt:'2026-09-23T10:00:00.000Z',
    responseSha256:hash('t104 synthetic'),rightsRevision:'synthetic/1',timeZone:'Europe/Moscow',categoryMap:{}};
  const date={start:Date.UTC(2027,0,10,7)/1000,end:null,start_date:'2027-01-11',start_time:'10:00:00',
    end_date:null,end_time:null,is_continuous:false,is_endless:false,is_startless:false,use_place_schedule:false,schedules:[]};
  const valid={...date,start_date:'2027-01-10'};
  const event={id:1,title:'Synthetic',site_url:'https://example.org/1',place:null,dates:[date,valid]};
  const page={count:1,next:null,results:[event]};
  const parsed=parseKudaGoPage(new TextEncoder().encode(JSON.stringify(page)),context,policy);
  assert.equal(parsed.queryExhausted,true);assert.equal(parsed.snapshotConsistent,false);
  assert.equal(parsed.sourceRecords.length,1);assert.equal(parsed.records[0]?.occurrences.length,1);assert.equal(parsed.records[0]?.fragments[0]?.outcome,'QUARANTINE');
  assert.throws(()=>parseKudaGoPage(new Uint8Array(4*1024*1024+1),context,policy),/PAGE_BYTES_EXCEEDED/);
});
test('presentation exposes unknown/conditional/source-unavailable without fabricated end or venue',()=>{
  const r=normalizeRecord(record({sourceUrl:null,sessions:[session({place:{...place,providerVenueId:null,venueName:null,address:null}})]}),policy);
  const eventId=randomUUID(),id=randomUUID(),p=r.event!.provenance;
  const provenance={...p,projectionSha256:r.projectionSha256!,observationId:randomUUID(),fragmentPath:'dates[0]'};
  const event:Event={id:eventId,sourceId:r.event!.sourceId,providerEventId:r.event!.providerEventId,title:r.event!.title,
    categories:r.event!.categories,categoriesComplete:r.event!.categoriesComplete,categoryMappingVerified:r.event!.categoryMappingVerified,sourceUrl:null,provenance,semanticHash:hash('event')};
  const o=r.occurrences[0]!;
  const occurrence:Occurrence={...o,id,eventId,revision:1,semanticHash:hash('occurrence'),provenance};
  const view=toOccurrenceView(event,occurrence,'2026-09-23T10:00:00.000Z');
  assert.equal(view.endsAt,null);assert.equal(view.venue.state,'UNKNOWN');assert.equal(view.source.canOpen,false);
  assert.ok(view.warnings.includes('SOURCE_UNAVAILABLE'));assert.ok(view.warnings.includes('END_UNKNOWN'));
  assert.equal(view.price.kind,'KNOWN');
  const conditional=normalizePrice(kudagoPrice('вход бесплатный, депозит на еду — 700 рублей',true));
  const conditionalView=toOccurrenceView(event,{...occurrence,price:conditional},'2026-09-23T10:00:00.000Z');
  assert.equal(conditionalView.price.kind,'CONDITIONAL');
  assert.match(conditionalView.price.label,/700 ₽/u);
  const unknownView=toOccurrenceView(event,{...occurrence,price:normalizePrice(null)},'2026-09-23T10:00:00.000Z');
  assert.equal(unknownView.price.label,'Цена не указана');
  assert.ok(unknownView.warnings.includes('PRICE_UNKNOWN'));
});

test('malformed nested provider fields are bounded and isolated from valid siblings',()=>{
  const malformed=record({price:{...price,rawPriceText:123 as unknown as string},sessions:[session({place:null as unknown as SourcePlace})]});
  const rows=normalizePage([malformed,record({providerEventId:'event-2',recordOrdinal:1})],policy);
  assert.equal(rows.length,2);assert.equal(rows[0]?.outcome,'PARTIAL_ACCEPT');
  assert.equal(rows[0]?.occurrences[0]?.price.kind,'UNKNOWN');
  assert.equal(rows[0]?.occurrences[0]?.place.kind,'UNKNOWN');
  assert.equal(rows[1]?.outcome,'ACCEPT');
  assert.equal(rows[1]?.occurrences.length,1);
});
test('money overflow and contradictory no-fee evidence cannot enter canonical price',()=>{
  assert.throws(()=>normalizePrice({...price,quoteMinMinor:'999999999999999999',quoteMaxMinor:'999999999999999999',feeMode:'ITEMIZED',mandatoryExtras:[{label:'Synthetic fee',minMinor:'1',path:'price.fee'}]}),/PRICE_AMOUNT_OVERFLOW/);
  assert.throws(()=>normalizePrice({...price,mandatoryExtras:[{label:'fee',minMinor:'100',path:'price'}]}),/PRICE_FEE_CONFLICT/);
});


test('malformed coordinate child cannot erase a valid session sibling',()=>{
  const bad=session({place:{...place,coordinates:undefined as unknown as {lat:number;lon:number}}});
  const r=normalizeRecord(record({sessions:[bad,session({path:'dates[1]',startsAt:later})]}),policy);
  assert.equal(r.occurrences.length,2);
  assert.equal(r.occurrences[0]?.place.coordinates,null);
  assert.equal(r.occurrences[1]?.startsAt,'2027-01-10T09:00:00.000Z');
});

test('ambiguous online place and contradictory venue format stay uncertain',()=>{
  const online=normalizeRecord(record({sessions:[session({place:{...place,kind:'ONLINE',format:'ONLINE'}})]}),policy);
  assert.equal(online.occurrences[0]?.place.kind,'UNKNOWN');assert.equal(online.occurrences[0]?.place.venueName,null);
  const conflicting=normalizeRecord(record({sessions:[session({place:{...place,format:'ONLINE'}})]}),policy);
  assert.equal(conflicting.occurrences[0]?.place.kind,'VENUE');assert.equal(conflicting.occurrences[0]?.place.format,'UNKNOWN');
});
test('RUB presentation preserves kopecks rather than truncating a known price',()=>{
  const r=normalizeRecord(record({price:{...price,quoteMinMinor:'50001',quoteMaxMinor:'50001'}}),policy);
  const id=randomUUID(),eventId=randomUUID(),p=r.event!.provenance;
  const provenance={...p,projectionSha256:r.projectionSha256!,observationId:randomUUID(),fragmentPath:'dates[0]'};
  const event:Event={...r.event!,id:eventId,semanticHash:hash('event'),provenance};
  const occurrence:Occurrence={...r.occurrences[0]!,id,eventId,revision:1,semanticHash:hash('occurrence'),provenance};
  assert.equal(toOccurrenceView(event,occurrence,'2026-09-23T10:00:00.000Z').price.label,'500,01 \u20bd');
});

test('live source without explicit policy admission is rejected with a structured reason',()=>{
  const result=normalizeRecord(record({dataMode:'LIVE'}),policy);
  assert.equal(result.outcome,'REJECT');
  assert.equal(result.reasons[0]?.code,'LIVE_ADMISSION_DISABLED');
  assert.equal(result.event,null);
});
