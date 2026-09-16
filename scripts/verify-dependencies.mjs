import {readFile,writeFile} from 'node:fs/promises';
const p=JSON.parse(await readFile('package.json','utf8'));
const rows=[];let failed=false;
for(const [name,version] of Object.entries({...p.dependencies,...p.devDependencies,npm:p.packageManager.split('@').at(-1)})){
 const url=`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`;
 try{const response=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error(`HTTP_${response.status}`);
  const m=await response.json();if(m.version!==version)throw new Error('VERSION_MISMATCH');
  rows.push({name,version,url,status:'METADATA_READ',engines:m.engines??{},peers:m.peerDependencies??{},license:m.license??'UNKNOWN',scripts:m.scripts??{},integrity:m.dist?.integrity??null,tarball:m.dist?.tarball??null});
 }catch(e){failed=true;rows.push({name,version,url,status:'BLOCKED',error:String(e.message)});break;}
}
await writeFile('dependency-preflight.json',JSON.stringify({at:new Date().toISOString(),rows,installed:false},null,2));
if(failed)process.exitCode=1;
