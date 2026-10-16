import {execFileSync,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {openSync,closeSync,mkdirSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';

export const serviceImages={postgres:'postgres:18.6',redis:'redis:8.2.9'};
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export async function isolatedServices(label){
 try{docker('info','--format','{{.ServerVersion}}');}catch{throw Error('BLOCKED_DOCKER: start Docker, then retry the documented command');}
 const suffix=randomBytes(6).toString('hex'),created=[];
 const password=randomBytes(24).toString('hex');
 const stop=()=>{for(const name of created.reverse()){try{docker('rm','--force','--volumes',name);}catch{console.error('Cleanup required for owned container '+name);}}};
 try{
  const pgName=`povod-${label}-pg-${suffix}`,redisName=`povod-${label}-redis-${suffix}`;
  execFileSync('docker',['run','--detach','--name',pgName,'--label','povod.isolated='+suffix,'-e','POSTGRES_DB=max23_test','-e','POSTGRES_USER=max23','-e','POSTGRES_PASSWORD','--publish','127.0.0.1::5432',serviceImages.postgres],{env:{...process.env,POSTGRES_PASSWORD:password},stdio:['ignore','pipe','pipe']});created.push(pgName);
  docker('run','--detach','--name',redisName,'--label','povod.isolated='+suffix,'--publish','127.0.0.1::6379',serviceImages.redis,'redis-server','--appendonly','yes','--maxmemory-policy','noeviction');created.push(redisName);
  let ready=false;
  for(let attempt=0;attempt<60;attempt++){
   try{docker('exec',pgName,'pg_isready','-U','max23','-d','max23_test');if(docker('exec',redisName,'redis-cli','ping')==='PONG'){ready=true;break;}}catch{}
   await delay(1000);
  }
  if(!ready)throw Error('ISOLATED_SERVICES_NOT_READY');
  const port=(name,containerPort)=>JSON.parse(docker('inspect','--format','{{json .NetworkSettings.Ports}}',name))[containerPort][0].HostPort;
  const databaseBase=`postgres://max23:${password}@127.0.0.1:${port(pgName,'5432/tcp')}/`;
  return {databaseUrl:name=>databaseBase+name,redisUrl:`redis://127.0.0.1:${port(redisName,'6379/tcp')}`,
   createDatabase:name=>{if(!/^[a-z0-9_]+$/.test(name))throw Error('DATABASE_NAME_INVALID');docker('exec',pgName,'createdb','-U','max23',name);},stop};
 }catch(error){stop();throw Error(error.message.startsWith('BLOCKED_')?error.message:'ISOLATED_SERVICE_START_FAILED (Docker diagnostics may contain private configuration; inspect locally)');}
}
export function isolatedEnvironment(services){
 const env={...process.env};
 // Never inherit runtime files, production credentials or provider activation.
 for(const key of Object.keys(env))if(/^(?:RUNTIME_FILE|APP_MODE|DEMO_|DATABASE_URL|REDIS_URL|T105_|REAL_CATALOG_|P0_SAVE_|SHOWCASE_|PORTFOLIO_|MAX_|BOT_|WEBHOOK_|SESSION_|ESCROW_|CREDENTIAL_|AI_|GIGACHAT_|MAP_|LIVE_GATE|PUBLIC_ORIGIN|COOKIE_PROFILE|POVOD_|ALLOWED_SOURCE_|CURATED_)/.test(key))delete env[key];
 return {...env,APP_MODE:'test',COOKIE_PROFILE:'LAX_FIRST_PARTY',PUBLIC_ORIGIN:'http://127.0.0.1:3000',MAX_INGRESS_MODE:'WEBHOOK',
  CREDENTIAL_SCOPE:'ISOLATED_LOCAL_SYNTHETIC',AI_EXTERNAL_ENABLED:'false',MAP_EXTERNAL_ENABLED:'false',
  ...Object.fromEntries(['SESSION_KEY','ESCROW_KEY','BOT_TOKEN','WEBHOOK_SECRET'].map(key=>[key,randomBytes(32).toString('hex')])),
  DATABASE_URL:services.databaseUrl('max23_test'),REDIS_URL:services.redisUrl,RUN_MAX23_INTEGRATION:'1'};
}
export function runNpm(args,env,log){
 if(!process.env.npm_execpath)throw Error('RUN_THROUGH_NPM_SCRIPT_REQUIRED');
 mkdirSync(new URL('../../.run-evidence/stability-01/',import.meta.url),{recursive:true});
 const fd=openSync(log,'w');let result;
 try{result=spawnSync(process.execPath,[process.env.npm_execpath,...args],{env,stdio:['ignore',fd,fd]});}finally{closeSync(fd);}
 if(result.error||result.status!==0)throw Error(`npm ${args.join(' ')} failed (exit ${result.status}); inspect ${log}`);
}
