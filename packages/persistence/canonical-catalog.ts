import {randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {transaction} from './sessions.ts';
import {hash,type Event,type Occurrence,type Place,type Price,type Provenance} from '../domain/event.ts';
import {normalizePage,semanticEvent,semanticOccurrence,type NormalizationPolicy} from '../domain/event-normalizer.ts';
import type {NormalizedRecord,OccurrenceProposal} from '../domain/event.ts';

type SourceRow={id:string;provider_id:string;data_mode:'SYNTHETIC'|'LIVE';admission_state:string;rights_revision:string;fence:string};
type RunRow={id:string;source_id:string;epoch:string;source_fence:string;status:string;next_page:number;partial_count:number;failed_pages:number;query_exhausted:boolean};
type PageRow={id:string;run_id:string;page_number:number;request_seq:string;status:string};
const fail=(code:string):never=>{throw Error(code);};
const json=(value:unknown)=>JSON.stringify(value);
const uuid=(value:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
async function sourceFor(c:PoolClient,id:string):Promise<SourceRow>{
  return (await c.query<SourceRow>('SELECT * FROM catalog_sources WHERE id=$1 FOR UPDATE',[id])).rows[0]??fail('SOURCE_NOT_REGISTERED');
}
async function runFor(c:PoolClient,id:string):Promise<RunRow>{
  return (await c.query<RunRow>('SELECT * FROM catalog_sync_runs WHERE id=$1 FOR UPDATE',[id])).rows[0]??fail('RUN_NOT_FOUND');
}
async function sourceIdFor(c:PoolClient,runId:string):Promise<string>{
  return (await c.query<{source_id:string}>('SELECT source_id FROM catalog_sync_runs WHERE id=$1',[runId])).rows[0]?.source_id??fail('RUN_NOT_FOUND');
}
async function quarantine(c:PoolClient,sourceId:string,runId:string,page:number,ordinal:number|null,eventId:string|null,path:string,code:string,fieldHash?:string){
  await c.query('INSERT INTO catalog_normalization_quarantine(id,source_id,run_id,page_number,record_ordinal,provider_event_id,path,code,field_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [randomUUID(),sourceId,runId,page,ordinal,eventId,path.slice(0,200),code.slice(0,128),fieldHash??null]);
}
async function venueId(c:PoolClient,sourceId:string,place:Place):Promise<string|null>{
  if(!place.providerVenueId)return null;
  const row=await c.query<{id:string}>('INSERT INTO canonical_venues(id,source_id,provider_venue_id) VALUES($1,$2,$3) ON CONFLICT(source_id,provider_venue_id) DO UPDATE SET provider_venue_id=EXCLUDED.provider_venue_id RETURNING id',
    [randomUUID(),sourceId,place.providerVenueId]);
  return row.rows[0]!.id;
}
async function upsertOccurrence(c:PoolClient,eventId:string,sourceId:string,observationId:string,row:NormalizedRecord,proposal:OccurrenceProposal){
  const p=row.event!.provenance;
  const match=(await c.query<{occurrence_id:string}>('SELECT occurrence_id FROM occurrence_aliases WHERE event_id=$1 AND alias_type=$2 AND alias_value=$3 FOR UPDATE',
    [eventId,proposal.aliasType,proposal.aliasValue])).rows[0];
  const old=match?(await c.query<{revision:number;semantic_hash:string;lifecycle:string}>('SELECT revision,semantic_hash,lifecycle FROM canonical_occurrences WHERE id=$1 FOR UPDATE',[match.occurrence_id])).rows[0]:null;
  const lifecycle=old?.lifecycle==='CANCELLED'&&proposal.lifecycle==='UNKNOWN'?'CANCELLED':proposal.lifecycle;
  const semantic=semanticOccurrence({...proposal,lifecycle});
  const values=[proposal.nativeSessionId,proposal.path,proposal.startsAt,proposal.endsAt,proposal.timeZone,await venueId(c,sourceId,proposal.place),
    json(proposal.place),json(proposal.price),lifecycle,proposal.confirmation,proposal.listing,semantic,observationId,p.fetchedAt,p.sourceUrl,
    p.transformVersion,json(proposal.timePaths),json(proposal.timeEvidence),json(proposal.place.evidencePaths)];
  if(match){
    const changed=old!.semantic_hash!==semantic;
    await c.query('UPDATE canonical_occurrences SET native_session_id=$2,fragment_path=$3,starts_at=$4,ends_at=$5,time_zone=$6,venue_id=$7,place=$8,price=$9,lifecycle=$10,confirmation=$11,listing=$12,semantic_hash=$13,accepted_observation_id=$14,fetched_at=$15,source_url=$16,transform_version=$17,time_paths=$18,time_evidence=$19,place_paths=$20,revision=revision+$21 WHERE id=$1',
      [match.occurrence_id,...values,changed?1:0]);
    return {id:match.occurrence_id,revision:old!.revision+(changed?1:0)};
  }
  const id=randomUUID();
  await c.query('INSERT INTO canonical_occurrences(id,event_id,native_session_id,fragment_path,starts_at,ends_at,time_zone,venue_id,place,price,lifecycle,confirmation,listing,semantic_hash,accepted_observation_id,fetched_at,source_url,transform_version,time_paths,time_evidence,place_paths) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)',
    [id,eventId,...values]);
  await c.query('INSERT INTO occurrence_aliases(event_id,alias_type,alias_value,occurrence_id) VALUES($1,$2,$3,$4)',[eventId,proposal.aliasType,proposal.aliasValue,id]);
  return {id,revision:1};
}
export function canonicalCatalog(pool:Pool){
  return {
    async registerSyntheticSource(sourceId:string,providerId:string,rightsRevision:string){
      if(!sourceId.startsWith('synthetic:')||sourceId.length>256||!providerId||!rightsRevision)fail('SYNTHETIC_SOURCE_INVALID');
      await pool.query("INSERT INTO catalog_sources(id,provider_id,data_mode,admission_state,rights_revision) VALUES($1,$2,'SYNTHETIC','SYNTHETIC',$3) ON CONFLICT(id) DO NOTHING",
        [sourceId,providerId,rightsRevision]);
      const row=(await pool.query<SourceRow>('SELECT * FROM catalog_sources WHERE id=$1',[sourceId])).rows[0];
      if(row?.data_mode!=='SYNTHETIC'||row.provider_id!==providerId||row.rights_revision!==rightsRevision)fail('SOURCE_ID_CONFLICT');
    },
    async beginRun(sourceId:string,scopeHash:string){
      if(!/^[a-f0-9]{64}$/.test(scopeHash))fail('SCOPE_HASH_INVALID');
      return transaction(pool,async c=>{
        const source=await sourceFor(c,sourceId);
        if(source.admission_state!=='SYNTHETIC'&&source.admission_state!=='APPROVED')fail('SOURCE_NOT_ADMITTED');
        const fence=(await c.query<{fence:string}>('UPDATE catalog_sources SET fence=fence+1 WHERE id=$1 RETURNING fence',[sourceId])).rows[0]!.fence;
        const runId=randomUUID(),epoch=randomUUID();
        await c.query("INSERT INTO catalog_sync_runs(id,source_id,scope_hash,epoch,source_fence,status) VALUES($1,$2,$3,$4,$5,'RUNNING')",
          [runId,sourceId,scopeHash,epoch,fence]);
        return {runId,epoch,sourceFence:fence};
      });
    },
    async dispatchPage(runId:string,epoch:string,pageNumber:number){
      if(!uuid(runId)||!uuid(epoch)||!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>50)fail('DISPATCH_ARGUMENT_INVALID');
      return transaction(pool,async c=>{
        const source=await sourceFor(c,await sourceIdFor(c,runId)),run=await runFor(c,runId);
        if(run.status!=='RUNNING'||run.epoch!==epoch||run.source_fence!==source.fence)fail('RUN_FENCED');
        if(run.next_page!==pageNumber)fail('PAGE_CHECKPOINT_MISMATCH');
        const prior=(await c.query<PageRow>('SELECT * FROM catalog_sync_pages WHERE run_id=$1 AND page_number=$2',[runId,pageNumber])).rows[0];
        if(prior)return {pageId:prior.id,requestSeq:prior.request_seq};
        const seq=(await c.query<{next_request_seq:string}>('UPDATE catalog_sources SET next_request_seq=next_request_seq+1 WHERE id=$1 RETURNING next_request_seq',[source.id])).rows[0]!.next_request_seq;
        const pageId=randomUUID();
        await c.query("INSERT INTO catalog_sync_pages(id,run_id,page_number,request_seq,status) VALUES($1,$2,$3,$4,'DISPATCHED')",[pageId,runId,pageNumber,seq]);
        return {pageId,requestSeq:seq};
      });
    },
    /** Acceptance never infers missing listings or cancellation from a page. */
    async commitPage(pageId:string,epoch:string,rawRecords:readonly unknown[],policy:NormalizationPolicy,queryExhausted:boolean){
      const rows=normalizePage(rawRecords,policy);
      return transaction(pool,async c=>{
        const runId=(await c.query<{run_id:string}>('SELECT run_id FROM catalog_sync_pages WHERE id=$1',[pageId])).rows[0]?.run_id??fail('PAGE_NOT_FOUND');
        const source=await sourceFor(c,await sourceIdFor(c,runId)),run=await runFor(c,runId);
        const page=(await c.query<PageRow>('SELECT * FROM catalog_sync_pages WHERE id=$1 FOR UPDATE',[pageId])).rows[0]??fail('PAGE_NOT_FOUND');
        if(page.status==='COMMITTED')return {status:'REPLAYED' as const,accepted:0,quarantined:0};
        if(run.status!=='RUNNING'||run.epoch!==epoch||run.source_fence!==source.fence||page.status!=='DISPATCHED')return {status:'FENCED' as const,accepted:0,quarantined:0};
        if(page.page_number!==run.next_page)fail('PAGE_CHECKPOINT_MISMATCH');
        if(source.admission_state!=='SYNTHETIC'&&source.admission_state!=='APPROVED')fail('SOURCE_NOT_ADMITTED');
        let accepted=0,quarantined=0,partial=0;
        for(let i=0;i<rows.length;i++){
          const row=rows[i]!;
          if(!row.event){
            quarantined++;partial++;
            for(const r of row.reasons)await quarantine(c,source.id,run.id,page.page_number,i,null,r.path,r.code,r.fieldHash);
            continue;
          }
          const event=row.event,p=event.provenance;
          if(p.sourceId!==source.id||p.providerId!==source.provider_id||p.dataMode!==source.data_mode||p.rightsRevision!==source.rights_revision)fail('SOURCE_PROVENANCE_MISMATCH');
          const prior=(await c.query<{id:string;last_request_seq:string}>('SELECT id,last_request_seq FROM canonical_events WHERE source_id=$1 AND provider_event_id=$2 FOR UPDATE',
            [source.id,event.providerEventId])).rows[0];
          const disposition=prior&&BigInt(prior.last_request_seq)>BigInt(page.request_seq)?'STALE_IGNORED':row.reasons.some(r=>r.code==='DUPLICATE_SOURCE_ROW')?'DUPLICATE':row.outcome;
          const observationId=randomUUID();
          await c.query('INSERT INTO source_observations(id,source_id,provider_event_id,request_id,record_ordinal,request_seq,fetched_at,source_url,response_sha256,projection_sha256,transform_version,rights_revision,disposition) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
            [observationId,source.id,event.providerEventId,p.requestId,p.recordOrdinal,page.request_seq,p.fetchedAt,p.sourceUrl,p.responseSha256,row.projectionSha256,p.transformVersion,p.rightsRevision,disposition]);
          if(disposition==='STALE_IGNORED'||disposition==='DUPLICATE')continue;
          const eventHash=semanticEvent(event),eventId=prior?.id??randomUUID();
          if(prior)await c.query('UPDATE canonical_events SET title=$2,categories=$3,categories_complete=$4,category_mapping_verified=$5,source_url=$6,semantic_hash=$7,last_request_seq=$8,accepted_observation_id=$9,fetched_at=$10 WHERE id=$1',
            [eventId,event.title,json(event.categories),event.categoriesComplete,event.categoryMappingVerified,event.sourceUrl,eventHash,page.request_seq,observationId,p.fetchedAt]);
          else await c.query('INSERT INTO canonical_events(id,source_id,provider_event_id,title,categories,categories_complete,category_mapping_verified,source_url,semantic_hash,last_request_seq,accepted_observation_id,fetched_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
            [eventId,source.id,event.providerEventId,event.title,json(event.categories),event.categoriesComplete,event.categoryMappingVerified,event.sourceUrl,eventHash,page.request_seq,observationId,p.fetchedAt]);
          for(const proposal of row.occurrences){await upsertOccurrence(c,eventId,source.id,observationId,row,proposal);accepted++;}
          if(row.outcome==='PARTIAL_ACCEPT')partial++;
          for(const r of row.reasons)await quarantine(c,source.id,run.id,page.page_number,p.recordOrdinal,event.providerEventId,r.path,r.code,r.fieldHash);
          for(const f of row.fragments)for(const r of f.reasons)await quarantine(c,source.id,run.id,page.page_number,p.recordOrdinal,event.providerEventId,r.path,r.code,r.fieldHash);
        }
        await c.query("UPDATE catalog_sync_pages SET status='COMMITTED',record_count=$2,accepted_count=$3,quarantined_count=$4,committed_at=clock_timestamp() WHERE id=$1",
          [pageId,rows.length,accepted,quarantined]);
        await c.query('UPDATE catalog_sync_runs SET next_page=next_page+1,query_exhausted=$2,partial_count=partial_count+$3 WHERE id=$1',[run.id,queryExhausted,partial]);
        return {status:'COMMITTED' as const,accepted,quarantined};
      });
    },
    async failPage(pageId:string,epoch:string,reason:'TIMEOUT'|'HTTP_429'|'HTTP_5XX'|'PAGE_FAILURE'){
      return transaction(pool,async c=>{
        const runId=(await c.query<{run_id:string}>('SELECT run_id FROM catalog_sync_pages WHERE id=$1',[pageId])).rows[0]?.run_id??fail('PAGE_NOT_FOUND');
        const source=await sourceFor(c,await sourceIdFor(c,runId)),run=await runFor(c,runId);
        const page=(await c.query<PageRow>('SELECT * FROM catalog_sync_pages WHERE id=$1 FOR UPDATE',[pageId])).rows[0]??fail('PAGE_NOT_FOUND');
        if(run.status!=='RUNNING'||run.epoch!==epoch||run.source_fence!==source.fence||page.status!=='DISPATCHED')return 'FENCED' as const;
        await quarantine(c,source.id,run.id,page.page_number,null,null,'$',reason);
        await c.query("UPDATE catalog_sync_pages SET status='FAILED' WHERE id=$1",[pageId]);
        const committed=(await c.query<{count:string}>("SELECT count(*)::text AS count FROM catalog_sync_pages WHERE run_id=$1 AND status='COMMITTED'",[run.id])).rows[0]!.count;
        await c.query('UPDATE catalog_sync_runs SET status=$2,failed_pages=failed_pages+1,finished_at=clock_timestamp() WHERE id=$1',
          [run.id,BigInt(committed)>0n?'PARTIAL':'FAILED']);
        return 'FAILED' as const;
      });
    },
    async finishRun(runId:string,epoch:string){
      return transaction(pool,async c=>{
        const source=await sourceFor(c,await sourceIdFor(c,runId)),run=await runFor(c,runId);
        if(run.status!=='RUNNING'||run.epoch!==epoch||run.source_fence!==source.fence)fail('RUN_FENCED');
        const outcome=run.query_exhausted&&run.partial_count===0?'SUCCEEDED':'PARTIAL';
        await c.query('UPDATE catalog_sync_runs SET status=$2,finished_at=clock_timestamp() WHERE id=$1',[runId,outcome]);
        if(outcome==='SUCCEEDED')await c.query('UPDATE catalog_sources SET last_success_at=clock_timestamp() WHERE id=$1',[source.id]);
        return outcome;
      });
    },
    async readOccurrence(id:string):Promise<{event:Event;occurrence:Occurrence}|null>{
      if(!uuid(id))return null;
      const row=(await pool.query<Record<string,unknown>>(
        'SELECT e.id AS event_id,e.source_id,s.provider_id,s.data_mode,e.provider_event_id,e.title,e.categories,e.categories_complete,e.category_mapping_verified,e.source_url AS event_url,e.semantic_hash AS event_hash,'+
        'o.id AS occurrence_id,o.native_session_id,o.fragment_path,a.alias_type,a.alias_value,o.starts_at,o.ends_at,o.time_zone,o.place,o.price,o.lifecycle,o.confirmation,o.listing,o.revision,o.semantic_hash,'+
        'b.id AS observation_id,b.request_id,b.record_ordinal,b.fetched_at,b.source_url,b.response_sha256,b.projection_sha256,b.transform_version,b.rights_revision,be.id AS event_observation_id,be.request_id AS event_request_id,be.record_ordinal AS event_record_ordinal,be.fetched_at AS event_fetched_at,be.source_url AS event_source_url,be.response_sha256 AS event_response_sha256,be.projection_sha256 AS event_projection_sha256,be.transform_version AS event_transform_version,be.rights_revision AS event_rights_revision,o.time_paths,o.time_evidence,o.place_paths '+
        'FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id JOIN catalog_sources s ON s.id=e.source_id '+
        'JOIN source_observations b ON b.id=o.accepted_observation_id JOIN source_observations be ON be.id=e.accepted_observation_id '+
        'JOIN LATERAL (SELECT alias_type,alias_value FROM occurrence_aliases WHERE occurrence_id=o.id ORDER BY alias_type,alias_value LIMIT 1) a ON true WHERE o.id=$1',[id])).rows[0];
      if(!row)return null;
      const r=row as Record<string,any>;
      const occurrenceProvenance:Provenance={
        providerId:r.provider_id,providerEventId:r.provider_event_id,sourceId:r.source_id,dataMode:r.data_mode,
        requestId:r.request_id,recordOrdinal:r.record_ordinal,fetchedAt:r.fetched_at.toISOString(),sourceUrl:r.source_url,
        responseSha256:r.response_sha256,projectionSha256:r.projection_sha256,transformVersion:r.transform_version,
        rightsRevision:r.rights_revision,observationId:r.observation_id,fragmentPath:r.fragment_path,timePaths:r.time_paths,placePaths:r.place_paths,
      };
      const eventProvenance:Provenance={...occurrenceProvenance,requestId:r.event_request_id,recordOrdinal:r.event_record_ordinal,fetchedAt:r.event_fetched_at.toISOString(),sourceUrl:r.event_source_url,responseSha256:r.event_response_sha256,projectionSha256:r.event_projection_sha256,transformVersion:r.event_transform_version,rightsRevision:r.event_rights_revision,observationId:r.event_observation_id,fragmentPath:null,timePaths:[],placePaths:[]};
      return {
        event:{id:r.event_id,sourceId:r.source_id,providerEventId:r.provider_event_id,title:r.title,categories:r.categories,categoriesComplete:r.categories_complete,categoryMappingVerified:r.category_mapping_verified,sourceUrl:r.event_url,semanticHash:r.event_hash,provenance:eventProvenance},
        occurrence:{id:r.occurrence_id,eventId:r.event_id,nativeSessionId:r.native_session_id,aliasType:r.alias_type,aliasValue:r.alias_value,
          startsAt:r.starts_at.toISOString(),endsAt:r.ends_at?.toISOString()??null,timeZone:r.time_zone,timeEvidence:r.time_evidence,place:r.place as Place,price:r.price as Price,
          lifecycle:r.lifecycle,confirmation:r.confirmation,listing:r.listing,revision:r.revision,semanticHash:r.semantic_hash,provenance:occurrenceProvenance},
      };
    },
  };
}
