import fs from 'node:fs';import crypto from 'node:crypto';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;e.isDirectory()?walk(p):files.push(p);}}
for(const dir of ['apps','packages','modules','scripts','tests','migrations','patches','licenses'])walk(dir);
for(const p of ['package.json','package-lock.json','tsconfig.json','tsconfig.build.json','tsconfig.pure.json','Dockerfile','compose.yaml','compose.release.yaml','.npmrc','.dockerignore'])if(fs.existsSync(p))files.push(p);
const hashes=Object.fromEntries(files.sort().map(p=>[p,hash(fs.readFileSync(p))]));
const receipt={head:'4f9a198d4fa2b18686efa19a59b6ac78281d341d',source_sha256:hash(JSON.stringify(hashes)),files:hashes};
fs.writeFileSync('artifacts/t102_1/SOURCE_REVISION.json',JSON.stringify(receipt,null,2));console.log(receipt.source_sha256);
