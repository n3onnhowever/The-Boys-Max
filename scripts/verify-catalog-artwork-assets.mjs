import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';

const base='41bb9b206d4ac309ee13ab769f1d1ef091fbe125';
const names=['category-cinema.png','category-theatre.png','category-concert.png','category-museum.png',
 'category-sport.png','category-outdoor-v2.png','category-other-v2.png','for-you-concert.jpg',
 'for-you-gallery.jpg','for-you-club.jpg','nearby-dance.jpg','home-hero.jpg'];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const rows=names.map(name=>{
 const path=`apps/miniapp/public/assets/events/${name}`;
 const before=sha256(execFileSync('git',['show',`${base}:${path}`],{maxBuffer:20_000_000}));
 const after=sha256(readFileSync(path));
 assert.equal(after,before,`${path} changed`);
 return {path,before_sha256:before,after_sha256:after,identical:true};
});
mkdirSync('artifacts/catalog-artwork',{recursive:true});
writeFileSync('artifacts/catalog-artwork/asset-hashes.json',JSON.stringify({base,assets:rows},null,2)+'\n');
console.log(`PASS ${rows.length} approved artwork files are SHA-256 identical to ${base}`);
