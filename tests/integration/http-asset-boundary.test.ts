import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {request} from 'node:http';
import {randomUUID} from 'node:crypto';
import {buildApp} from '../../apps/api/app.ts';
import {httpConfig,errorResponse} from './http-boundary-fixtures.ts';

const ctx=await buildApp(httpConfig()),prefix='wp1c-'+randomUUID();
const root=resolve('dist/miniapp/assets'),inside=join(root,prefix),outside=resolve(prefix+'-outside');
const marker='SYNTHETIC_WP1C_OUTSIDE_ASSET_ROOT';
let port:number;
const rawGet=(path:string)=>new Promise<{statusCode:number;body:string;json:()=>any;headers:Record<string,unknown>}>((accept,reject)=>{
 const req=request({host:'127.0.0.1',port,path},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>accept({statusCode:res.statusCode!,body,json:()=>JSON.parse(body),headers:res.headers}));});req.on('error',reject);req.end();
});
const mime:Record<string,string>={js:'application/javascript',css:'text/css',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',ico:'image/x-icon',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf'};
before(async()=>{
 await mkdir(join(inside,'nested'),{recursive:true});await mkdir(outside);
 await writeFile(join(outside,'probe.js'),marker);await writeFile(join(inside,'probe.json'),'SYNTHETIC_INVALID_EXTENSION');
 for(const ext of Object.keys(mime))await writeFile(join(inside,'nested','probe.'+ext),'SYNTHETIC_VALID_'+ext);
 // A Windows junction is a real directory symlink/reparse boundary and needs no developer-mode privilege.
 await symlink(outside,join(inside,'escape'),process.platform==='win32'?'junction':'dir');
 await ctx.app.listen({host:'127.0.0.1',port:0});
 const address=ctx.app.server.address();assert.ok(address&&typeof address==='object');port=address.port;
});
after(async()=>{await ctx.app.close();await rm(inside,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});});
for(const [ext,type] of Object.entries(mime))test('assets retain nested '+ext+' and MIME',async()=>{
 const r=await ctx.app.inject({url:'/assets/'+prefix+'/nested/probe.'+ext});
 assert.equal(r.statusCode,200);assert.equal(r.body,'SYNTHETIC_VALID_'+ext);assert.ok(String(r.headers['content-type']).startsWith(type));
});
const outsideLocator=outside.replace(/\\/g,'/').replace(/^[A-Za-z]:/,'')+'/probe.js';
const invalid=[
 ['leading slash',outsideLocator],['double slash','/'+outsideLocator],
 ['encoded slash',encodeURIComponent(outsideLocator)],['encoded double slash','%2f'+encodeURIComponent(outsideLocator)],
 ['double encoded separator','%252f'+prefix+'/probe.js'],['encoded nested separator',prefix+'%2fnested/probe.js'],
 ['mixed separators',prefix+'/nested%5cprobe.js'],['backslash',prefix+'\\nested\\probe.js'],
 ['dot segment',prefix+'/./nested/probe.js'],['parent segment',prefix+'/../probe.js'],
 ['encoded dot',prefix+'/%2e/nested/probe.js'],['encoded parent',prefix+'/%2e%2e/probe.js'],
 ['empty segment',prefix+'//nested/probe.js'],['drive absolute','C:/'+prefix+'/probe.js'],
 ['drive relative','C:'+prefix+'/probe.js'],['UNC','\\\\server\\share\\probe.js'],
 ['slash UNC','//server/share/probe.js'],['encoded drive','C%3a%5c'+prefix+'%5cprobe.js'],
 ['trailing dot',prefix+'/nested./probe.js'],['trailing space',prefix+'/nested%20/probe.js'],
 ['NUL',prefix+'/nested/probe%00.js'],['colon stream',prefix+'/nested/probe.js:probe.js'],
 ['reserved device','CON.js'],['reserved device in directory',prefix+'/NUL/probe.js'],
 ['outside symlink',prefix+'/escape/probe.js'],['invalid extension',prefix+'/probe.json'],
 ['missing',prefix+'/missing.js'],['missing root member','missing-'+prefix+'/probe.js'],
 ['proxy collapsed slashes',outsideLocator.replace(/^\/+/, '')],
];
for(const [name,locator] of invalid)test('asset boundary rejects '+name,async()=>{
 // inject(string) uses WHATWG URL normalization before Fastify sees the request. Use raw HTTP here.
 const r=await rawGet('/assets/'+locator);errorResponse(r,404);
 assert.ok(!r.body.includes(marker));assert.ok(!r.body.includes(outside));
});
test('asset root is independent of process cwd after app construction',async()=>{
 const cwd=process.cwd();process.chdir(outside);
 try{const r=await ctx.app.inject({url:'/assets/'+prefix+'/nested/probe.js'});assert.equal(r.statusCode,200);}finally{process.chdir(cwd);}
});
test('raw HTTP and proxy-normalized paths preserve confinement',async()=>{
 for(const path of ['/assets/'+outsideLocator,'/assets/%2f'+outsideLocator.slice(1),'/assets/'+outsideLocator.replace(/^\/+/,''),'/assets/'+prefix+'/escape/probe.js']){
  const r=await rawGet(path);assert.equal(r.statusCode,404);assert.ok(!r.body.includes(marker));
 }
 assert.equal((await rawGet('/assets/'+prefix+'/nested/probe.js')).statusCode,200);
 // A client/proxy that removes dot/backslash segments has already converted these to a valid asset URL.
 // The app cannot recover that lost syntax; the resulting request must still stay inside the root.
 for(const path of ['/assets/'+prefix+'/./nested/probe.js','/assets/'+prefix+'\\nested\\probe.js']){
  const r=await rawGet(new URL(path,'http://localhost').pathname);assert.equal(r.statusCode,200);assert.equal(r.body,'SYNTHETIC_VALID_js');
 }
});
