import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyKudaGoAdvertising,curatedOfficialImport,factualPrice,kudagoMovieShowingAdapter,moscowSportCalendarAdapter,officialIcsAdapter,officialRssAdapter} from '../../packages/real-catalog/adapters.ts';
import {normalizeRecord} from '../../packages/domain/event-normalizer.ts';
import {parseCuratedCsv,parseCuratedIcs} from '../../packages/real-catalog/operator-formats.ts';
import {assertDistinctCuratedFiles,candidateFromCanonical} from '../../packages/real-catalog/import.ts';
import type {Event,Occurrence,Provenance} from '../../packages/domain/event.ts';

const file=JSON.parse(readFileSync('tests/fixtures/real-catalog/curated-official-v1.json','utf8'));
const tretyakovExact=JSON.parse(readFileSync('scripts/data/curated-official-tretyakov-exact-v1.json','utf8'));
const kudagoA=JSON.parse(readFileSync('scripts/data/curated-kudago-moscow-a-v1.json','utf8'));
const kudagoB=JSON.parse(readFileSync('scripts/data/curated-kudago-moscow-b-v1.json','utf8'));
test('curated first-party facts map to exact canonical sessions and retain unknown fees',()=>{
 const {accepted,quarantined}=curatedOfficialImport(file,['www.darwinmuseum.ru']);
 assert.equal(accepted.length,4);assert.deepEqual(quarantined,[]);
 assert.equal(accepted.reduce((n,r)=>n+r.sessions.length,0),5);
 const n=normalizeRecord(accepted[1],{allowLive:true,allowedHosts:['www.darwinmuseum.ru']});
 assert.equal(n.occurrences.length,2);assert.equal(n.occurrences[0]!.price.kind,'KNOWN');assert.equal(n.occurrences[0]!.price.totalMaxMinor,null);
 assert.equal(n.occurrences[0]!.endsAt,null);
 assert.ok(n.occurrences.every(x=>x.place.venueName==='Государственный Дарвиновский музей'));
});
test('malformed source and duplicate identities quarantine',()=>{
 const invalid=structuredClone(file);invalid.records[0].source_url='https://example.org/fake';invalid.records[1].identity=invalid.records[2].identity;
 const result=curatedOfficialImport(invalid,['www.darwinmuseum.ru']);
 assert.equal(result.quarantined.length,2);
});
test('curated files reject event identities reused across a batch',()=>{
 const first=structuredClone(file),second=structuredClone(file);
 second.records=second.records.slice(0,1);
 assert.throws(()=>assertDistinctCuratedFiles([first,second]),/CURATED_BATCH_DUPLICATE_EVENT/);
 second.records[0]!.identity='second-event';
 assert.throws(()=>assertDistinctCuratedFiles([first,second]),/CURATED_BATCH_DUPLICATE_SESSION/);
 second.records[0]!.sessions[0]!.identity='second-session';
 assert.doesNotThrow(()=>assertDistinctCuratedFiles([first,second]));
});
test('Tretyakov catalog contains only explicitly published sessions',()=>{
 const result=curatedOfficialImport(tretyakovExact,['www.tretyakovgallery.ru']);
 assert.deepEqual(result.quarantined,[]);
 assert.equal(result.accepted.reduce((n,record)=>n+record.sessions.length,0),12);
 assert.deepEqual([...new Set(result.accepted.flatMap(record=>record.categories))].sort(),['CINEMA','MUSEUM']);
 assert.ok(result.accepted.every(record=>record.sourceUrl?.startsWith('https://www.tretyakovgallery.ru/')===true));
 assert.ok(result.accepted.every(record=>record.sessions.length===1));
});
test('KudaGo catalog has 150 future exact sessions with preserved source links',()=>{
 const files=[kudagoA,kudagoB];
 assert.doesNotThrow(()=>assertDistinctCuratedFiles(files));
 const parsed=files.map(file=>curatedOfficialImport(file,['kudago.com','www.kudago.com']));
 assert.ok(parsed.every(result=>result.quarantined.length===0));
 const records=parsed.flatMap(result=>result.accepted);
 assert.equal(records.reduce((count,record)=>count+record.sessions.length,0),150);
 assert.ok(records.every(record=>record.sourceUrl?.startsWith('https://kudago.com/msk/event/')===true));
 assert.deepEqual([...new Set(records.flatMap(record=>record.categories))].sort(),['CINEMA','CONCERT','MUSEUM','OTHER','THEATRE']);
 assert.equal(records[0]!.title,'экскурсия для детей «От Ван Гога до Матисса»');
});
test('price grammar does not claim complete payable total',()=>{
 assert.equal(factualPrice('от 500 ₽','OCCURRENCE','UNKNOWN').kind,'FROM');
 assert.equal(factualPrice('500–900 ₽','OCCURRENCE','UNKNOWN').kind,'RANGE');
 assert.equal(factualPrice(null,'OCCURRENCE','UNKNOWN').kind,'UNKNOWN');
 assert.equal(factualPrice('0 ₽','OCCURRENCE','UNKNOWN').kind,'UNKNOWN');
});
test('KudaGo ad status without a discriminator remains quarantined',()=>{
 assert.equal(classifyKudaGoAdvertising({id:1,title:'Example'}).reason,'AD_STATUS_UNPROVEN');
 assert.equal(classifyKudaGoAdvertising({id:1,erid:'123'}).reason,'EXPLICIT_AD_EVIDENCE');
 const receipt={provider_event_id:'1',source_url:'https://kudago.com/msk/event/example/',response_sha256:'a'.repeat(64),reviewed_at:'2026-09-26T14:14:00.000Z',page_review_sha256:'b'.repeat(64),rights_note:'Exact source page and ad status manually reviewed',factual_display_approved:true as const};
 assert.equal(classifyKudaGoAdvertising({id:1,site_url:receipt.source_url},receipt,'a'.repeat(64)).status,'ACCEPT');
 assert.equal(classifyKudaGoAdvertising({id:1,site_url:receipt.source_url},receipt,'c'.repeat(64)).reason,'ADMISSION_MANIFEST_MISMATCH');
 assert.equal(classifyKudaGoAdvertising({id:1,site_url:receipt.source_url,details:{erid:'x'}},receipt,'a'.repeat(64)).reason,'EXPLICIT_AD_EVIDENCE');
});
test('movie showing identity, source granularity, range and null end',()=>{
 const raw={id:123,movie:{id:12},place:{id:8,title:'Кинотеатр',address:'Москва'},datetime:1790441100,price:'100–400 руб.'};
 const movie={id:12,title:'Фильм',site_url:'https://kudago.com/movie/film/'};
 const record=kudagoMovieShowingAdapter(raw,movie,{fetchedAt:'2026-09-26T12:00:00.000Z',responseSha256:'a'.repeat(64),requestId:'probe'});
 assert.equal(record.providerEventId,'12');assert.equal(record.sessions[0]!.nativeSessionId,'123');assert.equal(record.sessions[0]!.endsAt,null);
 assert.equal(record.sessions[0]!.price?.kind,'RANGE');assert.equal(record.sessions[0]!.timeEvidence?.sourceGranularity,'MOVIE_PAGE');
});
test('sport registry range creates no invented occurrence',()=>{
 const r=moscowSportCalendarAdapter({registry_id:'52721',title:'Соревнования',sport:'Кёрлинг',venue:'Москва',starts_on:'2026-10-01',ends_on:'2026-10-31',organizer:'Москомспорт',source_url:'https://www.mos.ru/upload/documents/files/1077/EKP_2026_24042026.pdf',document_hash:'a'.repeat(64)},'2026-09-26T12:00:00.000Z');
 assert.equal(r.sessions.length,0);
});
test('RSS pubDate is not occurrence time; ICS respects timezone and cancellation',()=>{
 const rss='<rss><channel><item><guid>x</guid><title>T</title><link>https://example.org/t</link><pubDate>Sat, 26 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>';
 const item=officialRssAdapter(rss,'https://example.org/feed')[0]!;assert.equal(item.start,null);assert.ok(item.pubDate);
 const ics='BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x\r\nDTSTART;TZID=Europe/Moscow:20261003T103000\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\nEND:VCALENDAR';
 const event=officialIcsAdapter(ics)[0]!;assert.equal(event.uid,'x');assert.equal(event.status,'CANCELLED');assert.equal(event.start,null);
 const active=officialIcsAdapter(ics.replace('STATUS:CANCELLED','STATUS:CONFIRMED'))[0]!;assert.equal(active.start,'2026-10-03T10:30:00+03:00');
});
test('operator CSV and ICS retain mandatory provenance and exact session identity',()=>{
 const head='identity,source_url,source_owner,reviewed_at,source_hash,rights_note,title,category,session_identity,starts_at,ends_at,venue_id,venue_name,address,price_text,fee_status,price_scope';
 const line=['x','https://www.darwinmuseum.ru/x','Museum','2026-09-26T12:00:00.000Z','a'.repeat(64),'Facts only','Title','OTHER','s1','2026-10-03T10:30:00+03:00','','','','','','UNKNOWN','OCCURRENCE'].join(',');
 const csv=parseCuratedCsv(head+'\n'+line,'2026-09-26T00:00:00.000Z');assert.equal(csv.records[0]!.sessions[0]!.identity,'s1');
 const ics=`BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:s1\r\nDTSTART;TZID=Europe/Moscow:20261003T103000\r\nSUMMARY:Title\r\nX-POVOD-SOURCE-URL:https://www.darwinmuseum.ru/x\r\nX-POVOD-SOURCE-OWNER:Museum\r\nX-POVOD-REVIEWED-AT:2026-09-26T12:00:00.000Z\r\nX-POVOD-SOURCE-HASH:${'a'.repeat(64)}\r\nX-POVOD-RIGHTS-NOTE:Facts only\r\nX-POVOD-CATEGORY:OTHER\r\nEND:VEVENT\r\nEND:VCALENDAR`;
 const parsed=parseCuratedIcs(ics,'2026-09-26T00:00:00.000Z');assert.equal(parsed.records[0]!.sessions[0]!.starts_at,'2026-10-03T10:30:00+03:00');
});
test('canonical real occurrence projects to source-linked Search candidate without invented total',()=>{
 const record=curatedOfficialImport(file,['www.darwinmuseum.ru']).accepted[1]!;
 const normalized=normalizeRecord(record,{allowLive:true,allowedHosts:['www.darwinmuseum.ru']});
 const p:Provenance={...normalized.event!.provenance,projectionSha256:normalized.projectionSha256!,observationId:'00000000-0000-4000-a000-000000000000',fragmentPath:null};
 const event:Event={id:'00000000-0000-4000-a000-000000000001',sourceId:record.sourceId,providerEventId:record.providerEventId,title:record.title,categories:record.categories,categoriesComplete:true,categoryMappingVerified:true,sourceUrl:record.sourceUrl,provenance:p,semanticHash:'a'.repeat(64)};
 const proposal=normalized.occurrences[0]!;
 const occurrence:Occurrence={...proposal,id:'00000000-0000-4000-a000-000000000002',eventId:event.id,revision:1,semanticHash:'b'.repeat(64),provenance:{...p,fragmentPath:proposal.path}};
 const candidate=candidateFromCanonical(event,occurrence,'2026-09-26T13:55:00.000Z','2026-11-10T13:55:00.000Z');
 assert.equal(candidate.provenance.data_mode,'LIVE');assert.equal(candidate.provenance.source_url,record.sourceUrl);
 assert.equal(candidate.price.base_price.knownness,'KNOWN');assert.equal(candidate.price.total_price.knownness,'UNKNOWN');
 assert.equal(candidate.ref.occurrence_id,'2026-10-09-1130');
 const corrected=candidateFromCanonical({...event,title:'Исправленное название'},occurrence,'2026-09-26T13:55:00.000Z','2026-11-10T13:55:00.000Z');
 assert.notEqual(corrected.provenance.observation_id,candidate.provenance.observation_id);
});
