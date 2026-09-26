import {readFileSync} from 'node:fs';
import {Pool} from 'pg';
import {hash} from '../packages/domain/event.ts';
import {canonicalCatalog} from '../packages/persistence/canonical-catalog.ts';
import {moscowSportCalendarAdapter} from '../packages/real-catalog/adapters.ts';

const path=process.argv[2];if(!path)throw Error('SPORT_FILE_PATH_REQUIRED');
const url=process.env.DATABASE_URL;if(!url)throw Error('DATABASE_URL_REQUIRED');
const file=JSON.parse(readFileSync(path,'utf8')) as {schema:string;source_url:string;document_hash:string;reviewed_at:string;rows:Record<string,string>[]};
if(file.schema!=='povod.moscow-sport-ekp/1'||!Array.isArray(file.rows)||file.rows.length>100)throw Error('SPORT_FILE_INVALID');
const records=file.rows.map((row,i)=>({...moscowSportCalendarAdapter({...row,source_url:file.source_url,document_hash:file.document_hash} as Parameters<typeof moscowSportCalendarAdapter>[0],file.reviewed_at),recordOrdinal:i}));
if(new Set(records.map(r=>r.providerEventId)).size!==records.length)throw Error('SPORT_REGISTRY_DUPLICATE');
const pool=new Pool({connectionString:url});
try{
 const catalog=canonicalCatalog(pool);await catalog.registerMoscowSportRangeSource();
 const run=await catalog.beginRun('real:moscow-sport-ekp:2026',hash(['ekp-2026',file.document_hash]));
 const page=await catalog.dispatchPage(run.runId,run.epoch,1);
 const result=await catalog.commitPage(page.pageId,run.epoch,records.map(record=>({...record,requestId:run.runId})),{allowedHosts:['www.mos.ru','mos.ru'],allowLive:true},true);
 if(result.status!=='COMMITTED'||result.quarantined!==0||result.accepted!==0)throw Error('SPORT_RANGE_IMPORT_INCOMPLETE');
 await catalog.finishRun(run.runId,run.epoch);
 console.log(JSON.stringify({events:records.length,occurrences:0,reason:'EKP_DATE_RANGES_ARE_NOT_EXACT_SESSIONS'}));
}finally{await pool.end();}
