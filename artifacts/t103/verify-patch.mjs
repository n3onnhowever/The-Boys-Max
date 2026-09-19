import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('patches/drizzle-orm-0.45.2.json','utf8'));
for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync('node_modules/drizzle-orm/'+f.path)).digest('hex'),f.after_sha256,f.path);
console.log(JSON.stringify({version:manifest.version,verified_after_hashes:manifest.files.length}));
