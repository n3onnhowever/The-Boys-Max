import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {connect} from '../packages/persistence/db.ts';
import {config} from '../packages/platform/config.ts';
import {transaction} from '../packages/persistence/sessions.ts';
const {pool}=connect(config().databaseUrl);
try {
 const files=(await readdir('migrations')).filter(x=>/^\d{4}_[a-z0-9_]+\.sql$/.test(x)).sort();
 await transaction(pool,async c=>{
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended('max23-migrations',0))");
  await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(id text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT clock_timestamp())');
  for(const file of files){
   const id=file.slice(0,4),body=await readFile('migrations/'+file,'utf8'),hash=createHash('sha256').update(body).digest('hex');
   const old=await c.query<{sha256:string}>('SELECT sha256 FROM schema_migrations WHERE id=$1',[id]);
   if(old.rows[0]){if(old.rows[0].sha256!==hash)throw new Error('MIGRATION_HASH_MISMATCH:'+id);continue;}
   await c.query(body);await c.query('INSERT INTO schema_migrations(id,sha256) VALUES($1,$2)',[id,hash]);
   console.log(JSON.stringify({migration:id,status:'APPLIED',sha256:hash}));
  }
 });
}finally{await pool.end();}
