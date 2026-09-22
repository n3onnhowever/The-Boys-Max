import fs from 'node:fs';import crypto from 'node:crypto';
const image='sha256:0b0867b31634ae4bc12b4a4fedcc447182c5709fe8a13fe875ce07c56ed1ea4d',path='/usr/lib/x86_64-linux-gnu/libgnutls.so.30.34.3';
const url='https://raw.githubusercontent.com/gnutls/gnutls/ca61668d7764fc29fb4cc2aa396cb035e176636d/lib/crypto-selftests-pk.c';
const digest=(kind,bytes)=>crypto.createHash(kind).update(bytes).digest('hex');
try{const response=await fetch(url);if(!response.ok)throw new Error('UPSTREAM_HTTP_'+response.status);const source=await response.text(),binary=fs.readFileSync(path),sourceSha=digest('sha256',source),librarySha=digest('sha256',binary);
if(sourceSha!=='c3d79122e072177f55dc30a98f68b949c0f36f6159a363aae9512a22a9280ed0'||librarySha!=='779b25d20249988bea2c1aa6bbeb218f5ae7ea8a9d30ce4f54ea37372965cc4b')throw new Error('PIN_MISMATCH');
const declarations=[...source.matchAll(/(?:static\s+)?(?:const\s+)?(?:char|unsigned\s+char)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\]\s*=\s*((?:"(?:[^"\\]|\\.)*"\s*)+);/g)].filter(m=>m[2].includes('PRIVATE KEY'));
const constants=declarations.map(m=>({name:m[1],bytes:Buffer.from([...m[2].matchAll(/"(?:[^"\\]|\\.)*"/g)].map(s=>JSON.parse(s[0])).join(''))}));
const headers=[...binary.toString('latin1').matchAll(/-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/g)];
const comparisons=headers.map(h=>({offset:h.index,exactUpstreamMatches:constants.filter(c=>binary.subarray(h.index,h.index+c.bytes.length).equals(c.bytes)).map(c=>({name:c.name,bytes:c.bytes.length}))}));
const md5Entry=fs.readFileSync('/var/lib/dpkg/info/libgnutls30:amd64.md5sums','utf8').split('\n').find(l=>l.endsWith('  '+path.slice(1)));const packageMd5Matches=Boolean(md5Entry)&&md5Entry.split(' ')[0]===digest('md5',binary);
const pass=constants.length===10&&headers.length===10&&comparisons.every(c=>c.exactUpstreamMatches.length===1)&&new Set(comparisons.flatMap(c=>c.exactUpstreamMatches.map(m=>m.name))).size===10&&packageMd5Matches;
console.log(JSON.stringify({status:pass?'PASS':'FAIL',disposition:'PUBLIC_UPSTREAM_GNUTLS_SELF_TEST_CONSTANTS_EXACT_MATCH',imageId:image,path,librarySha256:librarySha,sourceUrl:url,sourceSha256:sourceSha,upstreamCommit:'ca61668d7764fc29fb4cc2aa396cb035e176636d',package:'libgnutls30:amd64',version:'3.7.9-2+deb12u7',packageMd5Matches,upstreamConstants:constants.length,binaryPrivateKeyHeaders:headers.length,comparisons,noKeyMaterialEmitted:true},null,2));process.exitCode=pass?0:1;
}catch{console.log(JSON.stringify({status:'FAIL',reason:'VERIFIER_ERROR'}));process.exitCode=1;}
