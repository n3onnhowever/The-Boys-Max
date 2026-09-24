import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import pg from 'pg';
import {config} from '../packages/platform/config.ts';

const base=new URL(config().databaseUrl);
assert.equal(base.hostname,'postgres');
assert.equal(base.pathname,'/max23_test');
const names=(await readdir('migrations')).filter(x=>/^\d{4}_[a-z0-9_]+\.sql$/.test(x)).sort();
assert.deepEqual(names.map(x=>x.slice(0,4)),['0001','0002','0003','0004','0005','0006']);
const migrations=await Promise.all(names.map(async name=>{
 const body=await readFile('migrations/'+name,'utf8');
 return {id:name.slice(0,4),body,sha:createHash('sha256').update(body).digest('hex')};
}));
assert.equal(migrations[3].sha,'d14cef7b400fc9eb78fac5f81a2cef8e78519afd448160ec8c0d8e6865cb829e');
assert.equal(migrations[4].sha,'d8ee7951ff03e719e06516fe43e992d9141b962897ba1b601b565acd700cc337');
const admin=new pg.Client({connectionString:base.toString()});
await admin.connect();
try{
 const version=(await admin.query('SHOW server_version')).rows[0].server_version;
 assert.match(version,/^18\.6(?: |$)/);
 console.log(JSON.stringify({postgresql:version,migrations:names}));
 for(const [scenario,preload] of [['fresh',0],['t105_upgrade',4],['save_upgrade',5]]){
  const dbName='povod_int_'+scenario+'_'+randomUUID().slice(0,8);
  await admin.query('CREATE DATABASE '+dbName);
  const url=new URL(base);url.pathname='/'+dbName;
  const db=new pg.Client({connectionString:url.toString()});
  await db.connect();
  try{
   await db.query('CREATE TABLE schema_migrations(id text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT clock_timestamp())');
   async function apply(limit){
    const applied=[];
    await db.query('BEGIN');
    try{
     for(const migration of migrations.slice(0,limit)){
      const existing=await db.query('SELECT sha256 FROM schema_migrations WHERE id=$1',[migration.id]);
      if(existing.rows.length){assert.equal(existing.rows[0].sha256,migration.sha);continue;}
      await db.query(migration.body);
      await db.query('INSERT INTO schema_migrations(id,sha256) VALUES($1,$2)',[migration.id,migration.sha]);
      applied.push(migration.id);
     }
     await db.query('COMMIT');
    }catch(e){await db.query('ROLLBACK');throw e;}
    return applied;
   }
   if(preload)assert.deepEqual(await apply(preload),migrations.slice(0,preload).map(x=>x.id));
   const applied=await apply(6);
   assert.deepEqual(applied,migrations.slice(preload).map(x=>x.id));
   assert.deepEqual(await apply(6),[]);
   const ledger=(await db.query('SELECT id,sha256 FROM schema_migrations ORDER BY id')).rows;
   assert.deepEqual(ledger,migrations.map(x=>({id:x.id,sha256:x.sha})));
   const columns=(await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_name IN ('inbox','destinations') AND column_name='source_timestamp_ms' ORDER BY table_name")).rows;
   assert.deepEqual(columns.map(x=>x.table_name),['destinations','inbox']);
   console.log(JSON.stringify({scenario,dbName,applied,rerunApplied:0,ledger,sourceTimestampColumns:columns.length}));
  }finally{await db.end();}
 }
}finally{await admin.end();}
