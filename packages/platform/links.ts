import {requireThat} from '../domain/errors.ts';
export type Launch={kind:'PERSONAL'}|{kind:'PLAN';planId:string}|{kind:'INVITE';inviteRef:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** A locator is not authority: every resolved plan still requires current session and ACL. */
export function launchParam(route:Launch):string {
 if(route.kind==='PERSONAL')return 'catalog';
 if(route.kind==='PLAN'){requireThat(uuid.test(route.planId),'PLAN_LOCATOR');return 'p_'+route.planId;}
 requireThat(/^[a-f0-9]{64}$/.test(route.inviteRef),'INVITE_LOCATOR');return 'i_'+route.inviteRef;
}
export function decodeLaunch(raw:unknown):Launch {
 if(typeof raw!=='string'||raw.length>128)return {kind:'PERSONAL'};
 if(raw.startsWith('p_')&&uuid.test(raw.slice(2)))return {kind:'PLAN',planId:raw.slice(2)};
 if(/^i_[a-f0-9]{64}$/.test(raw))return {kind:'INVITE',inviteRef:raw.slice(2)};
 return {kind:'PERSONAL'};
}
export function launchLink(route:Launch,config:{mode:'test'|'live';publicOrigin:string;botUsername?:string}):string {
 const param=launchParam(route);
 if(config.botUsername){requireThat(/^[A-Za-z0-9_]{3,80}$/.test(config.botUsername),'BOT_USERNAME_FORMAT');const url=new URL('https://max.ru/'+config.botUsername);url.searchParams.set('startapp',param);return url.toString();}
 requireThat(config.mode==='test','BOT_USERNAME_REQUIRED',503);
 const url=new URL(config.publicOrigin);url.searchParams.set('launch',param);return url.toString();
}
