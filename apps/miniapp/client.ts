import {launchData} from './bridge.ts';
export type Session={actor:{id:string;displayName:string};csrfToken:string;absoluteExpiresAt:string;idleTtlSeconds:900};
let csrf='';
/** A tab must not adopt another session's CSRF token and submit an old form under a new identity. */
export function assertSessionCsrf(value:string){if(!csrf||value!==csrf)throw new Error('SESSION_REPLACED');}
const options=():RequestInit=>({credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
async function data<T>(response:Response):Promise<T>{
 const body=await response.json() as T&{error?:{code?:string}};
 if(!response.ok)throw new Error(body.error?.code??'SESSION_ERROR');return body;
}
export async function api<T>(path:string,body?:unknown,key?:string):Promise<T>{
 if(!path.startsWith('/api/')||path.startsWith('//'))throw new Error('SAME_ORIGIN_REQUIRED');
 return data<T>(await fetch(path,{...options(),method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf,...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));
}
export async function savedMutation(occurrenceId:string,saved:boolean):Promise<{saved:boolean}>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(occurrenceId))throw new Error('OCCURRENCE_ID_INVALID');
 return data(await fetch('/api/v1/me/saved/'+encodeURIComponent(occurrenceId),{
  ...options(),method:saved?'PUT':'DELETE',
  headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:'{}'
 }));
}
export async function initialize(raw:string|null=launchData()):Promise<Session>{
 csrf='';
 // A fresh MAX launch must bind the cookie to its verified identity, including after account switching.
 // Only a browser reload without launch data can resume a cookie without an exchange.
 if(raw===null){const s=await api<Session>('/api/v1/session');csrf=s.csrfToken;return s;}
 const boot=await api<{csrfToken:string}>('/api/v1/session/bootstrap'),exchangeKey=crypto.randomUUID();
 const body=JSON.stringify({initData:raw,exchangeKey});
 const exchange=()=>fetch('/api/v1/session/max',{...options(),method:'POST',headers:{'Content-Type':'application/json','X-Bootstrap-CSRF':boot.csrfToken},body});
 // Retry only ambiguous transport failure, with exactly the same bootstrap, key and body.
 let response:Response;
 try{response=await exchange();}catch{response=await exchange();}
 const s=await data<Session>(response);
 // Embedded clients may reject cookies. Verify the cookie round-trip before showing private data.
 let confirmed:Session;
 try{confirmed=await api<Session>('/api/v1/session');}catch(error){
  if(error instanceof Error&&['SESSION_REQUIRED','SESSION_EXPIRED'].includes(error.message))throw new Error('SESSION_STORAGE_UNSUPPORTED');throw error;
 }
 if(confirmed.actor.id!==s.actor.id||confirmed.csrfToken!==s.csrfToken)throw new Error('SESSION_STORAGE_UNSUPPORTED');
 csrf=confirmed.csrfToken;return confirmed;
}
export async function logout(){await api('/api/v1/session/logout',{});csrf='';}
