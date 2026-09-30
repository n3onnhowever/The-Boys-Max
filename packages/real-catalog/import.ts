import type {Pool} from 'pg';
import {hash,type Event,type Occurrence} from '../domain/event.ts';
import {canonicalCatalog} from '../persistence/canonical-catalog.ts';
import {curatedOfficialImport,type CuratedFile} from './adapters.ts';
import {priceFromQuote} from '../../modules/search/core/price.ts';
import {parseCandidate} from '../../modules/search/core/candidate.ts';
import {canonical} from '../../modules/search/core/guard.ts';
import type {Candidate,PriceQuote} from '../../modules/search/core/types.ts';

const uuid=(value:string)=>{const h=hash(value);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};

/** Reject cross-file collisions before any catalog transaction starts. */
export function assertDistinctCuratedFiles(files:readonly CuratedFile[]):void{
 const events=new Set<string>();
 const sessions=new Set<string>();
 for(const file of files)for(const record of file.records){
  if(events.has(record.identity))throw Error('CURATED_BATCH_DUPLICATE_EVENT');
  events.add(record.identity);
  for(const session of record.sessions){
   const identity=`${record.source_url}:${session.identity}`;
   if(sessions.has(identity))throw Error('CURATED_BATCH_DUPLICATE_SESSION');
   sessions.add(identity);
  }
 }
}
function candidateQuote(o:Occurrence):PriceQuote{
 const p=o.price,common={basis:p.basis,currency:p.currency,source_field:'source.price_text',fees_known:p.feesKnown,fee_mode:p.feeMode,fee_evidence_ref:p.feesKnown?'source.fee_status':null,extras:[],warnings:[]};
 if(p.kind==='FREE')return {...common,kind:'FREE'};
 if(p.kind==='KNOWN')return {...common,kind:'EXACT',exact_minor:p.quoteMinMinor};
 if(p.kind==='RANGE')return {...common,kind:'RANGE',min_minor:p.quoteMinMinor,max_minor:p.quoteMaxMinor};
 if(p.kind==='FROM')return {...common,kind:'FROM',min_minor:p.quoteMinMinor};
 return {...common,kind:'UNKNOWN',warnings:p.kind==='CONDITIONAL'?[{code:'CONDITIONAL_PRICE',field:'price',message:'Цена имеет обязательные условия; итог не подтверждён.'}]:[]};
}
export function candidateFromCanonical(event:Event,o:Occurrence,reviewedAt:string,reviewDueAt:string):Candidate{
 // A corrected canonical title is a new immutable Search observation.  The
 // upstream response hash alone cannot represent that presentation change.
 const observationId=uuid(['real-catalog/2',event.providerEventId,o.aliasValue,o.provenance.responseSha256,event.title].join(':'));
 const sourceUrl=o.provenance.sourceUrl;
 if(!sourceUrl)throw Error('REAL_SOURCE_LINK_REQUIRED');
 return parseCandidate({schema_version:'max.event-occurrence/3-candidate',ref:{kind:'EXTERNAL',provider_id:'ManualProvider',event_id:event.providerEventId,occurrence_id:o.aliasValue,native_occurrence_id:o.nativeSessionId},
  untrusted_title:event.title,untrusted_description:'Факты проверены по официальной странице организатора. Подробности и условия посещения — в первоисточнике.',
  city_id:'msk',starts_at:o.startsAt,ends_at:o.endsAt,time_precision:'EXACT_OCCURRENCE',categories:{known:event.categories,complete:event.categoriesComplete,mapping_verified:event.categoryMappingVerified},
  price:priceFromQuote(candidateQuote(o),observationId),inventory:{remaining:null,observed_at:null},indoor:null,wheelchair_accessible:null,status:o.lifecycle,listing_state:o.listing,provider_health:'UNKNOWN',
  venue:{id:o.place.providerVenueId,address:o.place.address,coordinates:null,coordinate_meaning:'UNKNOWN'},
  provenance:{observation_id:observationId,observed_at:o.provenance.fetchedAt,fetched_at:o.provenance.fetchedAt,provider_updated_at:null,source_url:sourceUrl,payload_sha256:o.provenance.responseSha256,transform_version:'curated-official-v1',field_sources:{date:['source.sessions.starts_at'],price:['source.sessions.price_text'],place:['source.sessions.venue_name','source.sessions.address']},data_mode:'LIVE'},
  rights:{policy_id:'first-party-facts',policy_revision:'v1',reviewed_at:reviewedAt,review_due_at:reviewDueAt,revoked_at:null,display_facts:'ALLOWED',display_text:'ALLOWED',display_images:'DENIED',persist_minimal:'ALLOWED',ad_clearance:'CLEARED',evidence_refs:[sourceUrl,o.provenance.responseSha256]},
  warnings:[{code:'SOURCE_FACTS_ONLY',field:'provenance',message:'Факты из официального источника; наличие мест и окончательная цена не подтверждены.'}]});
}

/** Explicit operator command; source review is never triggered by a request or API startup. */
export async function importCuratedOfficialCatalog(pool:Pool,file:CuratedFile,allowedHosts:readonly string[]=['www.darwinmuseum.ru','darwinmuseum.ru']){
 if(!allowedHosts.length||allowedHosts.length>20||allowedHosts.some(host=>!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(host)))throw Error('CURATED_SOURCE_HOSTS_INVALID');
 const parsed=curatedOfficialImport(file,allowedHosts);
 if(parsed.quarantined.length)throw Error('CURATED_IMPORT_QUARANTINED:'+JSON.stringify(parsed.quarantined));
 const catalog=canonicalCatalog(pool);await catalog.registerCuratedOfficialSource();
 const run=await catalog.beginRun('real:curated-official:v1',hash(['curated-official/v1',file.as_of]));
 const page=await catalog.dispatchPage(run.runId,run.epoch,1);
 const committed=await catalog.commitPage(page.pageId,run.epoch,parsed.accepted.map(record=>({...record,requestId:run.runId})),{allowedHosts,allowLive:true},true);
 if(committed.status!=='COMMITTED'||committed.quarantined!==0||committed.accepted!==parsed.accepted.reduce((n,r)=>n+r.sessions.length,0))throw Error('CURATED_CANONICAL_COMMIT_INCOMPLETE');
 await catalog.finishRun(run.runId,run.epoch);
 let candidates=0;
 const reviewById=new Map(file.records.map(r=>[r.identity,r.reviewed_at]));
 const rows=await pool.query<{id:string;provider_event_id:string}>("SELECT o.id,e.provider_event_id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id='real:curated-official:v1'");
 for(const row of rows.rows){
  const pair=await catalog.readOccurrence(row.id);if(!pair)throw Error('CURATED_OCCURRENCE_MISSING');
  const reviewed=reviewById.get(row.provider_event_id);if(!reviewed)continue;
  const due=new Date(Date.parse(reviewed)+45*86400000).toISOString();
  const candidate=candidateFromCanonical(pair.event,pair.occurrence,reviewed,due);
  await pool.query("INSERT INTO catalog_occurrences(observation_id,provider_id,event_id,occurrence_id,body,data_mode) VALUES($1,$2,$3,$4,$5,'LIVE') ON CONFLICT(observation_id) DO NOTHING",[candidate.provenance.observation_id,candidate.ref.provider_id,candidate.ref.event_id,candidate.ref.occurrence_id,candidate]);
  const prior=await pool.query<{body:unknown}>('SELECT body FROM catalog_occurrences WHERE observation_id=$1',[candidate.provenance.observation_id]);
  if(!prior.rows[0]||canonical(prior.rows[0].body)!==canonical(candidate))throw Error('CURATED_PROJECTION_CONFLICT');
  candidates++;
 }
 return {events:parsed.accepted.length,occurrences:committed.accepted,searchCandidates:candidates,quarantined:0};
}
