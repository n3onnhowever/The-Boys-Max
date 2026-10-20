/** Cross-representation acceptance: physical disposable files, real runner and PostgreSQL.
 * Legacy ledgers are written by the actual accepted-base runner, never fabricated as PASS.
 */
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Pool} from 'pg';
import {config} from '../../packages/platform/config.ts';
import {connect} from '../../packages/persistence/db.ts';
import {planService} from '../../packages/persistence/plans.ts';
import {canonicalCatalog} from '../../packages/persistence/canonical-catalog.ts';
import {portfolioFixtures} from '../../packages/demo/portfolio.ts';
import {socialService} from '../../packages/persistence/social.ts';
import {hash} from '../../packages/domain/event.ts';

const base='ae05e8f88d937c6c96972b3619dff383de706a4a',cfg=config();
assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');
assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');
const admin=new Pool({connectionString:cfg.databaseUrl});after(async()=>{await admin.end()});
const root=process.cwd(),files=readdirSync('migrations').filter(f=>/^\d{4}_.*\.sql$/.test(f)).sort();
const lf=new Map(files.map(f=>[f,execFileSync('git',['show',`${base}:migrations/${f}`])]));
const digest=(body:Buffer)=>createHash('sha256').update(body).digest('hex');
const crlf=(f:string)=>!['0004','0005','0006'].includes(f.slice(0,4));
async function fixture(){
 const name='povod_eol_'+randomBytes(6).toString('hex');await admin.query(`CREATE DATABASE ${name}`);
 const url=new URL(cfg.databaseUrl);url.pathname='/'+name;
 const {pool,db}=connect(url.href),dir=mkdtempSync(join(tmpdir(),'povod-eol-'));
 mkdirSync(join(dir,'migrations'));
 const oldRunner=join(dir,'base-runner.ts');
 writeFileSync(oldRunner,execFileSync('git',['show',`${base}:scripts/migrate.ts`],{encoding:'utf8'}).replaceAll("'../packages/","'"+pathToFileURL(resolve(root,'packages')).href+'/'));
 function represent(legacy=false,through='0017',only?:string){
  for(const f of files){const path=join(dir,'migrations',f);if(f.slice(0,4)>through){rmSync(path,{force:true});continue;}
   const body=lf.get(f)!;writeFileSync(path,legacy&&crlf(f)&&(!only||f.startsWith(only))?Buffer.from(body.toString('utf8').replaceAll('\n','\r\n')):body);
  }
 }
 function run(old=false,error?:string){
  const result=spawnSync(process.execPath,['--experimental-strip-types',old?oldRunner:resolve(root,'scripts/migrate.ts')],{cwd:dir,env:{...process.env,DATABASE_URL:url.href},encoding:'utf8',timeout:30000});
  assert.ifError(result.error);
  if(error){assert.notEqual(result.status,0);assert.ok(result.stderr.includes(error),result.stderr);}else assert.equal(result.status,0,result.stderr);
  return result.stdout;
 }
 // JSON timestamps preserve PostgreSQL microseconds, unlike JS Date conversion.
 async function ledger(){return (await pool.query("SELECT to_jsonb(t) body FROM schema_migrations t ORDER BY id")).rows;}
 const tables=['actors','actor_preferences','in_app_notifications','saved_occurrences','plans','plan_slots','friendships','canonical_events','canonical_occurrences','catalog_occurrences','outbox','outbound_control'];
 async function data(){const result:Record<string,unknown>={};for(const table of tables)result[table]=(await pool.query(`SELECT to_jsonb(t) body FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows;return result;}
 async function preserve(action:()=>void){const before=await ledger(),business=await data();action();assert.deepEqual(await ledger(),before);assert.deepEqual(await data(),business);}
 async function seed(){
  const rows=portfolioFixtures(cfg.publicOrigin),catalog=canonicalCatalog(pool),source=rows[0]!.record.sourceId;
  await catalog.registerSyntheticSource(source,'ManualProvider','owned-portfolio/v1');
  const run=await catalog.beginRun(source,hash('eol regression')),page=await catalog.dispatchPage(run.runId,run.epoch,1);
  assert.equal((await catalog.commitPage(page.pageId,run.epoch,rows.map(x=>x.record),{allowedHosts:['127.0.0.1'],allowLive:false},true)).accepted,48);
  await catalog.finishRun(run.runId,run.epoch);
  for(const {candidate:c} of rows)await pool.query("INSERT INTO catalog_occurrences(observation_id,provider_id,event_id,occurrence_id,body,data_mode) VALUES($1,$2,$3,$4,$5,'SYNTHETIC')",[c.provenance.observation_id,c.ref.provider_id,c.ref.event_id,c.ref.occurrence_id,c]);
  const actors=[randomUUID(),randomUUID()];for(const [i,id] of actors.entries())await pool.query("INSERT INTO actors VALUES($1,$2,'SYNTHETIC EOL')",[id,String(900000001+i)]);
  await pool.query("INSERT INTO actor_preferences(actor_id,budget_rub,radius_km,notifications_enabled) VALUES($1,700,25,false)",[actors[0]]);
  await pool.query("INSERT INTO in_app_notifications(id,actor_id,kind,title,read_at) VALUES($1,$2,'FRIEND_REQUEST','SYNTHETIC read',clock_timestamp()),($3,$2,'FRIEND_REQUEST','SYNTHETIC unread',NULL)",[randomUUID(),actors[0],randomUUID()]);
  await pool.query('INSERT INTO saved_occurrences(actor_id,occurrence_id) SELECT $1,id FROM canonical_occurrences ORDER BY id LIMIT 3',[actors[0]]);
  const social=socialService(pool);await social.requestFriend(actors[0]!,actors[1]!);await social.acceptFriend(actors[1]!,actors[0]!);
  const p=await planService(db,cfg.sessionKey).create(actors[0]!,randomUUID(),{title:'SYNTHETIC EOL',slots:[{slotId:randomUUID(),label:'SYNTHETIC',required:true,actorId:actors[0]!,state:'ACTIVE'}],rule:{kind:'ALL'},decisionDeadline:'2099-01-01T00:00:00Z',commitmentDeadline:'2099-01-02T00:00:00Z'});
  const command=randomUUID();await pool.query("INSERT INTO command_audit VALUES($1,$2,$3,'SYNTHETIC',1,'eol',clock_timestamp())",[command,p.planId,actors[0]]);
  await pool.query("INSERT INTO outbox(id,command_id,plan_id,actor_id,kind,state,expires_at) VALUES($1,$2,$3,$4,'PLAN_NOTICE','UNKNOWN','2099-01-01')",[randomUUID(),command,p.planId,actors[0]]);
 }
 async function schema(){
  const version=(await pool.query("SELECT column_default,is_nullable FROM information_schema.columns WHERE table_name='actor_preferences' AND column_name='version'")).rows[0];assert.equal(version.column_default,'0');assert.equal(version.is_nullable,'NO');
  assert.match((await pool.query("SELECT indexdef FROM pg_indexes WHERE indexname='in_app_notifications_actor_cursor'")).rows[0].indexdef,/actor_id, created_at DESC, id DESC/);
  const versionChecks=(await pool.query("SELECT pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid='actor_preferences'::regclass AND contype='c' AND conname='actor_preferences_version_check'")).rows;
  assert.equal(versionChecks.length,1);
  assert.match(versionChecks[0].def,/version >= 0/);
 }
 async function close(){await pool.end();await admin.query(`DROP DATABASE ${name}`);assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('povod-eol-'));rmSync(dir,{recursive:true});}
 return {pool,dir,represent,run,ledger,data,preserve,seed,schema,close};
}

test('cross-EOL: fresh LF, canonical new hashes, repeat LF and LF -> reviewed CRLF preserve all rows',async()=>{
 const f=await fixture();try{
  f.represent();f.run();await f.seed();await f.schema();
  const ledger=await f.ledger();assert.equal(ledger.length,17);
  for(const file of files)assert.equal(ledger.find(x=>x.body.id===file.slice(0,4))!.body.sha256,digest(lf.get(file)!));
  await f.preserve(()=>assert.equal(f.run(),''));
  f.represent(true);await f.preserve(()=>assert.equal(f.run(),''));
 }finally{await f.close()}
});

test('cross-EOL: fresh reviewed CRLF files write canonical LF ledger hashes',async()=>{
 const f=await fixture();try{
  f.represent(true);f.run();const ledger=await f.ledger();
  for(const file of files)assert.equal(ledger.find(x=>x.body.id===file.slice(0,4))!.body.sha256,digest(lf.get(file)!));
  await f.seed();f.represent();await f.preserve(()=>assert.equal(f.run(),''));
 }finally{await f.close()}
});

test('cross-EOL: actual base CRLF ledger -> LF including destructive 0010, no replay/rewrite; old runner reproduces failure',async()=>{
 const f=await fixture();try{
  f.represent(true);f.run(true);await f.seed();await f.schema();f.represent();
  await f.preserve(()=>f.run(true,'MIGRATION_HASH_MISMATCH:0001'));
  await f.preserve(()=>assert.equal(f.run(),''));
  f.represent(true);await f.preserve(()=>assert.equal(f.run(),''));
 }finally{await f.close()}
});

for(const legacy of [false,true])test(`cross-EOL: populated 0015 (${legacy?'CRLF':'LF'}) -> canonical 0016/0017, versions and data survive`,async()=>{
 const f=await fixture();try{
  f.represent(legacy,'0015');f.run(true);await f.seed();const before=await f.data(),ledger=await f.ledger();
  f.represent();const output=f.run();assert.match(output,/"migration":"0016"/);assert.match(output,/"migration":"0017"/);
  const after=await f.data();const prefs=after.actor_preferences as {body:Record<string,unknown>}[];
  for(const row of prefs){assert.equal(row.body.version,0);delete row.body.version;}
  assert.deepEqual(after,before);assert.deepEqual((await f.ledger()).filter(x=>x.body.id<='0015'),ledger);await f.schema();
  await f.pool.query('UPDATE actor_preferences SET version=7');
  f.represent(true);await f.preserve(()=>assert.equal(f.run(),''));
  f.represent();await f.preserve(()=>assert.equal(f.run(),''));
 }finally{await f.close()}
});

test('cross-EOL: populated LF 0015 -> base-written CRLF 0016/0017 -> LF preserves ledger and data',async()=>{
 const f=await fixture();try{
  f.represent(false,'0015');f.run(true);await f.seed();const before=await f.data(),ledger=await f.ledger();
  // Only new migrations change representation; historical LF files stay identical.
  f.represent();for(const file of files.filter(x=>x.slice(0,4)>='0016'))writeFileSync(join(f.dir,'migrations',file),lf.get(file)!.toString().replaceAll('\n','\r\n'));
  f.run(true);const after=await f.data();for(const row of after.actor_preferences as {body:Record<string,unknown>}[]){assert.equal(row.body.version,0);delete row.body.version;}
  assert.deepEqual(after,before);assert.deepEqual((await f.ledger()).filter(x=>x.body.id<='0015'),ledger);await f.schema();
  f.represent();await f.preserve(()=>f.run(true,'MIGRATION_HASH_MISMATCH:0016'));
  await f.preserve(()=>assert.equal(f.run(),''));
 }finally{await f.close()}
});

for(const id of ['0016','0017'])test(`cross-EOL: isolated ${id} actual legacy CRLF hash -> LF; baseline mismatch`,async()=>{
 const f=await fixture();try{
  f.represent(true,'0017',id);f.run(true);await f.seed();await f.schema();f.represent();
  await f.preserve(()=>f.run(true,'MIGRATION_HASH_MISMATCH:'+id));
  await f.preserve(()=>assert.equal(f.run(),''));
 }finally{await f.close()}
});

test('cross-EOL: real token, whitespace, comment, unknown ledger, BOM, mixed/bare CR and malformed UTF-8 fail closed',async()=>{
 const f=await fixture();try{
  f.represent();f.run();await f.seed();
  const file=files.find(x=>x.startsWith('0017'))!,body=lf.get(file)!;
  const variants=[Buffer.from(body.toString().replace('DESC','ASC')),Buffer.concat([body,Buffer.from(' ')]),Buffer.concat([body,Buffer.from('-- added comment\n')]),Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),body]),Buffer.from(body.toString().replace('\n','\r\n')),Buffer.from(body.toString().replaceAll('\n','\r')),Buffer.concat([body,Buffer.from([0xff])])];
  for(const bytes of variants){writeFileSync(join(f.dir,'migrations',file),bytes);await f.preserve(()=>f.run(false,'MIGRATION_HASH_MISMATCH:0017'));}
  f.represent();await f.pool.query("UPDATE schema_migrations SET sha256=$1 WHERE id='0017'",['0'.repeat(64)]);
  await f.preserve(()=>f.run(false,'MIGRATION_HASH_MISMATCH:0017'));
  // 0004..0006 never had an audit-approved CRLF representation.
  f.represent();const unreviewed=files.find(x=>x.startsWith('0004'))!;
  writeFileSync(join(f.dir,'migrations',unreviewed),lf.get(unreviewed)!.toString().replaceAll('\n','\r\n'));
  await f.preserve(()=>f.run(false,'MIGRATION_HASH_MISMATCH:0004'));
 }finally{await f.close()}
});
