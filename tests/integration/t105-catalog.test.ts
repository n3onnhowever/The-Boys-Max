import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {hash,type SourceRecord,type SourcePrice,type SourceSession} from '../../packages/domain/event.ts';
import {canonicalCatalog} from '../../packages/persistence/canonical-catalog.ts';

const url=process.env.T105_TEST_DATABASE_URL;
assert.ok(url&&['127.0.0.1','postgres'].includes(new URL(url).hostname)&&new URL(url).pathname.startsWith('/povod_t105_'),'T105 isolated PostgreSQL test URL required');
const pool=new pg.Pool({connectionString:url,max:3});
const repo=canonicalCatalog(pool),sourceId='synthetic:t105:'+randomUUID(),scope=hash('synthetic scope');
const policy={allowedHosts:['example.org'],allowLive:false};
const place={kind:'VENUE' as const,format:'OFFLINE' as const,providerVenueId:'v1',venueName:'Synthetic Hall',address:'Synthetic address',
  coordinates:null,coordinateMeaning:'UNKNOWN' as const,evidencePaths:['place']};
const price:SourcePrice={kind:'KNOWN',currency:'RUB',basis:'PER_PERSON',evidenceScope:'OCCURRENCE',scopeAppliesToOccurrence:true,
  quoteMinMinor:'50000',quoteMaxMinor:'50000',feeMode:'NONE',explicitFree:false,mandatoryExtras:[],conditions:[],
  rawPriceText:'500 рублей',evidencePaths:['price'],feeEvidencePaths:['synthetic.fees.none'],freeEvidencePath:null,parsedConfidence:'HIGH'};
const one=(path:string,start:string,overrides:Partial<SourceSession>={}):SourceSession=>({
  path,precision:'EXACT',startsAt:start,endsAt:null,timeZone:'Europe/Moscow',nativeSessionId:null,nativeIdVerified:false,
  place:structuredClone(place),price:null,timePaths:[path+'.start'],timeEvidence:{startRaw:start},unsupportedReason:null,...overrides,
});
const first='2027-03-10T18:00:00+03:00',second='2027-03-11T18:00:00+03:00';
const raw=(requestId:string,overrides:Partial<SourceRecord>={}):SourceRecord=>({
  sourceId,providerId:'SyntheticProvider',dataMode:'SYNTHETIC',providerEventId:'event-1',requestId,recordOrdinal:0,
  fetchedAt:'2026-09-23T10:00:00.000Z',sourceUrl:'https://example.org/e/1',responseSha256:hash('synthetic '+requestId),
  apiVersion:'synthetic/1',transformVersion:'t105/1',rightsRevision:'synthetic/1',title:'Synthetic concert',
  categories:['CONCERT'],categoriesComplete:true,categoryMappingVerified:true,price:structuredClone(price),sessions:[one('dates[0]',first)],lifecycle:'UNKNOWN',...overrides,
});
async function run(requestId:string,records:unknown[],exhausted=true){
  const r=await repo.beginRun(sourceId,scope),page=await repo.dispatchPage(r.runId,r.epoch,1);
  const result=await repo.commitPage(page.pageId,r.epoch,records,policy,exhausted);
  const outcome=await repo.finishRun(r.runId,r.epoch);
  return {r,page,result,outcome};
}
before(async()=>{await pool.query('SELECT 1');await repo.registerSyntheticSource(sourceId,'SyntheticProvider','synthetic/1');});
after(async()=>{await pool.end();});

test('T105 PG: Event has two durable occurrences with stable opaque UUID identities',async()=>{
  const result=await run('r1',[raw('r1',{sessions:[one('dates[0]',first),one('dates[1]',second)]})]);
  assert.equal(result.result.status,'COMMITTED');assert.equal(result.result.accepted,2);assert.equal(result.outcome,'SUCCEEDED');
  const rows=await pool.query<{id:string;event_id:string;revision:number}>('SELECT o.id,o.event_id,o.revision FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 ORDER BY o.starts_at',[sourceId]);
  assert.equal(rows.rows.length,2);assert.equal(rows.rows[0]!.event_id,rows.rows[1]!.event_id);
  assert.notEqual(rows.rows[0]!.id,rows.rows[1]!.id);assert.equal(rows.rows[0]!.revision,1);
  const view=await repo.readOccurrence(rows.rows[0]!.id);assert.equal(view?.event.title,'Synthetic concert');
  assert.equal(view?.occurrence.endsAt,null);assert.equal(view?.occurrence.place.coordinates,null);
  assert.equal(view?.occurrence.timeEvidence.startRaw,first);
  assert.equal(view?.occurrence.provenance.providerEventId,'event-1');
  assert.equal(view?.occurrence.provenance.transformVersion,'t105/1+povod-event/1');
  assert.equal(view?.occurrence.provenance.responseSha256,hash('synthetic r1'));
  assert.equal(view?.occurrence.provenance.sourceUrl,'https://example.org/e/1');
});
test('T105 PG: repeated fetch and duplicate row do not multiply occurrences or semantic revisions',async()=>{
  const repeat=raw('r2',{recordOrdinal:0,sessions:[one('dates[0]',first),one('dates[1]',second)]});
  const result=await run('r2',[repeat,{...repeat,recordOrdinal:1}]);
  assert.equal(result.result.status,'COMMITTED');
  const count=await pool.query<{n:string}>('SELECT count(*)::text AS n FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1',[sourceId]);
  assert.equal(count.rows[0]!.n,'2');
  const revisions=await pool.query<{revision:number}>('SELECT o.revision FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 ORDER BY o.starts_at',[sourceId]);
  assert.deepEqual(revisions.rows.map(r=>r.revision),[1,1]);
  const obs=await pool.query<{n:string}>('SELECT count(*)::text AS n FROM source_observations WHERE source_id=$1',[sourceId]);
  assert.equal(obs.rows[0]!.n,'3');
});
test('T105 PG: price update revises only stable occurrence; anonymous venue change creates new identity',async()=>{
  const before=await pool.query<{id:string}>('SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 ORDER BY o.starts_at LIMIT 1',[sourceId]);
  const id=before.rows[0]!.id;
  await run('r3',[raw('r3',{price:{...price,quoteMinMinor:'60000',quoteMaxMinor:'60000'}})]);
  const updated=await repo.readOccurrence(id);
  assert.equal(updated?.occurrence.id,id);assert.equal(updated?.occurrence.revision,2);
  assert.equal(updated?.occurrence.price.quoteMinMinor,'60000');
  await run('r4',[raw('r4',{sessions:[one('dates[0]',first,{place:{...place,providerVenueId:'v2',venueName:'Corrected synthetic venue'}})]})]);
  const rows=await pool.query<{id:string}>('SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 AND o.starts_at=$2',[sourceId,new Date(first).toISOString()]);
  assert.equal(rows.rows.length,2);assert.ok(rows.rows.some(r=>r.id===id));
});
test('T105 PG: partial and failed pages preserve existing facts; no false cancellation',async()=>{
  const r=await repo.beginRun(sourceId,scope),p1=await repo.dispatchPage(r.runId,r.epoch,1);
  await repo.commitPage(p1.pageId,r.epoch,[raw('r5',{providerEventId:'event-2'})],policy,false);
  const p2=await repo.dispatchPage(r.runId,r.epoch,2);
  assert.equal(await repo.failPage(p2.pageId,r.epoch,'TIMEOUT'),'FAILED');
  const runRow=await pool.query<{status:string;next_page:number}>('SELECT status,next_page FROM catalog_sync_runs WHERE id=$1',[r.runId]);
  assert.equal(runRow.rows[0]!.status,'PARTIAL');assert.equal(runRow.rows[0]!.next_page,2);
  const old=await pool.query<{lifecycle:string}>('SELECT o.lifecycle FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 ORDER BY o.starts_at LIMIT 1',[sourceId]);
  assert.equal(old.rows[0]!.lifecycle,'UNKNOWN');
  assert.equal((await repo.commitPage(p2.pageId,r.epoch,[raw('late')],policy,true)).status,'FENCED');
});
test('T105 PG: zero-result run is query evidence and leaves prior occurrences intact',async()=>{
  const countBefore=(await pool.query<{n:string}>('SELECT count(*)::text AS n FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1',[sourceId])).rows[0]!.n;
  const result=await run('empty',[]);
  assert.equal(result.outcome,'SUCCEEDED');
  const countAfter=(await pool.query<{n:string}>('SELECT count(*)::text AS n FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1',[sourceId])).rows[0]!.n;
  assert.equal(countAfter,countBefore);
});
test('T105 PG: malformed item is quarantined while a valid sibling commits',async()=>{
  const result=await run('r6',[{bad:'record'},raw('r6',{providerEventId:'event-3',recordOrdinal:1})]);
  assert.equal(result.outcome,'PARTIAL');assert.equal(result.result.accepted,1);assert.equal(result.result.quarantined,1);
  const row=await pool.query<{n:string}>('SELECT count(*)::text AS n FROM catalog_normalization_quarantine WHERE source_id=$1',[sourceId]);
  assert.ok(BigInt(row.rows[0]!.n)>0n);
  assert.equal((await pool.query('SELECT id FROM canonical_events WHERE source_id=$1 AND provider_event_id=$2',[sourceId,'event-3'])).rowCount,1);
});
test('T105 PG: SQL constraints reject invented end and unsupported FREE shape',async()=>{
  const row=(await pool.query<{id:string}>('SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 ORDER BY o.starts_at LIMIT 1',[sourceId])).rows[0]!;
  await assert.rejects(pool.query('UPDATE canonical_occurrences SET ends_at=starts_at WHERE id=$1',[row.id]));
  await assert.rejects(pool.query("UPDATE canonical_occurrences SET price=jsonb_set(price,'{kind}','\"FREE\"'::jsonb) WHERE id=$1",[row.id]));
  const forgedFree={kind:'FREE',quoteMinMinor:'0',quoteMaxMinor:'0',totalMinMinor:'0',totalMaxMinor:'0',feeMode:'NONE',feesKnown:true,scopeAppliesToOccurrence:true,isFreeClaimedBySource:true,conditions:[],feeEvidencePaths:[]};
  await assert.rejects(pool.query('UPDATE canonical_occurrences SET price=$2::jsonb WHERE id=$1',[row.id,JSON.stringify(forgedFree)]));
  await assert.rejects(pool.query("UPDATE canonical_occurrences SET price=price-'kind' WHERE id=$1",[row.id]));
  await assert.rejects(pool.query("UPDATE canonical_occurrences SET place=place-'kind' WHERE id=$1",[row.id]));
});


test('T105 PG: verified native session identity survives reschedule and venue change',async()=>{
  const original=raw('native-1',{providerEventId:'event-native',sessions:[one('dates[0]',first,{nativeSessionId:'session-9',nativeIdVerified:true})]});
  await run('native-1',[original]);
  const before=(await pool.query<{id:string;revision:number}>('SELECT o.id,o.revision FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 AND e.provider_event_id=$2',
    [sourceId,'event-native'])).rows[0]!;
  const changed=raw('native-2',{providerEventId:'event-native',sessions:[one('dates[0]',second,{
    nativeSessionId:'session-9',nativeIdVerified:true,place:{...place,providerVenueId:'native-v2',venueName:'Rescheduled synthetic venue'}})]});
  await run('native-2',[changed]);
  const after=(await pool.query<{id:string;revision:number;starts_at:Date}>('SELECT o.id,o.revision,o.starts_at FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 AND e.provider_event_id=$2',
    [sourceId,'event-native'])).rows;
  assert.equal(after.length,1);assert.equal(after[0]!.id,before.id);assert.equal(after[0]!.revision,before.revision+1);
  assert.equal(after[0]!.starts_at.toISOString(),new Date(second).toISOString());
});
test('T105 PG: stale source sequence cannot overwrite newer canonical facts or freshness',async()=>{
  await run('stale-base',[raw('stale-base',{providerEventId:'event-stale'})]);
  const head=(await pool.query<{id:string;accepted_observation_id:string;fetched_at:Date}>('SELECT id,accepted_observation_id,fetched_at FROM canonical_events WHERE source_id=$1 AND provider_event_id=$2',
    [sourceId,'event-stale'])).rows[0]!;
  // Simulate a previously committed higher dispatch sequence without touching the factual row.
  await pool.query('UPDATE canonical_events SET last_request_seq=last_request_seq+100 WHERE id=$1',[head.id]);
  const result=await run('stale-late',[raw('stale-late',{providerEventId:'event-stale',title:'Stale synthetic title'})]);
  assert.equal(result.result.status,'COMMITTED');
  const after=(await pool.query<{title:string;accepted_observation_id:string;fetched_at:Date}>('SELECT title,accepted_observation_id,fetched_at FROM canonical_events WHERE id=$1',[head.id])).rows[0]!;
  assert.equal(after.title,'Synthetic concert');assert.equal(after.accepted_observation_id,head.accepted_observation_id);
  assert.equal(after.fetched_at.toISOString(),head.fetched_at.toISOString());
  const stale=(await pool.query<{disposition:string}>('SELECT disposition FROM source_observations WHERE source_id=$1 AND request_id=$2',[sourceId,'stale-late'])).rows[0]!;
  assert.equal(stale.disposition,'STALE_IGNORED');
});
test('T105 PG: 429 and provider 5xx are failed observations, never empty or cancellation',async()=>{
  for(const reason of ['HTTP_429','HTTP_5XX'] as const){
    const r=await repo.beginRun(sourceId,scope),p=await repo.dispatchPage(r.runId,r.epoch,1);
    assert.equal(await repo.failPage(p.pageId,r.epoch,reason),'FAILED');
    const row=(await pool.query<{status:string;query_exhausted:boolean}>('SELECT status,query_exhausted FROM catalog_sync_runs WHERE id=$1',[r.runId])).rows[0]!;
    assert.equal(row.status,'FAILED');assert.equal(row.query_exhausted,false);
  }
  const cancellations=(await pool.query<{n:string}>("SELECT count(*)::text AS n FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 AND o.lifecycle='CANCELLED'",[sourceId])).rows[0]!;
  assert.equal(cancellations.n,'0');
});

test('T105 PG: Event-only update has its own provenance and never refreshes an old session',async()=>{
  const occurrenceId=(await pool.query<{id:string}>('SELECT o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1 AND e.provider_event_id=$2 ORDER BY o.starts_at LIMIT 1',
    [sourceId,'event-1'])).rows[0]!.id;
  const before=(await repo.readOccurrence(occurrenceId))!;
  await run('event-only',[raw('event-only',{title:'Updated synthetic title',sessions:[]})]);
  const after=(await repo.readOccurrence(occurrenceId))!;
  assert.equal(after.event.title,'Updated synthetic title');
  assert.equal(after.event.provenance.requestId,'event-only');
  assert.equal(after.event.categoriesComplete,true);
  assert.equal(after.occurrence.provenance.requestId,before.occurrence.provenance.requestId);
  assert.equal(after.occurrence.provenance.fragmentPath,'dates[0]');
});
