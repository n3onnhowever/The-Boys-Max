// Pinned declaration-only corrections; provenance and Apache-2.0 notice in licenses/.
// No lifecycle hook: invoked explicitly by typecheck/build after npm ci --ignore-scripts.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const patch=JSON.parse(await readFile(new URL('../patches/drizzle-orm-0.45.2.json',import.meta.url),'utf8'));
const root=new URL('../node_modules/drizzle-orm/',import.meta.url);
const pkg=JSON.parse(await readFile(new URL('package.json',root),'utf8'));
if(pkg.version!==patch.version)throw new Error('Drizzle version changed: review declaration corrections before building');
const hash=text=>createHash('sha256').update(text).digest('hex');
const pending=[];
for(const file of patch.files){
 if(!/^[a-z0-9/-]+(?:\.types)?\.d\.ts$/.test(file.path))throw new Error('Invalid declaration path');
 const url=new URL(file.path,root),current=await readFile(url,'utf8');

 if(hash(current)===file.after_sha256)continue;
 if(hash(current)!==file.before_sha256)throw new Error(`Unexpected declaration bytes: ${file.path}`);
 const text=current.slice(0,file.offset)+file.insert+current.slice(file.offset+file.remove.length);
 if(current.slice(file.offset,file.offset+file.remove.length)!==file.remove||hash(text)!==file.after_sha256)throw new Error(`Invalid patch receipt: ${file.path}`);
 pending.push({url,text});
}
// Validate every input before changing any declaration. Repeated runs are idempotent.
for(const {url,text} of pending)await writeFile(url,text);
console.log(`Drizzle ${patch.version}: ${pending.length} declaration corrections applied; ${patch.files.length} verified`);
