// Run through npm from a clean committed checkout with the exclusive runtime slot.
// This checks the deployment archive; it deliberately does not run engineering tests inside it.
import assert from 'node:assert/strict';
import {spawnSync, execFileSync} from 'node:child_process';
import {createHash, randomBytes} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, lstatSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, relative, dirname, basename, isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const repo = resolve(option('repo') ?? process.cwd());
const npmCli = option('npm-cli') ?? process.env.npm_execpath;
assert(npmCli && existsSync(npmCli), 'RUN_THROUGH_NPM_SCRIPT_REQUIRED');
const git = (...args) => execFileSync('git', args, {cwd:repo, env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}, maxBuffer:64*1024*1024});
const sourceSha = git('rev-parse','HEAD').toString().trim();
assert(/^[a-f0-9]{40}$/.test(sourceSha));
assert.equal(git('status','--porcelain').toString(), '', 'PACKAGE_REQUIRES_CLEAN_COMMITTED_SOURCE');
const baseDir = resolve(option('evidence') ?? tmpdir());
const inside = (child,parent) => { const rel=relative(parent,child); return rel==='' || (!rel.startsWith('..')&&!isAbsolute(rel)); };
assert(!inside(baseDir,repo), 'PACKAGE_EVIDENCE_MUST_BE_OUTSIDE_REPOSITORY');
mkdirSync(baseDir,{recursive:true});
const runRoot = mkdtempSync(join(baseDir,'povod-amvera-package-'));
const archiveDir = join(runRoot,'archive'), extracted = join(runRoot,'extracted'), logs = join(runRoot,'logs');
for (const dir of [archiveDir,extracted,logs]) mkdirSync(dir);
const steps=[];
let services, pool, mainFailure, cleanupFailure, serviceAttempted=false;
const owned=[];
const serviceLabel=`amvera-${randomBytes(5).toString('hex')}`;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const json = (name,value) => writeFileSync(join(runRoot,name),JSON.stringify(value,null,2)+'\n');
function run(name,command,args,{cwd=repo,env=process.env,timeout=600000}={}) {
  const startedAt=new Date().toISOString();
  const result=spawnSync(command,args,{cwd,env,encoding:'utf8',timeout,maxBuffer:64*1024*1024,windowsHide:true});
  writeFileSync(join(logs,name+'.stdout.log'),result.stdout??'');
  writeFileSync(join(logs,name+'.stderr.log'),result.stderr??'');
  steps.push({name,command,args,cwd,startedAt,finishedAt:new Date().toISOString(),exit:result.status,signal:result.signal,error:result.error?.code});
  json('commands.json',steps);
  assert(!result.error && result.status===0, `${name.toUpperCase()}_FAILED: exit=${result.status}; logs=${logs}`);
  return result.stdout;
}
function powershell() {
  for(const candidate of process.platform==='win32'?['pwsh','powershell.exe']:['pwsh']){
    const probe=spawnSync(candidate,['-NoProfile','-NonInteractive','-Command','$PSVersionTable.PSVersion.ToString()'],{encoding:'utf8',windowsHide:true});
    steps.push({name:'powershell-prerequisite',command:candidate,args:['-NoProfile','-NonInteractive','-Command','$PSVersionTable.PSVersion.ToString()'],exit:probe.status,error:probe.error?.code});
    if(!probe.error&&probe.status===0)return candidate;
  }
  throw Error('BLOCKED_POWERSHELL: package-amvera.ps1 needs pwsh (or Windows PowerShell on Windows)');
}
function filesBelow(dir,prefix='') {
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const path=join(dir,entry.name),name=prefix+entry.name;
    assert(!lstatSync(path).isSymbolicLink(), 'ARCHIVE_SYMLINK_NOT_ALLOWED:'+name);
    return entry.isDirectory()?filesBelow(path,name+'/'):[name];
  });
}
const bannedPath = name => {
  const segments=name.toLowerCase().split('/');
  return segments.some(part=>/^(?:\.git|\.env(?:\..*)?|node_modules|dist|\.run-evidence|evidence|artifacts|\.runtime|\.secrets|privatebackups|private-backups|backups|presentation|presentations|presentation-packs|logs|pgdata|redis-data)$/.test(part))
    || /\.(?:log|sqlite3?|db|p12|pfx|key|pptx?|odp|zip|tar|tgz|gz|bak)$/i.test(name);
};
const tracked=new Map(git('ls-tree','-r','-z',sourceSha).toString().split('\0').filter(Boolean).map(line=>{
  const tab=line.indexOf('\t'),[mode,type,blob]=line.slice(0,tab).split(' ');
  return [line.slice(tab+1),{mode,type,blob}];
}));
const sqlNames=[...tracked.keys()].filter(name=>/^migrations\/\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
assert.equal(sqlNames.length,17,'CURRENT_MIGRATION_CONTRACT_CHANGED_REVIEW_REQUIRED');
const {isolatedServices,isolatedEnvironment}=await import(pathToFileURL(join(repo,'scripts/lib/isolated-services.mjs')).href);
const buildEnv=isolatedEnvironment({databaseUrl:()=> 'postgres://127.0.0.1:1/max23_test',redisUrl:'redis://127.0.0.1:1'});
buildEnv.NODE_ENV='development';
delete buildEnv.NODE_PATH; delete buildEnv.NODE_OPTIONS;
try {
  const ps=powershell();
  run('package',ps,['-NoProfile','-NonInteractive','-File',join(repo,'scripts/package-amvera.ps1'),'-OutputDirectory',archiveDir],{env:buildEnv});
  assert.equal(git('rev-parse','HEAD').toString().trim(),sourceSha,'SOURCE_HEAD_MOVED');
  const archives=readdirSync(archiveDir).filter(name=>name.endsWith('.zip'));
  assert.deepEqual(archives,[`povod-amvera-${sourceSha.slice(0,12)}.zip`]);
  const archive=join(archiveDir,archives[0]);
  const archiveHash=sha256(readFileSync(archive));
  assert(readFileSync(archive+'.sha256','utf8').startsWith(archiveHash+'  '),'ARCHIVE_SIDECAR_HASH_MISMATCH');
  // Use .NET ZIP support already available with the packager's PowerShell prerequisite.
  // Environment arguments avoid interpolating filesystem paths into executable shell text.
  const extractCode=String.raw`$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[IO.Compression.ZipFile]::OpenRead($env:POVOD_PACKAGE_ZIP)
try {
  $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach($entry in $archive.Entries){
    $name=$entry.FullName
    if($name -match '(^/|\\|:|(^|/)\.\.(/|$)|(^|/)\.(/|$))'){throw 'UNSAFE_ZIP_ENTRY'}
    if(-not $seen.Add($name)){throw 'DUPLICATE_ZIP_ENTRY'}
  }
} finally {$archive.Dispose()}
[IO.Compression.ZipFile]::ExtractToDirectory($env:POVOD_PACKAGE_ZIP,$env:POVOD_PACKAGE_EXTRACT)
`;
  run('extract',ps,['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(extractCode,'utf16le').toString('base64')],{env:{...buildEnv,POVOD_PACKAGE_ZIP:archive,POVOD_PACKAGE_EXTRACT:extracted}});
  assert(!existsSync(join(extracted,'.git')));
  assert(!existsSync(join(extracted,'node_modules')));
  const members=filesBelow(extracted).sort();
  const memberRecords=[];
  for(const name of members){
    assert(!bannedPath(name),'PROHIBITED_ARCHIVE_PATH:'+name);
    const original=tracked.get(name);
    assert(original&&original.type==='blob'&&/^100(?:644|755)$/.test(original.mode),'ARCHIVE_MEMBER_NOT_SOURCE_FILE:'+name);
    const bytes=readFileSync(join(extracted,name));
    assert.equal(gitBlob(bytes),original.blob,'ARCHIVE_SOURCE_BYTES_DIFFER:'+name);
    memberRecords.push({path:name,bytes:bytes.length,gitBlob:original.blob,sha256:sha256(bytes)});
  }
  assert.deepEqual(members.filter(name=>name.startsWith('migrations/')&&name.endsWith('.sql')),sqlNames);
  const migrationInputs=sqlNames.map(name=>({file:name,id:basename(name).slice(0,4),sha256:sha256(readFileSync(join(extracted,name)))}));
  for(const required of ['.npmrc','Dockerfile','.dockerignore','amvera.yaml','package.json','package-lock.json','tsconfig.json','tsconfig.build.json','scripts/migrate.ts','scripts/migration-fingerprint.ts','scripts/patch-drizzle-declarations.mjs','scripts/copy-assets.mjs'])assert(members.includes(required),'MISSING_ARCHIVE_INPUT:'+required);
  // Check every current release COPY input rather than only the previously missing helper.
  const dockerText=readFileSync(join(extracted,'Dockerfile'),'utf8');
  const copyInputs=[...dockerText.matchAll(/^COPY --from=build(?: --\S+)* (.+)$/gm)].flatMap(match=>match[1].trim().split(/\s+/).slice(0,-1)).map(path=>path.replace(/^\/app\//,''));
  const startupText=readFileSync(join(extracted,'amvera.yaml'),'utf8');
  const startupEntries=[...startupText.matchAll(/\bnode (dist\/[A-Za-z0-9_./-]+\.js)/g)].map(match=>match[1]);
  const startupData=[...new Set([...startupText.matchAll(/\bscripts\/data\/[A-Za-z0-9_.-]+\.json/g)].map(match=>match[0]))];
  json('archive-inputs.json',{sourceSha,archive,archiveHash,members:memberRecords,migrations:migrationInputs,releaseCopyInputs:copyInputs,startupEntries,startupData});
  run('npm-ci',process.execPath,[npmCli,'ci','--ignore-scripts','--include=dev'],{cwd:extracted,env:buildEnv});
  run('build',process.execPath,[npmCli,'run','build'],{cwd:extracted,env:buildEnv});
  const requiredBuilt=[...copyInputs,...startupEntries,...startupData,
    'dist/scripts/migration-fingerprint.js','dist/apps/api/main.js','dist/apps/worker/main.js',
    'dist/packages/platform/governor.lua','dist/certs/russian-trusted-root-ca.crt','dist/miniapp/index.html'];
  for(const file of requiredBuilt)assert(existsSync(join(extracted,file)),'MISSING_DEPLOYMENT_INPUT:'+file);
  assert.equal(sha256(readFileSync(join(extracted,'dist/packages/platform/governor.lua'))),sha256(readFileSync(join(extracted,'packages/platform/governor.lua'))));
  assert.equal(sha256(readFileSync(join(extracted,'dist/certs/russian-trusted-root-ca.crt'))),sha256(readFileSync(join(extracted,'certs/russian-trusted-root-ca.crt'))));
  // Build tools are not required in release. Exercise compiled migration with prod-only modules.
  run('npm-prune-production',process.execPath,[npmCli,'prune','--omit=dev','--ignore-scripts'],{cwd:extracted,env:buildEnv});
  const requireFromArchive=createRequire(join(extracted,'package.json'));
  const {Pool}=requireFromArchive('pg');
  serviceAttempted=true;
  services=await isolatedServices(serviceLabel); // Existing helper owns disposable PG + Redis; Redis is unused here.
  const ids=execFileSync('docker',['ps','-aq','--filter',`name=povod-${serviceLabel}-`],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean);
  for(const id of ids){
    const info=JSON.parse(execFileSync('docker',['inspect',id],{encoding:'utf8'}))[0];
    owned.push({id:info.Id,name:info.Name,volumes:info.Mounts.filter(m=>m.Type==='volume').map(m=>m.Name)});
  }
  json('owned-resources.json',owned);assert.equal(owned.length,2,'OWNED_SERVICE_INVENTORY');
  const runtimeEnv=isolatedEnvironment(services);
  runtimeEnv.NODE_ENV='production'; delete runtimeEnv.NODE_PATH; delete runtimeEnv.NODE_OPTIONS;
  pool=new Pool({connectionString:runtimeEnv.DATABASE_URL,connectionTimeoutMillis:3000});
  run('compiled-migrate-first',process.execPath,['dist/scripts/migrate.js'],{cwd:extracted,env:runtimeEnv,timeout:60000});
  const ledger=async()=> (await pool.query('SELECT id,sha256,applied_at::text AS applied_at FROM schema_migrations ORDER BY id')).rows;
  const first=await ledger();
  assert.equal(first.length,17,'MIGRATION_COUNT');
  for(const input of migrationInputs)assert.equal(first.find(row=>row.id===input.id)?.sha256,input.sha256,'MIGRATION_LEDGER_HASH:'+input.id);
  const secondOutput=run('compiled-migrate-second',process.execPath,['dist/scripts/migrate.js'],{cwd:extracted,env:runtimeEnv,timeout:60000});
  assert.equal(secondOutput.trim(),'','SECOND_MIGRATION_UNEXPECTEDLY_APPLIED_SQL');
  const second=await ledger();
  assert.deepEqual(second,first,'SECOND_MIGRATION_CHANGED_LEDGER_OR_APPLIED_AT');
  json('migration-runtime.json',{sourceSha,first,second,unchanged:true});
  assert.equal(git('rev-parse','HEAD').toString().trim(),sourceSha,'SOURCE_HEAD_MOVED');
} catch(error) { mainFailure=error; }
finally {
  const errors=[];
  try{await pool?.end();}catch{errors.push('ARCHIVE_DATABASE_CLIENT_TEARDOWN_FAILED');}
  try{await services?.stop();}catch{errors.push('OWNED_SERVICE_TEARDOWN_FAILED');}
  // Current isolatedServices historically swallowed rm failures. Independently check this run's names.
  // Check also when startup failed before returning the service object; do not delete other containers.
  if(serviceAttempted){
    try{
      const names=execFileSync('docker',['ps','--all','--filter','label=povod.isolated','--format','{{.Names}}'],{encoding:'utf8'}).trim().split('\n').filter(name=>name.startsWith(`povod-${serviceLabel}-`));
      if(names.length)errors.push('OWNED_CONTAINERS_REMAIN:'+names.join(','));
      const volumes=new Set(execFileSync('docker',['volume','ls','-q'],{encoding:'utf8'}).trim().split(/\s+/));
      if(owned.some(resource=>resource.volumes.some(volume=>volumes.has(volume))))errors.push('OWNED_VOLUMES_REMAIN');
      json('cleanup.json',{owned,remainingNames:names,volumesAbsent:owned.every(resource=>resource.volumes.every(volume=>!volumes.has(volume)))});
    }catch{errors.push('OWNED_SERVICE_ABSENCE_NOT_VERIFIED');}
  }
  if(!mainFailure&&!errors.length){
    try{
      // Keep the ZIP, manifests and logs; remove only this exact temporary extraction.
      assert.equal(dirname(resolve(extracted)),resolve(runRoot));
      assert.equal(basename(extracted),'extracted');
      assert(!inside(repo,extracted));
      rmSync(extracted,{recursive:true});
    }catch{errors.push('EXTRACTION_TEARDOWN_FAILED');}
  }
  if(errors.length)cleanupFailure=Error(errors.join(';'));
  json('result.json',{sourceSha,status:mainFailure||cleanupFailure?'FAIL':'PASS',failure:mainFailure?.message,cleanupFailure:cleanupFailure?.message,evidence:runRoot,completedCommandSteps:steps.filter(step=>step.exit===0).map(step=>step.name),requestedChecks:['actual-packager','ZIP-member-source-integrity','17-unchanged-SQL-files','clean-extracted-npm-ci','build','compiled-deployment-inputs','production-only-dependencies','compiled-migration-twice','owned-services-cleanup'],limitations:['No deployment or external provider requests','No Git-history engineering tests run from archive','Prohibited-path checks do not replace the separately required repository secret scan']});
}
if(mainFailure||cleanupFailure)throw new AggregateError([mainFailure,cleanupFailure].filter(Boolean),`AMVERA_PACKAGE_REGRESSION_FAILED: ${runRoot}`);

console.log(JSON.stringify({status:'PASS',sourceSha,migrations:17,evidence:runRoot}));
