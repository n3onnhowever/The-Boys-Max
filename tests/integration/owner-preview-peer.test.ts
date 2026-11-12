import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../../apps/api/app.ts';
import {ownerPreviewAllowed} from '../../packages/platform/config.ts';
import {httpConfig,countRows,errorResponse} from './http-boundary-fixtures.ts';
const saved={flag:process.env.POVOD_OWNER_PREVIEW,node:process.env.NODE_ENV};
process.env.POVOD_OWNER_PREVIEW='1';process.env.NODE_ENV='development';
const c=httpConfig(),ctx=await buildApp(c);await ctx.app.ready();
after(async()=>{await ctx.app.close();for(const [key,value] of [['POVOD_OWNER_PREVIEW',saved.flag],['NODE_ENV',saved.node]]){if(value===undefined)delete process.env[key!];else process.env[key!]=value;}});
const preview=(remoteAddress:string,headers:Record<string,string>={})=>ctx.app.inject({method:'POST',url:'/dev/owner-session',remoteAddress,headers:{origin:c.publicOrigin,'content-type':'application/json',...headers},payload:{persona:'owner'}});
for(const peer of ['203.0.113.9','10.0.0.1','192.168.1.1','0.0.0.0','::','2001:db8::1','::ffff:203.0.113.9','::ffff:cb00:7109'])test('preview denies direct nonloopback peer '+peer,async()=>{
 const before=await countRows(ctx,'app_sessions');
 const r=await preview(peer,{'x-forwarded-for':'127.0.0.1',forwarded:'for="[::1]"'});errorResponse(r,403,'PREVIEW_LOCAL_ONLY');
 assert.equal(await countRows(ctx,'app_sessions'),before);
});
for(const peer of ['127.0.0.1','127.0.0.2','::1','0:0:0:0:0:0:0:1','::ffff:127.0.0.1','::ffff:7f00:1'])test('preview permits actual loopback representation '+peer,async()=>{
 const before=await countRows(ctx,'app_sessions'),r=await preview(peer,{'x-forwarded-for':'203.0.113.9'});
 assert.equal(r.statusCode,200);assert.deepEqual(r.json(),{ready:true});assert.ok(r.headers['set-cookie']);assert.equal(await countRows(ctx,'app_sessions'),before+1);
});
test('preview still requires allowed Origin on loopback',async()=>{
 const before=await countRows(ctx,'app_sessions');errorResponse(await preview('127.0.0.1',{origin:'https://foreign.invalid'}),403,'ORIGIN_INVALID');assert.equal(await countRows(ctx,'app_sessions'),before);
});
test('preview flag, production and live admission remain closed',async()=>{
 for(const [flag,node,mode] of [['0','development','test'],['1','production','test'],['1','development','live']] as const){
  process.env.POVOD_OWNER_PREVIEW=flag;process.env.NODE_ENV=node;
  assert.equal(ownerPreviewAllowed(process.env,mode,c.publicOrigin),false);
  const other=await buildApp({...c,mode});try{errorResponse(await other.app.inject({method:'POST',url:'/dev/owner-session',headers:{origin:c.publicOrigin},payload:{persona:'owner'}}),404);}finally{await other.app.close();}
 }
 process.env.POVOD_OWNER_PREVIEW='1';process.env.NODE_ENV='development';
});
