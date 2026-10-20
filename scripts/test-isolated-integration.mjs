// Platform-neutral replacement for the historical PowerShell-only harness.
import {readFileSync} from 'node:fs';
import {isolatedServices,isolatedEnvironment,runNpm} from './lib/isolated-services.mjs';

const services=await isolatedServices('integration');
try{
 const env=isolatedEnvironment(services),dir='.run-evidence/stability-01';
 const databases={T105_TEST_DATABASE_URL:'povod_t105_test',REAL_CATALOG_TEST_DATABASE_URL:'povod_real_catalog_verify',P0_SAVE_TEST_DATABASE_URL:'povod_save_fresh',DEMO_TEST_DATABASE_URL:'povod_demo_verify',SHOWCASE_TEST_DATABASE_URL:'povod_full_catalog_verify'};
 for(const [key,name] of Object.entries(databases)){services.createDatabase(name);env[key]=services.databaseUrl(name);}
 for(const name of ['max23_test',...Object.values(databases)])runNpm(['run','migrate'],{...env,DATABASE_URL:services.databaseUrl(name)},`${dir}/migrate-${name}.log`);
 const showcase={...env,DATABASE_URL:env.SHOWCASE_TEST_DATABASE_URL,CURATED_SOURCE_HOSTS:'www.darwinmuseum.ru,darwinmuseum.ru,www.tretyakovgallery.ru,tretyakovgallery.ru,kudago.com,www.kudago.com'};
 runNpm(['run','import:curated-official','--',...['curated-official-v1.json','curated-official-tretyakov-exact-v1.json','curated-kudago-moscow-a-v1.json','curated-kudago-moscow-b-v1.json'].map(n=>'scripts/data/'+n)],showcase,`${dir}/showcase-import.log`);
 runNpm(['run','seed:demo'],{...showcase,APP_MODE:'demo',DEMO_CATALOG_VERSION:'v3'},`${dir}/showcase-seed.log`);
 runNpm(['run','test:integration'],env,`${dir}/integration.log`);
 console.log(readFileSync(`${dir}/integration.log`,'utf8').split('\n').slice(-12).join('\n'));
}finally{services.stop();}
