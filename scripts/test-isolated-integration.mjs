// Platform-neutral replacement for the historical PowerShell-only harness.
import {readFileSync,mkdirSync,writeFileSync,openSync,closeSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {resolve,join} from 'node:path';
import {isolatedServices,isolatedEnvironment,runNpm} from './lib/isolated-services.mjs';
import {requireIntegrationHistory} from './lib/integration-history.ts';

const foundation='tests/integration/foundation.test.ts';
const probes={
 '--it08=isolated':['--test-name-pattern=^IT-08:',foundation],
 '--it08=predecessors':['--test-name-pattern=^IT-0[1-8]:',foundation],
 '--it08=prefix':['--test-skip-pattern=^IT-08D:',...['backend-hardening','catalog-showcase','correctness-migrations','demo-catalog','foundation'].map(name=>'tests/integration/'+name+'.test.ts')],
 '--it08=snapshot':['--test-name-pattern=^IT-08D:',foundation],
};
const args=process.argv.slice(2),probe=Object.hasOwn(probes,args[0])?probes[args[0]]:undefined;
if(args.length&&(args.length!==1||!probe))throw Error('INVALID_ISOLATED_INTEGRATION_ARGUMENT');

requireIntegrationHistory();
const services=await isolatedServices('integration');
try{
 const env=isolatedEnvironment(services),defaultDir='.run-evidence/stability-01';
 const diagnosticDir=resolve(process.env.INTEGRATION_DIAGNOSTIC_DIR??join(defaultDir,'diagnostics',randomUUID()));
 const dir=process.env.INTEGRATION_DIAGNOSTIC_DIR||probe?diagnosticDir:defaultDir;
 mkdirSync(diagnosticDir,{recursive:true});
 const owned=JSON.parse(execFileSync('docker',['inspect',...services.ownership.names],{encoding:'utf8'})).map(info=>{
  if(info.Config.Labels['povod.isolated']!==services.ownership.label)throw Error('ISOLATED_RESOURCE_OWNERSHIP_MISMATCH');
  return {id:info.Id,name:info.Name,created:info.Created,image:info.Image,label:services.ownership.label,volumes:info.Mounts.filter(m=>m.Type==='volume').map(m=>m.Name)};
 });
 env.INTEGRATION_RUN_ID=randomUUID();env.INTEGRATION_DIAGNOSTIC_DIR=diagnosticDir;
 env.INTEGRATION_OWNED_RESOURCES_FILE=join(diagnosticDir,'owned-resources.json');
 writeFileSync(env.INTEGRATION_OWNED_RESOURCES_FILE,JSON.stringify({runId:env.INTEGRATION_RUN_ID,owned},null,2),{flag:'wx'});
 const databases={T105_TEST_DATABASE_URL:'povod_t105_test',REAL_CATALOG_TEST_DATABASE_URL:'povod_real_catalog_verify',P0_SAVE_TEST_DATABASE_URL:'povod_save_fresh',DEMO_TEST_DATABASE_URL:'povod_demo_verify',SHOWCASE_TEST_DATABASE_URL:'povod_full_catalog_verify'};
 for(const [key,name] of Object.entries(databases)){services.createDatabase(name);env[key]=services.databaseUrl(name);}
 for(const name of ['max23_test',...Object.values(databases)])runNpm(['run','migrate'],{...env,DATABASE_URL:services.databaseUrl(name)},`${dir}/migrate-${name}.log`);
 const showcase={...env,DATABASE_URL:env.SHOWCASE_TEST_DATABASE_URL,CURATED_SOURCE_HOSTS:'www.darwinmuseum.ru,darwinmuseum.ru,www.tretyakovgallery.ru,tretyakovgallery.ru,kudago.com,www.kudago.com'};
 runNpm(['run','import:curated-official','--',...['curated-official-v1.json','curated-official-tretyakov-exact-v1.json','curated-kudago-moscow-a-v1.json','curated-kudago-moscow-b-v1.json'].map(n=>'scripts/data/'+n)],showcase,`${dir}/showcase-import.log`);
 runNpm(['run','seed:demo'],{...showcase,APP_MODE:'demo',DEMO_CATALOG_VERSION:'v3'},`${dir}/showcase-seed.log`);
 const log=join(dir,'integration.log');
 try{
  if(probe){
   const fd=openSync(log,'wx');
   let result;
   try{result=spawnSync(process.execPath,['--experimental-strip-types','--test','--test-concurrency=1',...probe],{env,stdio:['ignore',fd,fd]});}
   finally{closeSync(fd);}
   if(result.error||result.status!==0)throw Error('IT08_PROBE_FAILED: inspect '+log);
  }else runNpm(['run','test:integration'],env,log);
 }finally{
  console.log(readFileSync(log,'utf8').split('\n').slice(-12).join('\n'));
 }
}finally{services.stop();}
