import {bridge} from './bridge.ts';
export type Session={actor:{id:string;displayName:string};csrfToken:string;absoluteExpiresAt:string;idleTtlSeconds:900};
let csrf='';
export async function api<T>(path:string,body?:unknown,key?:string):Promise<T>{
 const r=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf,...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data:unknown=await r.json();if(!r.ok){const d=data as {error?:{code?:string}};throw new Error(d.error?.code??'NETWORK_ERROR');}return data as T;
}
export async function initialize():Promise<Session>{
 // First try existing cookie, not a new exchange on every reload. Tokens never enter local/sessionStorage.
 try {const s=await api<Session>('/api/v1/session');csrf=s.csrfToken;return s;}catch{}
 const b=bridge();if(!b)throw new Error('Откройте мини-приложение в MAX. Авторизация вне MAX не подменяется.');
 const boot=await api<{csrfToken:string}>('/api/v1/session/bootstrap'),exchangeKey=crypto.randomUUID();
 const body=JSON.stringify({initData:b.initData,exchangeKey});
 // Same exchangeKey and exact body on one transport-only retry. Application errors are not retried.
 let response:Response;
 try{response=await fetch('/api/v1/session/max',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Bootstrap-CSRF':boot.csrfToken},body});}
 catch{response=await fetch('/api/v1/session/max',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Bootstrap-CSRF':boot.csrfToken},body});}
 const s=await response.json() as Session&{error?:{code:string}};if(!response.ok)throw new Error(s.error?.code??'SESSION_ERROR');csrf=s.csrfToken;return s;
}
export async function logout(){await api('/api/v1/session/logout',{});csrf='';}
