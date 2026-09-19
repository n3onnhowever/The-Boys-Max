// Preserve original log bytes; normalize only new T103 text evidence for ordinary Git whitespace checks.
import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const base='artifacts/t103',archive=`${base}/RAW_LOGS.json.gz`,receipt=`${base}/COMMAND_RESULTS.json`;
const raw=fs.existsSync(archive)?JSON.parse(gunzipSync(fs.readFileSync(archive)).toString('utf8')):{};
const sha=b=>createHash('sha256').update(b).digest('hex');
const changes=[];
for(const name of fs.readdirSync(`${base}/logs`).filter(n=>n.endsWith('.txt'))){
 const path=`${base}/logs/${name}`,bytes=fs.readFileSync(path);
 if(!raw[path])raw[path]=bytes.toString('base64');
 const text=bytes.toString('utf8').replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'').replace(/\s+$/,'');
 const normalized=Buffer.from(text?text+'\n':'');
 if(!bytes.equals(normalized)){fs.writeFileSync(path,normalized);changes.push(path);}
}
fs.writeFileSync(archive,gzipSync(JSON.stringify(raw),{level:9}));
const commands=JSON.parse(fs.readFileSync(receipt,'utf8').replace(/^\uFEFF/,''));
for(const c of commands){c.raw_log_sha256=sha(Buffer.from(raw[c.log],'base64'));c.log_sha256=sha(fs.readFileSync(c.log));c.log_normalization='LF; strip trailing horizontal whitespace and blank EOF lines; original bytes in RAW_LOGS.json.gz keyed by log path';}
fs.writeFileSync(receipt,JSON.stringify(commands,null,2)+'\n');
fs.writeFileSync(`${base}/LOG_NORMALIZATION.json`,JSON.stringify({archive,archive_sha256:sha(fs.readFileSync(archive)),original_logs:Object.keys(raw).length,normalization:'LF; trailing spaces/tabs; blank EOF lines only. No test output content or exit changed. Imported/baseline evidence untouched.'},null,2)+'\n');
console.log(JSON.stringify({original_logs:Object.keys(raw).length,normalized_this_run:changes.length}));
