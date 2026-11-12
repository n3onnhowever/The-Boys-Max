// Fault-injection fixture: no Docker daemon, network or containers are used.
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import assert from 'node:assert/strict';
const mode=process.argv[2],calls=[];
let failCleanup=mode!=='success';
const childProcess={execFileSync(command,args){
 assert.equal(command,'docker');calls.push(args);
 if(args[0]==='info')return 'SYNTHETIC_DOCKER';
 if(args[0]==='run'){
  if(mode==='startup'&&args.includes('redis-server'))throw Error('PRIVATE_SYNTHETIC_DIAGNOSTIC');
  return 'SYNTHETIC_CONTAINER';
 }
 if(args[0]==='exec')return args.includes('redis-cli')?'PONG':'ready';
 if(args[0]==='inspect')return JSON.stringify({'5432/tcp':[{HostPort:'15432'}],'6379/tcp':[{HostPort:'16379'}]});
 if(args[0]==='rm'){if(failCleanup)throw Error('PRIVATE_SYNTHETIC_DIAGNOSTIC');return '';}
 throw Error('UNEXPECTED_DOCKER_COMMAND');
},spawnSync(){throw Error('UNEXPECTED_CHILD_PROCESS');}};
const source=new URL('../../scripts/lib/isolated-services.mjs',import.meta.url);
const mod=new SourceTextModule(readFileSync(source,'utf8'),{identifier:source.href});
await mod.link(async specifier=>{
 const values=specifier==='node:child_process'?childProcess:await import(specifier);
 return new SyntheticModule(Object.keys(values),function(){for(const [key,value] of Object.entries(values))this.setExport(key,value);});
});
await mod.evaluate();
if(mode==='startup'){
 await assert.rejects(mod.namespace.isolatedServices('synthetic-cleanup'),error=>{
  assert.equal(error.message,'ISOLATED_SERVICE_START_AND_CLEANUP_FAILED');
  assert.equal(error.errors.length,2);
  assert.match(error.errors[0].message,/ISOLATED_SERVICE_START_FAILED/);
  assert.equal(error.errors[1].message,'ISOLATED_SERVICE_CLEANUP_FAILED');
  assert.doesNotMatch(String(error.errors),/PRIVATE_SYNTHETIC_DIAGNOSTIC/);return true;
 });
 assert.equal(calls.filter(args=>args[0]==='rm').length,1);
}else{
 const services=await mod.namespace.isolatedServices('synthetic-cleanup');
 if(mode==='cleanup'){
  assert.throws(()=>services.stop(),error=>error.message==='ISOLATED_SERVICE_CLEANUP_FAILED'&&error.errors.length===2);
  assert.equal(calls.filter(args=>args[0]==='rm').length,2,'attempt both owned removals after failure');
  failCleanup=false;
 }
 services.stop();const count=calls.length;services.stop();
 assert.equal(calls.length,count,'successful cleanup is idempotent');
 assert.equal(calls.filter(args=>args[0]==='rm').length,mode==='cleanup'?4:2);
}
console.log('SYNTHETIC cleanup fault-injection PASS: '+mode);
