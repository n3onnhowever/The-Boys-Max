import type {Route} from '../port/contracts.ts';
import {routeSchema} from '../port/schema.ts';

export function eventShareUrl(route:Extract<Route,{kind:'EVENT'}>,origin:string):string {
 const token=btoa(encodeURIComponent(JSON.stringify(route))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const url=new URL(origin);url.searchParams.set('event',token);return url.href;
}

export function eventRouteFromToken(token:string|null):Extract<Route,{kind:'EVENT'}>|null {
 if(!token||token.length>4096||!/^[A-Za-z0-9_-]+$/.test(token))return null;
 try{
  const json=decodeURIComponent(atob(token.replace(/-/g,'+').replace(/_/g,'/')));
  const route=routeSchema.parse(JSON.parse(json));return route.kind==='EVENT'?route:null;
 }catch{return null}
}
