import {spawn} from 'node:child_process';
import {openSync,closeSync} from 'node:fs';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {isolatedServices,isolatedEnvironment,runNpm} from './lib/isolated-services.mjs';

if(process.env.NODE_ENV==='production')throw Error('OFFLINE_PORTFOLIO_LOCAL_TEST_ONLY');
const smoke=process.argv.includes('--smoke'),services=await isolatedServices('portfolio'),children=[];
let stopping=false;
async function stop(){
 if(stopping)return;stopping=true;
 for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');
 await Promise.all(children.map(child=>child.exitCode!==null?null:new Promise(resolve=>{const timer=setTimeout(resolve,5000);child.once('exit',()=>{clearTimeout(timer);resolve();});})));
 services.stop();
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void stop();});
try{
 const port=smoke?await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});}):3210;
 const env={...isolatedEnvironment(services),POVOD_OFFLINE_DEMO:'1',PUBLIC_ORIGIN:`http://127.0.0.1:${port}`,PORT:String(port)};
 const dir='.run-evidence/stability-01';
 for(const command of ['build','migrate','seed:portfolio'])runNpm(['run',command],env,`${dir}/portfolio-${command.replace(':','-')}.log`);
 runNpm(['exec','--','node','--experimental-strip-types','scripts/arm-test-outbound.ts'],env,`${dir}/portfolio-arm.log`);
 const start=(entry,name)=>{
  const fd=openSync(`${dir}/portfolio-${name}.log`,'w');
  const child=spawn(process.execPath,['--experimental-strip-types',entry],{env,stdio:['ignore',fd,fd]});closeSync(fd);children.push(child);return child;
 };
 const api=start('scripts/portfolio-api.ts','api'),worker=start('apps/worker/main.ts','worker');
 let ready=false;
 for(let n=0;n<40&&!stopping;n++){
  if(api.exitCode!==null||worker.exitCode!==null)throw Error('PORTFOLIO_CHILD_EXITED: inspect ignored local logs');
  try{const r=await fetch(env.PUBLIC_ORIGIN+'/health/ready',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
  await delay(500);
 }
 if(!ready)throw Error('PORTFOLIO_NOT_READY');
 console.log(`DEMO: 48 fictional scenarios, no real MAX/AI/providers. Open ${env.PUBLIC_ORIGIN}`);
 console.log('Loopback only; ephemeral isolated PostgreSQL/Redis. Ctrl+C stops and removes this demo data.');
 if(smoke){runNpm(['exec','--','node','--experimental-strip-types','scripts/portfolio-smoke.ts'],env,`${dir}/portfolio-smoke.log`);console.log('Offline HTTP journey smoke: PASS');}
 else await new Promise((resolve,reject)=>{for(const child of children)child.once('exit',code=>stopping?resolve():reject(Error('PORTFOLIO_CHILD_EXITED_'+code)));});
}finally{await stop();}
