import {type SearchIntent} from './types.ts';
import {fail,text,utc} from './guard.ts';
const DAY=86400000;
export function dateEpoch(v:unknown):number {
 const s=text(v,'date',10);if(!/^20\d{2}-\d{2}-\d{2}$/.test(s))fail('DATE_FORMAT','date');
 const n=Date.parse(s+'T00:00:00Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==s)fail('INVALID_CALENDAR_DATE','date');return n;
}
export function plusDays(s:string,n:number):string{return new Date(dateEpoch(s)+n*DAY).toISOString().slice(0,10);}
export function clock(v:unknown):number {const s=text(v,'clock',5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))fail('INVALID_CLOCK','time_window');return Number(s.slice(0,2))*60+Number(s.slice(3));}
export function validZone(v:string):boolean {
 if(!/^(UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+)$/.test(v))return false;
 try{new Intl.DateTimeFormat('en',{timeZone:v}).format(0);return true;}catch{return false;}
}
const formatters=new Map<string,Intl.DateTimeFormat>();
function localParts(ms:number,zone:string):{date:string;time:string;epoch:number} {
 let f=formatters.get(zone);if(!f){f=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});formatters.set(zone,f);}
 const p=Object.fromEntries(f.formatToParts(ms).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const date=`${p.year}-${p.month}-${p.day}`,time=`${p.hour}:${p.minute}`;return {date,time,epoch:Date.parse(`${date}T${time}:${p.second}Z`)};
}
export function localDate(now:string,zone:string):string {return localParts(utc(now),zone).date;}
/** Modern-date wall clock conversion. Gaps/folds are surfaced, never silently shifted. */
export function wallInstants(date:string,time:string,zone:string):number[] {
 if(!validZone(zone))fail('INVALID_TIMEZONE','timezone');const naive=dateEpoch(date)+clock(time)*60000;const offsets=new Set<number>();
 for(let hours=-36;hours<=36;hours+=6){const ms=naive+hours*3600000;offsets.add(localParts(ms,zone).epoch-ms);}
 return [...offsets].map(offset=>naive-offset).filter(ms=>{const p=localParts(ms,zone);return p.date===date&&p.time===time;}).sort((a,b)=>a-b);
}
export interface Interval {start:number;end:number;mode:'STARTS_WITHIN'|'FULLY_WITHIN'}
export function intervals(i:SearchIntent):Interval[] {
 if(i.date===null)return [];if(!i.timezone)fail('TIMEZONE_REQUIRED','timezone');
 const from=i.date.kind==='EXACT'?i.date.on:i.date.from,through=i.date.kind==='EXACT'?i.date.on:i.date.through;
 const count=(dateEpoch(through)-dateEpoch(from))/DAY+1;if(count<1||count>31)fail('DATE_RANGE_BOUND','date');
 const results:Interval[]=[];
 for(let d=0;d<count;d++){
  const date=plusDays(from,d),w=i.time_window;
  if(w?.mode==='UNKNOWN')fail('WINDOW_MODE_REQUIRED','time_window');
  const a=wallInstants(date,w?.start??'00:00',i.timezone),b=wallInstants(plusDays(date,w?.end_day_offset??1),w?.end??'00:00',i.timezone);
  if(a.length!==1||b.length!==1)fail('DST_GAP_OR_FOLD_CLARIFY','time_window');
  if(b[0]!<=a[0]!)fail('WINDOW_ORDER','time_window');
  results.push({start:a[0]!,end:b[0]!,mode:w?.mode??'STARTS_WITHIN'});
 }
 return results;
}
