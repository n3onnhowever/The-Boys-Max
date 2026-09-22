import {requireThat} from '../domain/errors.ts';
import {launchParam,type Launch} from './launch.ts';
export {launchParam,decodeLaunch,type Launch} from './launch.ts';
export function launchLink(route:Launch,config:{mode:'test'|'live';publicOrigin:string;botUsername?:string}):string {
 const param=launchParam(route);
 if(config.botUsername){requireThat(/^[A-Za-z0-9_]{3,80}$/.test(config.botUsername),'BOT_USERNAME_FORMAT');const url=new URL('https://max.ru/'+config.botUsername);url.searchParams.set('startapp',param);return url.toString();}
 requireThat(config.mode==='test','BOT_USERNAME_REQUIRED',503);
 const url=new URL(config.publicOrigin);url.searchParams.set('launch',param);return url.toString();
}
