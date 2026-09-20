import type {Route} from '../port/contracts.ts';
import {decodeLaunch as context} from '../../../../packages/platform/launch.ts';
/** Resolve navigation only; campaign/referral hints do not change identity, entitlement or state. */
export function decodeLaunch(value:unknown):Route {
 const launch=context(value);
 if(launch.kind==='PLAN')return launch;
 if(launch.kind==='INVITE')return launch;
 if(launch.kind==='EVENT')return {...launch,scope:{kind:'PERSONAL'}};
 return {kind:'CATALOG',scope:{kind:'PERSONAL'}};
}
