import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
p.scripts.typecheck='node scripts/patch-drizzle-declarations.mjs && '+p.scripts.typecheck;
p.scripts.build='node scripts/patch-drizzle-declarations.mjs && '+p.scripts.build;
fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
