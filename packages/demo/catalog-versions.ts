import {DEMO_ITEMS as V1_ITEMS,demoEventId as v1Id,demoSourceUrl as v1Url} from './catalog-v1.ts';
import {DEMO_ITEMS as V2_ITEMS,demoEventId as v2Id,demoSourceUrl as v2Url} from './catalog-v2.ts';
import {DEMO_ITEMS as V3_ITEMS,demoEventId as v3Id,demoSourceUrl as v3Url} from './catalog-v3.ts';

/** Older versions stay readable so existing Saves and exact Event links survive upgrades. */
const entries=[
 ...V1_ITEMS.map(item=>({eventId:v1Id(item),id:item.id,version:'v1',title:item.title,start:item.start,url:(origin:string)=>v1Url(origin,item)})),
 ...V2_ITEMS.map(item=>({eventId:v2Id(item),id:item.id,version:'v2',title:item.title,start:item.start,url:(origin:string)=>v2Url(origin,item)})),
 ...V3_ITEMS.map(item=>({eventId:v3Id(item),id:item.id,version:'v3',title:item.title,start:item.start,url:(origin:string)=>v3Url(origin,item)})),
];
export const knownDemoEventIds=entries.map(entry=>entry.eventId);
export const currentDemoEventIds=V3_ITEMS.map(v3Id);
export function demoByEventId(eventId:string){return entries.find(entry=>entry.eventId===eventId);}
export function demoBySourcePath(id:string,version:'legacy'|'v3'){
 return entries.find(entry=>entry.id===id&&(version==='v3'?entry.version==='v3':entry.version==='v1'||entry.version==='v2'));
}
