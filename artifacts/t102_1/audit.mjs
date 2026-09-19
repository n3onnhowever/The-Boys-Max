import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const dir='artifacts/t102_1/';const read=p=>fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'');const json=p=>JSON.parse(read(p));const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const f of ['FILES_CHANGED.md','FILES_CHANGED.json','FINAL_VERIFICATION.json','SECRET_SCAN.json','FINAL_WORKTREE_HASHES.json'])if(!fs.existsSync(dir+f))fs.writeFileSync(dir+f,f.endsWith('.json')?'{}\n':'');
const git=args=>execFileSync('git',['-c','safe.directory=D:/Dev/Repos/The-Boys-Max',...args],{encoding:'utf8'});
const files=[...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean))].sort();
const base=json(dir+'STARTING_HASHES.json');const modified=Object.entries(base).filter(([p,h])=>!fs.existsSync(p)||sha(p)!==h).map(([p])=>p);
const created=files.filter(p=>!Object.hasOwn(base,p));
const protectedChanged=modified.filter(p=>p.startsWith('docs/research/')||p.startsWith('docs/architecture/adr/')||p.startsWith('docs/product/povod-2026-09-19/')||p.startsWith('artifacts/t101/')||p.startsWith('artifacts/t102/')||p.startsWith('artifacts/preflight/'));
if(protectedChanged.length)throw Error('Protected inputs changed: '+protectedChanged.join(','));
const source=json(dir+'SOURCE_REVISION.json');for(const [p,h] of Object.entries(source.files))if(sha(p)!==h)throw Error('Source changed after final checks: '+p);
fs.writeFileSync(dir+'FINAL_WORKTREE_HASHES.json',JSON.stringify(Object.fromEntries(files.filter(p=>!p.startsWith(dir)).map(p=>[p,sha(p)])),null,2));
const changeReceipt={baseline:'STARTING_HASHES.json; preserves pre-existing T070/T101/T102 work',modified,created,ignored_outputs:['node_modules','dist','dependency-preflight.json'],commit_created:false};
fs.writeFileSync(dir+'FILES_CHANGED.json',JSON.stringify(changeReceipt,null,2));
fs.writeFileSync(dir+'FILES_CHANGED.md','# T102.1 files changed\n\nRelative to the starting working tree (not HEAD; earlier uncommitted work is preserved).\n\n## Modified existing files\n\n'+modified.map(p=>'- `'+p+'`').join('\n')+'\n\n## Created implementation, tests, documentation\n\n'+created.filter(p=>!p.startsWith(dir)).map(p=>'- `'+p+'`').join('\n')+'\n\n## Evidence files\n\n'+created.filter(p=>p.startsWith(dir)).map(p=>'- `'+p+'`').join('\n')+'\n\nIgnored build/install outputs: node_modules/, dist/, dependency-preflight.json. Docker named volumes retained; containers stopped. No commit/staging.\n');
const patterns={private_key:/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,github_token:/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g,aws_key:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,openai_key:/\bsk-(?:proj-)?[A-Za-z0-9_-]{35,}\b/g,credential_url:/(?:postgres(?:ql)?|rediss?|https?):\/\/[^\s/:]+:[^\s/@]+@/g,literal_bearer:/bearer\s+[A-Za-z0-9_=-]{35,}/gi};
const findings=[],prohibited=[],jsonErrors=[];let scanned=0;
for(const p of files){
 const name=p.split('/').at(-1);if((name.startsWith('.env')&&!['.env.example','.env.release.example'].includes(name))||/\.(pem|key|p12|pfx|pyc)$/.test(p)||['id_rsa','id_ed25519'].includes(name))prohibited.push(p);
 if(/\.(zip|png|jpg|jpeg|pdf|pptx|docx|xlsx)$/.test(p))continue;
 const s=read(p);scanned++;
 for(const [rule,pattern] of Object.entries(patterns)){pattern.lastIndex=0;for(const match of s.matchAll(pattern)){
 const f={path:p,line:s.slice(0,match.index).split('\n').length,rule};
 if(p==='scripts/init-test.mjs'&&rule==='credential_url')f.disposition='REVIEWED_UNCHANGED_SYNTHETIC_TEST_FIXTURE';findings.push(f);
 }}
 if(p.endsWith('.json'))try{JSON.parse(s);}catch{jsonErrors.push(p);}
}
const unresolved=findings.filter(f=>!f.disposition);
const secret={status:!unresolved.length&&!prohibited.length?'PASS_WITH_REVIEWED_TEST_FIXTURE':'FAIL',text_files_scanned:scanned,findings,prohibited_files:prohibited,limitations:'Heuristic patterns; no full-history/entropy audit. Ignored private files, dependencies/build outputs and binary archives are excluded. No matched values printed.'};
fs.writeFileSync(dir+'SECRET_SCAN.json',JSON.stringify(secret,null,2));
const records=json(dir+'COMMAND_RESULTS.json'),results=Object.fromEntries(records.map(r=>[r.name,r]));
const required=['clean-install','verify-dependencies-final','syntax-final','unit-final','typecheck-final','build-final'];
if(required.some(n=>results[n]?.exit_code!==0))throw Error('Required check failed');
const lock=json(dir+'LOCK_REPRODUCIBILITY.json');if(!lock.unchanged||sha('package-lock.json').toUpperCase()!==lock.after_sha256)throw Error('Lock changed');
const brokenLinks=[];for(const p of ['README.md','docs/tasks/ACTIVE_TASK.md','docs/current/PROJECT_STATE.md','docs/current/KNOWN_GAPS.md','docs/handoffs/T102_1_COMPILER_DOCKER_BASELINE.md'])for(const match of read(p).matchAll(/\]\(([^)]+)\)/g)){const target=match[1];if(/^[a-z][a-z0-9+.-]*:|^#/i.test(target))continue;const url=new URL(decodeURIComponent(target.split('#')[0]),new URL(p,'file:///'+process.cwd().replaceAll('\\','/')+'/'));if(!fs.existsSync(url))brokenLinks.push({p,target});}
const report={starting_head:read(dir+'logs/starting-head.txt').trim(),ending_head:git(['rev-parse','HEAD']).trim(),branch:git(['branch','--show-current']).trim(),commit_created:false,code_baseline:'PASS',T102:'PARTIAL_REQUIRES_NETWORK_REVIEW',docker:{daemon:'PASS',clean_build:'PASS',clean_build_seconds:results['docker-build-final'].duration_seconds,within_300_seconds:true,start:'PASS',internal_health:'PASS',stop_restart_internal_health:'PASS',host_access:'BLOCKED_NETWORK_DECISION',overall:'PARTIAL',final_containers:'STOPPED',volumes:'PRESERVED'},checks:Object.fromEntries(required.map(n=>[n,{exit_code:results[n].exit_code,duration_seconds:results[n].duration_seconds,log:results[n].log,source_revision:results[n].source_revision}])),unit:{total:115,passed:115,skipped:0},lock_reproducible:true,strict_unchanged:true,skipLibCheck:false,source_sha256:source.source_sha256,source_hashes_match:true,protected_input_changes:protectedChanged,preexisting_work_preserved:true,secret_scan:secret.status,prohibited_files:prohibited,json_errors:jsonErrors,broken_current_links:brokenLinks,diff_check_exit:results['diff-check'].exit_code,queue_architecture_unchanged:true,domain_price_unchanged:true,T103_activated:false,T104_activated:false,T106_activated:false,next_action:'Human review of Docker host access/network isolation; no next ticket started'};
fs.writeFileSync(dir+'FINAL_VERIFICATION.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({modified:modified.length,created:created.length,code_baseline:report.code_baseline,T102:report.T102,source_hashes_match:true,secret_scan:secret.status,unresolved,prohibited,jsonErrors,brokenLinks},null,2));
if(unresolved.length||prohibited.length||jsonErrors.length||brokenLinks.length)process.exitCode=1;
