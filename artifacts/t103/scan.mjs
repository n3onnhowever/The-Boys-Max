import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
assert.equal(process.cwd().replaceAll('\\','/'),'D:/Dev/Repos/The-Boys-Max-t103');
const git=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8'});assert.equal(r.status,0);return r.stdout;};
assert.equal(git('branch','--show-current').trim(),'codex/t103-bullmq-runtime');
const files=[...new Set(git('ls-files','--cached','--others','--exclude-standard','-z').split('\0').filter(p=>p&&fs.existsSync(p)))];
const findings=[],prohibited=[];
for(const path of files){
 if((/(^|\/)\.env(?:\.|$)/.test(path)&&!path.endsWith('.example'))||/(^|\/)(\.runtime|node_modules)\//.test(path)||/\.(pem|p12|pfx|key)$/.test(path))prohibited.push(path);
 const b=fs.readFileSync(path);if(b.includes(0)||b.length>10e6)continue;
 b.toString('utf8').split(/\r?\n/).forEach((line,i)=>{
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)||/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16})\b/.test(line)||/\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/.test(line))findings.push({path,line:i+1,rule:'credential_signature'});
 });
}
const mutable=git('diff','--name-only','5e4973f24fb74489387b3c29313cfcd1e8401ca7').trim().split('\n').filter(Boolean);
const allowed=['packages/persistence/plans.ts','tests/integration/foundation.test.ts','docs/tasks/ACTIVE_TASK.md'];
const unexpected=mutable.filter(p=>!allowed.includes(p)&&!p.startsWith('artifacts/t103/')&&!p.startsWith('tests/helpers/t103-')&&p!=='docs/handoffs/T103_BULLMQ_RUNTIME.md');
const payload={status:findings.length||prohibited.length||unexpected.length?'FAIL':'PASS',files_scanned:files.length,findings,prohibited,changed_tracked:mutable,unexpected,limitations:'Heuristic credential signatures + prohibited filenames; text <=10MB, no ignored runtime/env contents, no full-history or entropy guarantee. Existing synthetic fixture literals are not external credentials.'};
fs.writeFileSync('artifacts/t103/SECRET_SCAN.json',JSON.stringify(payload,null,2)+'\n');
const paths=[...new Set([...git('ls-files','apps','packages','modules','migrations','scripts','tests','package.json','package-lock.json','compose.yaml','Dockerfile').trim().split('\n'),...git('ls-files','--others','--exclude-standard','tests').trim().split('\n')])].filter(Boolean);
fs.writeFileSync('artifacts/t103/FINAL_SOURCE_HASHES.json',JSON.stringify(Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),null,2)+'\n');
console.log(JSON.stringify({status:payload.status,files_scanned:files.length,findings:findings.length,prohibited:prohibited.length,unexpected}));
if(payload.status!=='PASS')process.exitCode=1;
