import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';

const rawUrl=process.env.T105_TEST_DATABASE_URL;
if(!rawUrl)throw Error('T105_TEST_DATABASE_URL_REQUIRED');
const url=new URL(rawUrl);
if(!['127.0.0.1','postgres'].includes(url.hostname)||!url.pathname.startsWith('/povod_t105_'))
  throw Error('ISOLATED_T105_DATABASE_REQUIRED');
const client=new pg.Client({connectionString:rawUrl});
await client.connect();
try{
  const existing=await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'");
  if(existing.rows[0].n!==0)throw Error('TEST_DATABASE_NOT_EMPTY');
  await client.query('BEGIN');
  await client.query('CREATE TABLE schema_migrations(id text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT clock_timestamp())');
  for(const name of ['0001_foundation.sql','0002_integration.sql','0003_ui_journal.sql']){
    const body=await readFile('migrations/'+name,'utf8');
    const sha256=createHash('sha256').update(body).digest('hex');
    await client.query(body);
    await client.query('INSERT INTO schema_migrations(id,sha256) VALUES($1,$2)',[name.slice(0,4),sha256]);
    console.log(JSON.stringify({migration:name.slice(0,4),status:'TRUNK_BASELINE',sha256}));
  }
  await client.query('COMMIT');
}catch(error){
  await client.query('ROLLBACK');
  throw error;
}finally{await client.end();}
