/** Shared WP1C fixtures: real isolated services, synthetic signed MAX identities only. */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {buildApp} from '../../apps/api/app.ts';
import {config} from '../../packages/platform/config.ts';
import {sign} from '../fixtures.ts';

export function httpConfig(){
 const c=config();
 assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(c.mode,'test');
 assert.equal(new URL(c.databaseUrl).pathname,'/max23_test');assert.equal(c.aiExternalEnabled,false);
 // Each independent service fixture has its own deployment scope; production has no test bypass.
 return {...c,credentialScope:'SYNTHETIC_WP1C_'+randomUUID()};
}
export type HttpApp=Awaited<ReturnType<typeof buildApp>>;
export async function signedSession(ctx:HttpApp,c:ReturnType<typeof httpConfig>){
 const bootstrap=await ctx.sessions.bootstrap();
 const now=Number((await ctx.pool.query('SELECT extract(epoch FROM clock_timestamp())::text seconds')).rows[0].seconds);
 const external=BigInt('0x'+randomBytes(7).toString('hex')).toString();
 const raw=sign(c.botToken,`{"id":${external},"first_name":"SYNTHETIC WP1C"}`,Math.floor(now),{query_id:randomUUID()});
 const result=await ctx.sessions.exchange(bootstrap.binding,bootstrap.body.csrfToken,raw,randomUUID(),undefined);
 return {actorId:result.body.actor.id,headers:{origin:c.publicOrigin,'content-type':'application/json',cookie:`__Host-max_session=${result.token}`,'x-csrf-token':result.body.csrfToken}};
}
export async function countRows(ctx:HttpApp,table:'session_bootstraps'|'app_sessions'|'actor_preferences'){
 return Number((await ctx.pool.query(`SELECT count(*) n FROM ${table}`)).rows[0].n);
}
export function errorResponse(response:{statusCode:number;json:()=>any;body:string;headers:Record<string,unknown>},status:number,code?:string){
 assert.equal(response.statusCode,status);
 if(code)assert.equal(response.json().error.code,code);
 assert.equal(response.headers['set-cookie'],undefined);
 assert.deepEqual(Object.keys(response.json()),['error']);
 assert.deepEqual(Object.keys(response.json().error).sort(),['code','requestId']);
}
