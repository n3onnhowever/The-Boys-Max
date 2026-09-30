import {Pool} from 'pg';

/** Read-only operator diagnostic. Prints counts and gate state, never credentials or user rows. */
const url=process.env.DATABASE_URL;if(!url)throw Error('DATABASE_URL_REQUIRED');
const pool=new Pool({connectionString:url});
try{
 const [clock,sources,projections,rights]=await Promise.all([
  pool.query<{now:string}>("SELECT clock_timestamp()::text AS now"),
  pool.query<{id:string;data_mode:string;admission_state:string;events:number;occurrences:number}>(`SELECT s.id,s.data_mode,s.admission_state,
   count(DISTINCT e.id)::int AS events,count(DISTINCT o.id)::int AS occurrences
   FROM catalog_sources s LEFT JOIN canonical_events e ON e.source_id=s.id
   LEFT JOIN canonical_occurrences o ON o.event_id=e.id
   GROUP BY s.id,s.data_mode,s.admission_state ORDER BY s.id`),
  pool.query<{data_mode:string;count:number}>("SELECT data_mode,count(*)::int AS count FROM catalog_occurrences GROUP BY data_mode ORDER BY data_mode"),
  pool.query<{future_review:number;expired_review:number;displayable_now:number}>(`SELECT
   count(*) FILTER (WHERE (body->'rights'->>'reviewed_at')::timestamptz>clock_timestamp())::int AS future_review,
   count(*) FILTER (WHERE (body->'rights'->>'review_due_at')::timestamptz<=clock_timestamp())::int AS expired_review,
   count(*) FILTER (WHERE (body->'rights'->>'reviewed_at')::timestamptz<=clock_timestamp()
      AND (body->'rights'->>'review_due_at')::timestamptz>clock_timestamp())::int AS displayable_now
   FROM catalog_occurrences WHERE data_mode='LIVE'`),
 ]);
 console.log(JSON.stringify({databaseClock:clock.rows[0]?.now,mode:process.env.APP_MODE??'UNSET',demoCatalogVersion:process.env.DEMO_CATALOG_VERSION??'UNSET',
  curatedSourceHostsConfigured:Boolean(process.env.CURATED_SOURCE_HOSTS),allowedSourceOriginsConfigured:Boolean(process.env.ALLOWED_SOURCE_ORIGINS),
  sources:sources.rows,searchProjectionRows:projections.rows,liveRights: rights.rows[0]},null,2));
}finally{await pool.end();}
