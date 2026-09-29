import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base='artifacts/t102_2';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>spawnSync('git',['-c','safe.directory=D:/Dev/Repos/The-Boys-Max',...a],{encoding:'utf8'}).stdout;
const write=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
let results=fs.existsSync(base+'/COMMAND_RESULTS.json')?JSON.parse(fs.readFileSync(base+'/COMMAND_RESULTS.json')):[];
const revision=()=>Object.fromEntries(git('ls-files','--cached','--others','--exclude-standard','-z').split('\0').filter(p=>p&&!p.startsWith('artifacts/')&&!p.startsWith('docs/')&&fs.existsSync(p)).sort().map(p=>[p,sha(fs.readFileSync(p))]));
function run(name,exe,args,accept=[0]){const start=new Date();const r=spawnSync(exe,args,{encoding:'utf8',maxBuffer:30*1024*1024,timeout:290000});const out=((r.stdout||'')+(r.stderr||'')).replace(/POSTGRES_PASSWORD:.*$/gm,'POSTGRES_PASSWORD: [REDACTED_TEST_VALUE]');write(base+'/logs/'+name+'.txt',out);const item={name,executable:exe,args,command:[exe,...args.map(x=>/\s/.test(x)?JSON.stringify(x):x)].join(' '),exit_code:r.status,signal:r.signal,error:r.error?.message,start_utc:start.toISOString(),duration_seconds:(Date.now()-start)/1000,source_sha256:sha(JSON.stringify(revision())),log:base+'/logs/'+name+'.txt'};results.push(item);write(base+'/COMMAND_RESULTS.json',results);console.log(JSON.stringify({...item,args:undefined,command:undefined}));if(!accept.includes(r.status))throw Error(name+' failed: '+out.slice(-2000));return out;}
const docker=(name,...args)=>run(name,'docker',args);
const phase=process.argv[2];
if(phase==='inspect'){
 write(base+'/STARTING_STATE.json',{head:git('rev-parse','HEAD').trim(),branch:git('branch','--show-current').trim(),status:git('status','--short'),files:Object.fromEntries(git('ls-files','--cached','--others','--exclude-standard','-z').split('\0').filter(p=>p&&!p.startsWith(base+'/')&&fs.existsSync(p)).sort().map(p=>[p,sha(fs.readFileSync(p))]))});
 const orig=spawnSync('git',['-c','safe.directory=D:/Dev/Repos/The-Boys-Max','show','HEAD:migrations/0002_integration.sql']).stdout;
 write(base+'/MIGRATION_HASHES.json',{head_blob_sha256:sha(orig),head_blob_crlf_sha256:sha(orig.toString().replace(/\r?\n/g,'\r\n')),current_file_sha256:sha(fs.readFileSync('migrations/0002_integration.sql')),prior_ledger:fs.readFileSync('artifacts/t102_1/logs/docker-migration-ledger.txt','utf8')});
 docker('network-before','network','inspect','the-boys-integration26-test_test','--format','{{json .Internal}} {{json .Driver}}');
 docker('api-before','inspect','the-boys-integration26-test-api-1','--format','{{json .HostConfig.PortBindings}} {{json .NetworkSettings.Ports}} {{json .NetworkSettings.Networks}}');
 run('migration-history','git',['-c','safe.directory=D:/Dev/Repos/The-Boys-Max','log','--all','--oneline','--','migrations']);
 run('deployment-evidence-search','rg',['-n','schema_migrations|MIGRATION_HASH_MISMATCH|deployed|deployment|production|staging','docs/current','docs/handoffs','compose.release.yaml','scripts/migrate.ts']);
}
if(phase==='config'){
 docker('docker-config','compose','config');
 const c=JSON.parse(docker('docker-config-json','compose','config','--format','json'));
 if(!c.networks.test.internal||c.networks.frontend.internal||Object.keys(c.services.api.networks).sort().join(',')!=='frontend,test'||c.services.api.ports[0].host_ip!=='127.0.0.1')throw Error('API topology');
 for(const s of ['postgres','redis','worker'])if(c.services[s].ports?.length||Object.keys(c.services[s].networks).join(',')!=='test')throw Error(s+' exposure');
 write(base+'/SOURCE_REVISION.json',revision());
}
if(phase==='build')docker('docker-build','compose','--progress','plain','build','--no-cache');
if(phase==='start')docker('docker-start','compose','up','--build','-d');
if(phase==='regression'){
 const lock=sha(fs.readFileSync('package-lock.json'));
 run('clean-install','cmd.exe',['/d','/s','/c','npm.cmd ci --ignore-scripts']);
 const patch=JSON.parse(fs.readFileSync('patches/drizzle-orm-0.45.2.json'));
 const before=patch.files.map(f=>({path:f.path,match:sha(fs.readFileSync('node_modules/drizzle-orm/'+f.path))===f.before_sha256}));
 const runtimes=()=>Object.fromEntries(fs.readdirSync('node_modules/drizzle-orm',{recursive:true}).filter(f=>/\.(js|cjs)$/.test(f)).sort().map(f=>[f,sha(fs.readFileSync('node_modules/drizzle-orm/'+f))]));
 const runtimeBefore=runtimes();
 for(const [name,script]of [['verify-dependencies','verify:dependencies'],['syntax','syntax'],['unit','test:unit'],['typecheck','typecheck'],['build','build']])run(name,'cmd.exe',['/d','/s','/c','npm.cmd run '+script]);
 const after=patch.files.map(f=>({path:f.path,match:sha(fs.readFileSync('node_modules/drizzle-orm/'+f.path))===f.after_sha256}));
 const receipt={version:patch.version,before,after,runtime_unchanged:JSON.stringify(runtimeBefore)===JSON.stringify(runtimes()),lock_unchanged:lock===sha(fs.readFileSync('package-lock.json')),provenance:'licenses/drizzle-orm-0.45.2-NOTICES.md',mechanism:'explicit typecheck/build prefix; validates all inputs before writes; version and before/after SHA256 guards; idempotent'};
 write(base+'/DRIZZLE_REPRODUCIBILITY.json',receipt);
 if(before.some(x=>!x.match)||after.some(x=>!x.match)||!receipt.runtime_unchanged||!receipt.lock_unchanged)throw Error('reproducibility');
}
const healthCode=path=>`const r=await fetch('http://127.0.0.1:3000${path}'); const b=await r.text(); console.log(JSON.stringify({path:'${path}',status:r.status,body:b}));if(r.status!==200)process.exit(1);`;
const inspectFormat='{"ports":{{json .NetworkSettings.Ports}},"bindings":{{json .HostConfig.PortBindings}},"networks":{{json .NetworkSettings.Networks}},"mounts":{{json .Mounts}},"state":{{json .State.Status}}}';
const cid=s=>'the-boys-integration26-test-'+s+'-1';
const sql="SELECT id,sha256,applied_at FROM schema_migrations ORDER BY id; SELECT count(*) AS synthetic_actors FROM actors; SELECT count(*) AS synthetic_occurrences FROM catalog_occurrences;";
if(phase==='accept'||phase==='after-restart'){
 const suffix=phase==='accept'?'':'-restart';
 docker('docker-ps'+suffix,'compose','ps','-a');
 for(const kind of ['live','ready']){
 docker('internal-'+kind+suffix,'compose','exec','-T','api','node','--input-type=module','-e',healthCode('/health/'+kind));
 run('host-'+kind+suffix,'curl.exe',['--fail','--silent','--show-error','--retry','10','--retry-connrefused','--retry-delay','1','--max-time','5','--write-out','\nHTTP_STATUS=%{http_code}\n','http://127.0.0.1:3000/health/'+kind]);
 }
 docker('internal-root'+suffix,'compose','exec','-T','api','node','--input-type=module','-e',"const r=await fetch('http://127.0.0.1:3000/');console.log(JSON.stringify({status:r.status,type:r.headers.get('content-type')}));if(r.status!==200||!r.headers.get('content-type')?.includes('text/html'))process.exit(1);");
 docker('docker-port'+suffix,'port',cid('api'));
 const api=JSON.parse(docker('docker-inspect-api'+suffix,'inspect',cid('api'),'--format',inspectFormat));
 if(api.ports['3000/tcp']?.[0]?.HostIp!=='127.0.0.1'||api.ports['3000/tcp']?.[0]?.HostPort!=='3000'||Object.keys(api.networks).length!==2)throw Error('host mapping');
 for(const s of ['postgres','redis','worker']){
 const v=JSON.parse(docker('docker-inspect-'+s+suffix,'inspect',cid(s),'--format',inspectFormat));
 if(Object.values(v.ports||{}).some(x=>x?.length)||Object.keys(v.networks).join(',')!=='the-boys-integration26-test_test')throw Error(s+' exposed');
 }
 docker('backend-network'+suffix,'network','inspect','the-boys-integration26-test_test','--format','{{json .Internal}} {{json .Driver}}');
 docker('frontend-network'+suffix,'network','inspect','the-boys-integration26-test_frontend','--format','{{json .Internal}} {{json .Driver}}');
 docker('migration-ledger'+suffix,'compose','exec','-T','postgres','psql','-U','max23','-d','max23_test','-At','-c',sql);
 const probe="import {config} from './dist/packages/platform/config.js';import {Redis} from 'ioredis';import pg from 'pg'; const c=config();const p=new pg.Pool({connectionString:c.databaseUrl});const r=new Redis(c.redisUrl,{maxRetriesPerRequest:1});try{const db=await p.query('SELECT 1 AS ok');const pong=await r.ping();console.log(JSON.stringify({database:db.rows[0].ok,redis:pong}));if(db.rows[0].ok!==1||pong!=='PONG')process.exitCode=1;}finally{await r.quit();await p.end();}";
 for(const s of ['api','worker'])docker(s+'-dependencies'+suffix,'compose','exec','-T',s,'node','--input-type=module','-e',probe);
 if(phase==='after-restart'){
 const before=fs.readFileSync(base+'/logs/migration-ledger.txt','utf8');const after=fs.readFileSync(base+'/logs/migration-ledger-restart.txt','utf8');if(before!==after)throw Error('persisted DB changed');
 for(const s of ['api','postgres','redis']){const a=JSON.parse(fs.readFileSync(base+'/logs/docker-inspect-'+s+'.txt'));const b=JSON.parse(fs.readFileSync(base+'/logs/docker-inspect-'+s+'-restart.txt'));if(JSON.stringify(a.mounts)!==JSON.stringify(b.mounts))throw Error('volumes changed');}
 write(base+'/PERSISTENCE.json',{database_ledger_and_fixture_counts_unchanged:true,named_volume_mounts_unchanged:true,stop_start_preserves_volumes:true});
 }
}
if(phase==='restart'){
 docker('docker-stop','compose','stop');
 docker('restart','compose','start','postgres','redis','api','worker');
}
if(phase==='versions'){
 run('node-version','node',['--version']);run('npm-version','cmd.exe',['/d','/s','/c','npm.cmd --version']);
 docker('docker-version','version','--format','{{.Server.Version}}');docker('compose-version','compose','version');
 docker('container-versions','compose','exec','-T','api','node','--input-type=module','-e',"import {createRequire} from 'node:module';const req=createRequire(import.meta.url);console.log(JSON.stringify({node:process.version,...Object.fromEntries(['bullmq','ioredis','drizzle-orm','fastify'].map(p=>[p,JSON.parse((awaitNever=>awaitNever)(req('node:fs').readFileSync('node_modules/'+p+'/package.json','utf8'))).version]))}));");
 docker('container-npm','compose','exec','-T','api','npm','--version');docker('postgres-version','compose','exec','-T','postgres','postgres','--version');docker('redis-version','compose','exec','-T','redis','redis-server','--version');
}
if(phase==='stop')docker('final-stop','compose','stop');
if(phase==='diff')run('diff-check','git',['-c','safe.directory=D:/Dev/Repos/The-Boys-Max','diff','--check']);
if(phase==='fresh'){
 const p='the-boys-t102-2-fresh';
 const prior=docker('fresh-volumes-before','volume','ls','--filter','label=com.docker.compose.project='+p,'--format','{{.Name}}');if(prior.trim())throw Error('fresh project already has volumes');
 docker('fresh-start','compose','-p',p,'up','--build','-d');
 docker('fresh-ps','compose','-p',p,'ps','-a');
 docker('fresh-migrations','compose','-p',p,'logs','--no-color','migrate');
 docker('fresh-ledger','compose','-p',p,'exec','-T','postgres','psql','-U','max23','-d','max23_test','-At','-c',sql);
 for(const kind of ['live','ready'])run('fresh-host-'+kind,'curl.exe',['--fail','--silent','--show-error','--retry','10','--retry-connrefused','--retry-delay','1','--max-time','5','--write-out','\nHTTP_STATUS=%{http_code}\n','http://127.0.0.1:3000/health/'+kind]);
 docker('fresh-stop','compose','-p',p,'stop');
}
if(phase==='audit'){
 run('secret-prohibited-preservation-scan','node',['artifacts/t102_2/scan.mjs']);
 run('diff-check','git',['-c','safe.directory=D:/Dev/Repos/The-Boys-Max','diff','--check']);
 run('final-status','git',['-c','safe.directory=D:/Dev/Repos/The-Boys-Max','status','--short']);
 run('compose-diff','git',['-c','safe.directory=D:/Dev/Repos/The-Boys-Max','diff','--','compose.yaml']);
 docker('final-ps','compose','ps','-a');docker('fresh-final-ps','compose','-p','the-boys-t102-2-fresh','ps','-a');
}
