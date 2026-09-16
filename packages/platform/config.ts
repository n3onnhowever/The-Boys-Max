import {readFileSync} from 'node:fs';
import {requireThat} from '../domain/errors.ts';
export interface Config {mode:'test'|'live';databaseUrl:string;redisUrl:string;publicOrigin:string;sessionKey:string;escrowKey:string;botToken:string;webhookSecret:string;credentialScope:string;cookieProfile:'LAX_FIRST_PARTY'|'PARTITIONED_EMBEDDED';ingressMode:'WEBHOOK'|'POLLING';liveGate:string;botUsername?:string;externalOrigins?:string[];}
export function config():Config {
 const e=process.env, local=e.RUNTIME_FILE?JSON.parse(readFileSync(e.RUNTIME_FILE,'utf8')) as Record<string,string>:{};
 const get=(k:string)=>e[k]??local[k]??'';
 const mode=get('APP_MODE');requireThat(mode==='test'||mode==='live','APP_MODE_REQUIRED');
 const profile=get('COOKIE_PROFILE');requireThat(profile==='LAX_FIRST_PARTY'||profile==='PARTITIONED_EMBEDDED','COOKIE_PROFILE_REQUIRED');
 const ingress=get('MAX_INGRESS_MODE')||'WEBHOOK';requireThat(ingress==='WEBHOOK'||ingress==='POLLING','INGRESS_MODE');
 requireThat(ingress!=='POLLING','POLLING_ADAPTER_NOT_IMPLEMENTED',503); // Explicit fail-closed until durable marker runner is integrated.
 const publicOrigin=get('PUBLIC_ORIGIN');const origin=new URL(publicOrigin);
 requireThat(origin.origin===publicOrigin&&(origin.protocol==='https:'||mode==='test'&&['localhost','127.0.0.1'].includes(origin.hostname)),'HTTPS_ORIGIN_REQUIRED');
 for(const key of ['SESSION_KEY','ESCROW_KEY','BOT_TOKEN','WEBHOOK_SECRET','CREDENTIAL_SCOPE','DATABASE_URL','REDIS_URL'])requireThat(get(key).length>0,`MISSING_${key}`);
 requireThat(/^[a-f0-9]{64}$/.test(get('ESCROW_KEY'))&&get('SESSION_KEY').length>=32&&get('WEBHOOK_SECRET').length>=32,'KEY_STRENGTH');
 requireThat(mode!=='live'||get('LIVE_GATE')==='REVIEWED_MAX26_LIVE','LIVE_RELEASE_GATE_CLOSED',503);
 requireThat(/^[A-Za-z0-9_-]{32,256}$/.test(get('WEBHOOK_SECRET')),'WEBHOOK_SECRET_FORMAT');
 const botUsername=get('MAX_BOT_USERNAME');requireThat(!botUsername||/^[A-Za-z0-9_]{3,80}$/.test(botUsername),'BOT_USERNAME_FORMAT');
 requireThat(mode!=='live'||botUsername.length>0,'BOT_USERNAME_REQUIRED',503);
 const externalOrigins=(get('ALLOWED_SOURCE_ORIGINS')||'').split(',').filter(Boolean);
 for(const value of externalOrigins){const u=new URL(value);requireThat(u.origin===value&&u.protocol==='https:','EXTERNAL_ORIGIN_REQUIRED');}
 requireThat(!get('AI_EXTERNAL_ENABLED')||get('AI_EXTERNAL_ENABLED')==='false','AI_ADMISSION_NOT_IMPLEMENTED',503);
 requireThat(!get('MAP_EXTERNAL_ENABLED')||get('MAP_EXTERNAL_ENABLED')==='false','MAP_ADMISSION_NOT_IMPLEMENTED',503);
 return {mode,databaseUrl:get('DATABASE_URL'),redisUrl:get('REDIS_URL'),publicOrigin,sessionKey:get('SESSION_KEY'),escrowKey:get('ESCROW_KEY'),botToken:get('BOT_TOKEN'),webhookSecret:get('WEBHOOK_SECRET'),credentialScope:get('CREDENTIAL_SCOPE'),cookieProfile:profile,ingressMode:ingress,liveGate:get('LIVE_GATE'),botUsername,externalOrigins};
}
