import {readFileSync} from 'node:fs';
import {configuredBotUrl,type BotConfig} from './bot.ts';
import {requireThat} from '../domain/errors.ts';
export interface Config extends BotConfig {mode:'test'|'demo'|'live'|'hybrid';demoCatalogVersion?:'v2';databaseUrl:string;redisUrl:string;publicOrigin:string;sessionKey:string;escrowKey:string;botToken:string;webhookSecret:string;credentialScope:string;cookieProfile:'LAX_FIRST_PARTY'|'PARTITIONED_EMBEDDED';ingressMode:'WEBHOOK'|'POLLING';liveGate:string;botUsername?:string;externalOrigins?:string[];aiExternalEnabled?:boolean;gigaChatAuthKey?:string;}
export function ownerPreviewAllowed(e:NodeJS.ProcessEnv,mode:Config['mode'],publicOrigin:string):boolean {
 try {const origin=new URL(publicOrigin);return e.POVOD_OWNER_PREVIEW==='1'&&e.NODE_ENV!=='production'&&['test','demo','hybrid'].includes(mode)
  &&origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)&&origin.origin===publicOrigin;}
 catch{return false;}
}
export function config(e:NodeJS.ProcessEnv=process.env):Config {
 const local=e.RUNTIME_FILE?JSON.parse(readFileSync(e.RUNTIME_FILE,'utf8')) as Record<string,string>:{};
 const get=(k:string)=>e[k]??local[k]??'';
 const mode=get('APP_MODE');requireThat(mode==='test'||mode==='demo'||mode==='live'||mode==='hybrid','APP_MODE_REQUIRED');
 const demoCatalogVersion=get('DEMO_CATALOG_VERSION');requireThat(mode==='demo'||mode==='hybrid'?demoCatalogVersion==='v2':!demoCatalogVersion,'DEMO_CATALOG_CONFIG_INVALID');
 const profile=get('COOKIE_PROFILE');requireThat(profile==='LAX_FIRST_PARTY'||profile==='PARTITIONED_EMBEDDED','COOKIE_PROFILE_REQUIRED');
 const ingress=get('MAX_INGRESS_MODE')||'WEBHOOK';requireThat(ingress==='WEBHOOK'||ingress==='POLLING','INGRESS_MODE');
 requireThat(ingress!=='POLLING','POLLING_ADAPTER_NOT_IMPLEMENTED',503); // Explicit fail-closed until durable marker runner is integrated.
 const publicOrigin=get('PUBLIC_ORIGIN');const origin=new URL(publicOrigin);
 const localOwnerPreview=ownerPreviewAllowed({...e,POVOD_OWNER_PREVIEW:get('POVOD_OWNER_PREVIEW')},mode,publicOrigin);
 requireThat(origin.origin===publicOrigin&&(origin.protocol==='https:'||((!['live','hybrid'].includes(mode)||localOwnerPreview)&&['localhost','127.0.0.1'].includes(origin.hostname))), 'HTTPS_ORIGIN_REQUIRED');
 for(const key of ['SESSION_KEY','ESCROW_KEY','BOT_TOKEN','CREDENTIAL_SCOPE','DATABASE_URL','REDIS_URL'])requireThat(get(key).length>0,`MISSING_${key}`);
 const webhookSecret=get('MAX_WEBHOOK_SECRET')||get('WEBHOOK_SECRET');
 requireThat(webhookSecret.length>0,'MISSING_MAX_WEBHOOK_SECRET');
 requireThat(!get('MAX_WEBHOOK_SECRET')||!get('WEBHOOK_SECRET')||get('MAX_WEBHOOK_SECRET')===get('WEBHOOK_SECRET'),'WEBHOOK_SECRET_CONFLICT');
 requireThat(![get('BOT_TOKEN'),get('SESSION_KEY'),get('ESCROW_KEY')].includes(webhookSecret),'WEBHOOK_SECRET_MUST_BE_SEPARATE');
 const miniappUrl=configuredBotUrl(get('POVOD_MINIAPP_URL'),mode,'POVOD_MINIAPP_URL');
 const privacyUrl=configuredBotUrl(get('POVOD_PRIVACY_URL'),mode,'POVOD_PRIVACY_URL');
 const aboutUrl=configuredBotUrl(get('POVOD_ABOUT_URL'),mode,'POVOD_ABOUT_URL');
 requireThat(/^[a-f0-9]{64}$/.test(get('ESCROW_KEY'))&&get('SESSION_KEY').length>=32&&webhookSecret.length>=32,'KEY_STRENGTH');
 requireThat(!['live','hybrid'].includes(mode)||localOwnerPreview||get('LIVE_GATE')==='REVIEWED_MAX26_LIVE','LIVE_RELEASE_GATE_CLOSED',503);
 requireThat(/^[A-Za-z0-9_-]{32,256}$/.test(webhookSecret),'WEBHOOK_SECRET_FORMAT');
 const botUsername=get('MAX_BOT_USERNAME');requireThat(!botUsername||/^[A-Za-z0-9_]{3,80}$/.test(botUsername),'BOT_USERNAME_FORMAT');
 requireThat(!['live','hybrid'].includes(mode)||localOwnerPreview||botUsername.length>0,'BOT_USERNAME_REQUIRED',503);
 const externalOrigins=(get('ALLOWED_SOURCE_ORIGINS')||'').split(',').filter(Boolean);
 for(const value of externalOrigins){const u=new URL(value);requireThat(u.origin===value&&u.protocol==='https:','EXTERNAL_ORIGIN_REQUIRED');}
 const aiFlag=get('AI_EXTERNAL_ENABLED');
 requireThat(!aiFlag||aiFlag==='false'||aiFlag==='true','AI_EXTERNAL_FLAG_INVALID');
 const aiExternalEnabled=aiFlag==='true',gigaChatAuthKey=get('GIGACHAT_AUTH_KEY');
 if(aiExternalEnabled){
  requireThat(mode==='live'||mode==='hybrid','AI_MODE_INVALID');
  requireThat(/^[A-Za-z0-9+/=]{20,4096}$/.test(gigaChatAuthKey),'GIGACHAT_AUTH_KEY_REQUIRED',503);
 }
 requireThat(!get('MAP_EXTERNAL_ENABLED')||get('MAP_EXTERNAL_ENABLED')==='false','MAP_ADMISSION_NOT_IMPLEMENTED',503);
 return {mode,demoCatalogVersion:mode==='demo'||mode==='hybrid'?'v2':undefined,databaseUrl:get('DATABASE_URL'),redisUrl:get('REDIS_URL'),publicOrigin,sessionKey:get('SESSION_KEY'),escrowKey:get('ESCROW_KEY'),botToken:get('BOT_TOKEN'),webhookSecret,miniappUrl,privacyUrl,aboutUrl,credentialScope:get('CREDENTIAL_SCOPE'),cookieProfile:profile,ingressMode:ingress,liveGate:get('LIVE_GATE'),botUsername,externalOrigins,aiExternalEnabled,...(aiExternalEnabled?{gigaChatAuthKey}:{})};
}
