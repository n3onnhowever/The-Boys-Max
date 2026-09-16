import type {Route} from '../port/contracts.ts';
/** Navigation locator only: no identity or ACL originates here. */
export function decodeLaunch(value:unknown):Route {
 if(typeof value==='string'&&/^p_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))return {kind:'PLAN',planId:value.slice(2)};
 if(typeof value==='string'&&/^i_[a-f0-9]{64}$/.test(value))return {kind:'INVITE',inviteRef:value.slice(2)};
 return {kind:'CATALOG',scope:{kind:'PERSONAL'}};
}
