import type {Pool} from 'pg';
import {AppError} from '../domain/errors.ts';
import {canonicalCatalog} from './canonical-catalog.ts';
import {toOccurrenceView} from '../domain/occurrence-view.ts';

export function savedService(pool:Pool,mode:'test'|'demo'|'live'|'hybrid'='test'){
 const catalog=canonicalCatalog(pool);
 const visible=(param:number,source='s')=>`($${param}::text='test' OR ($${param}::text IN ('demo','hybrid') AND ${source}.id='synthetic:povod-demo:v1' AND ${source}.data_mode='SYNTHETIC') OR ($${param}::text IN ('live','hybrid') AND ${source}.data_mode='LIVE' AND ${source}.admission_state='APPROVED'))`;
 return {
  async put(actorId:string,occurrenceId:string){
   const result=await pool.query<{occurrence_id:string}>(
    `INSERT INTO saved_occurrences(actor_id,occurrence_id)
     SELECT $1,o.id FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id JOIN catalog_sources s ON s.id=e.source_id WHERE o.id=$2 AND ${visible(3)}
     ON CONFLICT(actor_id,occurrence_id) DO NOTHING RETURNING occurrence_id`,[actorId,occurrenceId,mode]);
   if(result.rowCount===0){
    const exists=await pool.query(`SELECT 1 FROM canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id JOIN catalog_sources s ON s.id=e.source_id WHERE o.id=$1 AND ${visible(2)}`,[occurrenceId,mode]);
    if(exists.rowCount===0)throw new AppError('OCCURRENCE_NOT_FOUND',404);
   }
   return {saved:true as const};
  },
  async remove(actorId:string,occurrenceId:string){
   await pool.query(`DELETE FROM saved_occurrences x USING canonical_occurrences o JOIN canonical_events e ON e.id=o.event_id JOIN catalog_sources s ON s.id=e.source_id
    WHERE x.actor_id=$1 AND x.occurrence_id=$2 AND o.id=x.occurrence_id AND ${visible(3)}`,[actorId,occurrenceId,mode]);
   return {saved:false as const};
  },
  async list(actorId:string){
   const ids=await pool.query<{occurrence_id:string;saved_at:Date}>(
    `SELECT s.occurrence_id,s.saved_at FROM saved_occurrences s
     JOIN canonical_occurrences o ON o.id=s.occurrence_id
     JOIN canonical_events e ON e.id=o.event_id JOIN catalog_sources src ON src.id=e.source_id
     WHERE s.actor_id=$1 AND ${visible(2,'src')} ORDER BY o.starts_at ASC,s.occurrence_id ASC`,[actorId,mode]);
   const items=[];
   for(const row of ids.rows){
    const current=await catalog.readOccurrence(row.occurrence_id);
    if(current)items.push({savedAt:row.saved_at.toISOString(),occurrence:toOccurrenceView(current.event,current.occurrence,new Date().toISOString())});
   }
   return {items};
  },
  async resolve(actorId:string,sourceId:string,externalEventId:string,occurrenceRef:string){
   const matches=await pool.query<{id:string}>(
    `SELECT DISTINCT o.id FROM canonical_occurrences o
     JOIN canonical_events e ON e.id=o.event_id
     JOIN catalog_sources s ON s.id=e.source_id
     LEFT JOIN occurrence_aliases a ON a.occurrence_id=o.id
     WHERE (e.source_id=$1 OR s.provider_id=$1) AND e.provider_event_id=$2
       AND (o.id::text=$3 OR o.native_session_id=$3 OR a.alias_value=$3)
       AND ${visible(4)}
     LIMIT 2`,[sourceId,externalEventId,occurrenceRef,mode]);
   if(matches.rows.length!==1)return {occurrenceId:null,saved:false};
   const occurrenceId=matches.rows[0]!.id;
   const saved=await pool.query('SELECT 1 FROM saved_occurrences WHERE actor_id=$1 AND occurrence_id=$2',[actorId,occurrenceId]);
   return {occurrenceId,saved:saved.rowCount!==0};
  }
 };
}
