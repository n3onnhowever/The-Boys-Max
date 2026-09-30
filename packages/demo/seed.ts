import type {Pool} from 'pg';
import {canonicalCatalog} from '../persistence/canonical-catalog.ts';
import {hash} from '../domain/event.ts';
import {normalizePrice} from '../domain/event-normalizer.ts';
import {canonical} from '../../modules/search/core/guard.ts';
import {DEMO_ITEMS,DEMO_PROVIDER_ID,DEMO_SOURCE_ID,demoCandidate,demoEventId,demoRecord} from './catalog-v3.ts';

/** Explicit operator action. Neither API startup nor a failed live fetch calls this. */
export async function seedDemoCatalog(pool:Pool,origin:string){
 const host=new URL(origin).hostname,catalog=canonicalCatalog(pool);
 await catalog.registerSyntheticSource(DEMO_SOURCE_ID,DEMO_PROVIDER_ID,'owned-demo/v3');
 const prior=await pool.query<{count:string}>("SELECT count(*)::text AS count FROM canonical_events WHERE source_id=$1",[DEMO_SOURCE_ID]);
 if(Number(prior.rows[0]?.count)===0){
  const run=await catalog.beginRun(DEMO_SOURCE_ID,hash('povod-demo-catalog/v3'));
  const page=await catalog.dispatchPage(run.runId,run.epoch,1);
  const records=DEMO_ITEMS.map((item,index)=>demoRecord(item,index,origin));
  const accepted=await catalog.commitPage(page.pageId,run.epoch,records,{allowedHosts:[host],allowLive:false},true);
  if(accepted.status!=='COMMITTED'||accepted.accepted!==DEMO_ITEMS.length||accepted.quarantined!==0)throw Error('DEMO_CANONICAL_SEED_INCOMPLETE');
  await catalog.finishRun(run.runId,run.epoch);
 }
 const facts=await pool.query<{provider_event_id:string;title:string;starts_at:Date;price:{kind:string};response_sha256:string;source_url:string}>("SELECT e.provider_event_id,e.title,o.starts_at,o.price,b.response_sha256,e.source_url FROM canonical_events e JOIN canonical_occurrences o ON o.event_id=e.id JOIN source_observations b ON b.id=e.accepted_observation_id WHERE e.source_id=$1 ORDER BY e.provider_event_id",[DEMO_SOURCE_ID]);
 if(facts.rows.length!==DEMO_ITEMS.length||DEMO_ITEMS.some((item,index)=>!facts.rows.some(row=>row.provider_event_id===demoEventId(item)&&row.title===item.title&&row.starts_at.toISOString()===new Date(item.start).toISOString()&&row.price.kind===normalizePrice(demoRecord(item,index,origin).price).kind&&row.response_sha256===hash(['povod-demo-v3',item])&&row.source_url===`${origin}/demo/source/v3/${item.id}`)))throw Error('DEMO_CANONICAL_VERSION_CONFLICT');
 for(const [index,item] of DEMO_ITEMS.entries()){
  const candidate=demoCandidate(item,index);
  await pool.query("INSERT INTO catalog_occurrences(observation_id,provider_id,event_id,occurrence_id,body,data_mode) VALUES($1,$2,$3,$4,$5,'SYNTHETIC') ON CONFLICT(observation_id) DO NOTHING",
   [candidate.provenance.observation_id,candidate.ref.provider_id,candidate.ref.event_id,candidate.ref.occurrence_id,candidate]);
  const stored=await pool.query<{body:unknown}>("SELECT body FROM catalog_occurrences WHERE observation_id=$1 AND data_mode='SYNTHETIC'",[candidate.provenance.observation_id]);
  if(!stored.rows[0]||canonical(stored.rows[0].body)!==canonical(candidate))throw Error('DEMO_SEARCH_VERSION_CONFLICT');
 }
 const canonicalRows=await pool.query<{count:string}>("SELECT count(*)::text AS count FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id WHERE e.source_id=$1",[DEMO_SOURCE_ID]);
 if(Number(canonicalRows.rows[0]?.count)!==DEMO_ITEMS.length)throw Error('DEMO_CANONICAL_COUNT_MISMATCH');
 return {demoCatalog:'v3',canonicalOccurrences:Number(canonicalRows.rows[0]?.count),searchCandidates:DEMO_ITEMS.length};
}
