import type {Route} from '../port/contracts.ts';
import {decodeLaunch as context} from '../../../../packages/platform/launch.ts';
/** Resolve navigation only; campaign/referral hints do not change identity, entitlement or state. */
export function resolveLaunch(value:unknown):{route:Route;surface:'home'|'event'|'invite'|'friends'|`plan:${string}`;friendToken?:string;eventRef?:string;error?:string} {
 const launch=context(value);
 const home:Route={kind:'CATALOG',scope:{kind:'PERSONAL'}};
 if(launch.kind==='INVALID')return {route:home,surface:'home',error:'Ссылка недействительна. Откройте Повод с главной страницы.'};
 if(launch.kind==='PLAN')return {route:launch,surface:`plan:${launch.planId}`};
 if(launch.kind==='INVITE')return {route:launch,surface:'invite'};
 if(launch.kind==='FRIEND')return {route:home,surface:'friends',friendToken:launch.friendRef};
 if(launch.kind==='EVENT_REF')return {route:home,surface:'event',eventRef:launch.eventRef};
 if(launch.kind==='EVENT')return {route:{...launch,scope:{kind:'PERSONAL'}},surface:'event'};
 return {route:home,surface:'home'};
}
export function decodeLaunch(value:unknown):Route {return resolveLaunch(value).route;}
