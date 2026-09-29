import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {out,run,save} from './verification-lib.mjs';
const image=JSON.parse(fs.readFileSync(out+'/EXACT_IMAGE.json','utf8')).imageId;
const mount=name=>['--mount','type=bind,source='+path.resolve(out,name)+',target=/verify/'+name+',readonly'];
const tls=run('exact-image-tls','docker',['run','--rm',...mount('tls-smoke.mjs'),image,'node','/verify/tls-smoke.mjs']);save('TLS_EVIDENCE.json',{imageId:image,...JSON.parse(tls)});
const secretPath='D:/Dev/Repos/The-Boys-Max/.secrets/max.env';
if(!fs.existsSync(secretPath)){save('MAX_READ_ONLY.json',{status:'BLOCKED_SECRET_UNAVAILABLE',imageId:image,mutations:0});process.exitCode=1;}else{let raw=fs.readFileSync(secretPath,'utf8');let token=raw.split(/\r?\n/).find(l=>/^\s*MAX_BOT_TOKEN\s*=/.test(l))?.replace(/^\s*MAX_BOT_TOKEN\s*=\s*/,'').trim();raw='';if(token?.startsWith('"')&&token.endsWith('"')||token?.startsWith("'")&&token.endsWith("'"))token=token.slice(1,-1);if(!token)throw new Error('TOKEN_UNAVAILABLE');
 const args=['run','--rm','-i',...mount('live-readonly.mjs'),image,'node','/verify/live-readonly.mjs'];const started=new Date().toISOString();const r=spawnSync('docker',args,{input:JSON.stringify({token}),encoding:'utf8',maxBuffer:1048576,timeout:40000});token='';
 // Never persist stderr or input from a credential-bearing child; stdout is an explicit allowlist receipt.
 let receipt;try{receipt=JSON.parse(r.stdout);}catch{receipt={status:'BLOCKED_LIVE_PROCESS',mutations:0};}save('MAX_READ_ONLY.json',{imageId:image,started,exit:r.status,...receipt});console.log(JSON.stringify({label:'live-readonly',exit:r.status,status:receipt.status}));if(r.status!==0)process.exitCode=1;}
