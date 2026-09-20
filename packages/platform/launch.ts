/** Public locators and attribution hints only. Every object read still needs session + ACL. */
export type Launch={kind:'PERSONAL'}|{kind:'PLAN';planId:string}|{kind:'INVITE';inviteRef:string}
 |{kind:'EVENT';sourceId:string;externalEventId:string;occurrenceId:string}
 |{kind:'CAMPAIGN'|'REFERRAL';code:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validStartParam(value:unknown):value is string{return typeof value==='string'&&/^[A-Za-z0-9_-]{1,512}$/.test(value);}
const identifier=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=160&&!/[\u0000-\u001f\u007f]/.test(v);
const encode=(v:unknown)=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(v)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export function launchParam(route:Launch):string{
 let value:string;
 if(route.kind==='PERSONAL')value='catalog';
 else if(route.kind==='PLAN'&&uuid.test(route.planId))value='p_'+route.planId;
 else if(route.kind==='INVITE'&&/^[a-f0-9]{64}$/.test(route.inviteRef))value='i_'+route.inviteRef;
 else if(route.kind==='EVENT'&&[route.sourceId,route.externalEventId,route.occurrenceId].every(identifier))value='e_'+encode([route.sourceId,route.externalEventId,route.occurrenceId]);
 else if((route.kind==='CAMPAIGN'||route.kind==='REFERRAL')&&/^[A-Za-z0-9_-]{1,100}$/.test(route.code))value=(route.kind==='CAMPAIGN'?'c_':'r_')+route.code;
 else throw new Error('LAUNCH_LOCATOR');
 if(!validStartParam(value))throw new Error('LAUNCH_PAYLOAD_LIMIT');return value;
}
export function decodeLaunch(raw:unknown):Launch{
 if(!validStartParam(raw))return {kind:'PERSONAL'};
 if(raw.startsWith('p_')&&uuid.test(raw.slice(2)))return {kind:'PLAN',planId:raw.slice(2)};
 if(/^i_[a-f0-9]{64}$/.test(raw))return {kind:'INVITE',inviteRef:raw.slice(2)};
 if(/^[cr]_[A-Za-z0-9_-]{1,100}$/.test(raw))return {kind:raw[0]==='c'?'CAMPAIGN':'REFERRAL',code:raw.slice(2)};
 if(raw.startsWith('e_'))try{
  const encoded=raw.slice(2).replaceAll('-','+').replaceAll('_','/');
  const decoded=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)));
  const value:unknown=JSON.parse(decoded);
  if(Array.isArray(value)&&value.length===3&&value.every(identifier)&&'e_'+encode(value)===raw)
   return {kind:'EVENT',sourceId:value[0]!,externalEventId:value[1]!,occurrenceId:value[2]!};
 }catch{/* Invalid locators return to personal home; they never become commands. */}
 return {kind:'PERSONAL'};
}
