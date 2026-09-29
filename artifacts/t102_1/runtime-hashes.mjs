import fs from 'node:fs';import crypto from 'node:crypto';
const paths=fs.readdirSync('node_modules/drizzle-orm',{recursive:true}).filter(p=>/\.(js|cjs)$/.test(p)).sort();
const entries=Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync('node_modules/drizzle-orm/'+p)).digest('hex')]));
const file='artifacts/t102_1/DRIZZLE_RUNTIME_HASHES.json';
if(process.argv[2]==='verify'){const original=JSON.parse(fs.readFileSync(file));if(JSON.stringify(original)!==JSON.stringify(entries))throw Error('Runtime changed');console.log(`${paths.length} JavaScript runtime files unchanged`);}else fs.writeFileSync(file,JSON.stringify(entries,null,2));
