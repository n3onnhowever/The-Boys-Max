/** Real migration runner, new disposable databases inside the isolated test container. */
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {Pool} from 'pg';
import {config} from '../../packages/platform/config.ts';
import {socialService} from '../../packages/persistence/social.ts';
const cfg=config();assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(cfg.mode,'test');assert.equal(new URL(cfg.databaseUrl).pathname,'/max23_test');
const admin=new Pool({connectionString:cfg.databaseUrl});after(async()=>{await admin.end()});
const root=process.cwd(),runner=resolve('scripts/migrate.ts');
async function database(){const name='povod_02b_migration_'+randomBytes(6).toString('hex');assert.match(name,/^[a-z0-9_]+$/);await admin.query(`CREATE DATABASE ${name}`);const url=new URL(cfg.databaseUrl);url.pathname='/'+name;return {url:url.href,pool:new Pool({connectionString:url.href})}}
function migrate(url:string,cwd=root){const result=spawnSync(process.execPath,['--experimental-strip-types',runner],{cwd,env:{...process.env,DATABASE_URL:url},encoding:'utf8',timeout:30000});assert.equal(result.status,0,result.stderr);return result.stdout}
test('02B clean migration applies 0016/0017 and repeat runner preserves tracking hashes/timestamps',async()=>{
 const db=await database();try{
  const first=migrate(db.url);assert.match(first,/"migration":"0016"/);assert.match(first,/"migration":"0017"/);
  const before=(await db.pool.query('SELECT * FROM schema_migrations ORDER BY id')).rows;assert.equal(before.length,17);
  assert.equal(migrate(db.url),'');assert.deepEqual((await db.pool.query('SELECT * FROM schema_migrations ORDER BY id')).rows,before);
  const indexes=await db.pool.query("SELECT indexdef FROM pg_indexes WHERE indexname='in_app_notifications_actor_cursor'");assert.match(indexes.rows[0].indexdef,/actor_id, created_at DESC, id DESC/);
 }finally{await db.pool.end()}
});
test('02B populated 0015 database migrates additively; old values/history survive and version zero is writable once',async()=>{
 const db=await database(),dir=mkdtempSync(join(tmpdir(),'povod-02b-migration-'));
 try{
  mkdirSync(join(dir,'migrations'));for(const file of readdirSync(join(root,'migrations')).filter(f=>/^\d{4}_.*\.sql$/.test(f)&&f.slice(0,4)<='0015'))copyFileSync(join(root,'migrations',file),join(dir,'migrations',file));
  migrate(db.url,dir);const tracking=(await db.pool.query('SELECT * FROM schema_migrations ORDER BY id')).rows;assert.equal(tracking.length,15);
  const actor=randomUUID(),notice=randomUUID();await db.pool.query("INSERT INTO actors(id,external_id,display_name) VALUES($1,$2,'SYNTHETIC migration')",[actor,randomBytes(6).readUIntBE(0,6).toString()]);
  await db.pool.query("INSERT INTO actor_preferences(actor_id,city,interests,budget_rub,radius_km,notifications_enabled,preferred_time) VALUES($1,'Москва',ARRAY['Кино'],2000,25,false,'EVENING')",[actor]);
  await db.pool.query("INSERT INTO in_app_notifications(id,actor_id,kind,title,created_at) VALUES($1,$2,'FRIEND_REQUEST','SYNTHETIC migration','2026-01-01T00:00:00.123456Z')",[notice,actor]);
  const prefs=(await db.pool.query('SELECT * FROM actor_preferences WHERE actor_id=$1',[actor])).rows[0],notification=(await db.pool.query('SELECT * FROM in_app_notifications WHERE id=$1',[notice])).rows[0];
  const output=migrate(db.url);assert.match(output,/"migration":"0016"/);assert.match(output,/"migration":"0017"/);
  const {version,...afterPrefs}=(await db.pool.query('SELECT * FROM actor_preferences WHERE actor_id=$1',[actor])).rows[0];assert.equal(version,0);assert.deepEqual(afterPrefs,prefs);
  assert.deepEqual((await db.pool.query('SELECT * FROM in_app_notifications WHERE id=$1',[notice])).rows[0],notification);assert.deepEqual((await db.pool.query("SELECT * FROM schema_migrations WHERE id<='0015' ORDER BY id")).rows,tracking);
  assert.equal(migrate(db.url),'');
  const social=socialService(db.pool),current=await social.settings(actor),{catalogCoverage,...values}=current;
  const saved=await social.saveSettings(actor,{...values,expectedVersion:0});assert.equal(saved.version,1);assert.equal(saved.budgetRub,2000);assert.equal(saved.notificationsEnabled,false);
  await assert.rejects(social.saveSettings(actor,{...values,expectedVersion:0}),{code:'PREFERENCES_VERSION_CONFLICT'});
 }finally{
  await db.pool.end();assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('povod-02b-migration-'));rmSync(dir,{recursive:true});
 }
});
