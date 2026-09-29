import {readFile,writeFile} from 'node:fs/promises';
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
if(lock.lockfileVersion!==3)throw new Error('LOCKFILE_V3_REQUIRED');
const dependencies=Object.entries(lock.packages??{}).filter(([p])=>p);
const report=dependencies.map(([path,p])=>({path,version:p.version,license:p.license??'UNKNOWN',hasInstallScript:!!p.hasInstallScript,resolved:p.resolved??null,integrity:p.integrity??null}));
for(const p of report)if(p.resolved&&!p.resolved.startsWith('https://registry.npmjs.org/'))throw new Error('UNAPPROVED_TARBALL_HOST');
await writeFile('lock-review.json',JSON.stringify(report,null,2));
console.log('Review lock-review.json and package lifecycle scripts BEFORE enabling any scripts. npm ci must keep --ignore-scripts.');
