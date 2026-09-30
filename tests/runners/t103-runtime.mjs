// T103 host coordinator: controls only the explicitly isolated project; no Docker socket in containers.
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('.run-evidence/t103/logs',{recursive:true});
const project='povod-t103';
const args=['compose','-p',project,'run','-T','--no-deps','--rm','-v',`${process.cwd().replaceAll('\\','/')}/tests:/app/tests:ro`,'-v',`${process.cwd().replaceAll('\\','/')}/packages:/app/packages:ro`,'checks','node','--experimental-strip-types','tests/helpers/t103-runtime.ts'];
if(process.argv[2]){assert.match(process.argv[2],/^[a-z,-]+$/);args.splice(args.indexOf('checks'),0,'-e','T103_ONLY='+process.argv[2]);}
console.log(JSON.stringify({command:['docker',...args]}));
const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});
child.stderr.pipe(process.stderr);
const lines=createInterface({input:child.stdout});
const actions=[];
lines.on('line',line=>{
 console.log(line);
 if(line.startsWith('T103_RESULT ')){
  const r=JSON.parse(line.slice(12));writeFileSync(`.run-evidence/t103/logs/${r.name}.txt`,JSON.stringify(r,null,2)+'\n');
 }
 if(!line.startsWith('T103_CONTROL '))return;
 const [service,action,id]=line.slice(13).split(' ');
 assert.ok(['redis','postgres'].includes(service));assert.ok(['stop','start','kill'].includes(action));
 const inspect=spawnSync('docker',['inspect','--format','{{ index .Config.Labels "com.docker.compose.project" }}',`${project}-${service}-1`],{encoding:'utf8'});
 assert.equal(inspect.status,0);assert.equal(inspect.stdout.trim(),project);
 const command=action==='start'?['compose','-p',project,'up','--no-deps','-d','--wait',service]:['compose','-p',project,action,service];
 const start=Date.now(),r=spawnSync('docker',command,{encoding:'utf8',timeout:60000});
 actions.push({command:['docker',...command],exit_code:r.status,duration_ms:Date.now()-start});
 console.log(r.stdout.trim());console.error(r.stderr.trim());
 child.stdin.write(`T103_DONE ${id} ${r.status}\n`);
});
child.on('exit',code=>{writeFileSync('.run-evidence/t103/DOCKER_FAULT_ACTIONS.json',JSON.stringify(actions,null,2)+'\n');process.exitCode=code??1;});
