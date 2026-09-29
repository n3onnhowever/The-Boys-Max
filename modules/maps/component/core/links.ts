/** MAPS-LINK-v1.1; adapted from supplied MAP v1 reference, preserving axes.
 * No network fetch, URL resolution, geocoder or data mutation. */
import {point, cleanText, type Point} from './geo.ts';
export type RouteMode = 'auto' | 'mt' | 'pd' | 'bc';
export type Bridge = {openLink?: (url: string) => unknown};
const BASE = 'https://yandex.ru/maps/';
const MODES = new Set(['auto', 'mt', 'pd', 'bc']);
function decimal(n: number): string {
  // URL formatting precision is NOT a statement of geographic accuracy.
  const rounded = Number(n.toFixed(6));
  return (Object.is(rounded, -0) ? 0 : rounded).toString();
}
function xy(p: Point): string { const v = point(p); return `${decimal(v.lon)},${decimal(v.lat)}`; }
function yx(p: Point): string { const v = point(p); return `${decimal(v.lat)},${decimal(v.lon)}`; }
function text(s: string, field: string, max: number): string {
  try { return cleanText(s,max); } catch { throw new TypeError(field); }
}
function url(params: Record<string, string>): string {
  const u=new URL(BASE);
  for (const [k,v] of Object.entries(params)) u.searchParams.set(k,v);
  const result=u.toString(); if(result.length>2048) throw new RangeError('URL too long');
  return result;
}
export function pointUrl(p: Point, zoom=16): string {
  if(!Number.isInteger(zoom)||zoom<1||zoom>19) throw new RangeError('Zoom');
  const c=xy(p); return url({ll:c,pt:c,z:String(zoom),l:'map'});
}
export function searchUrl(city: string, address: string): string {
  return url({text: `${text(city,'city',100)}, ${text(address,'address',300)}`});
}
export function organizationUrl(id: string): string {
  if(typeof id !== 'string'||!/^\d{1,32}$/.test(id)) throw new TypeError('Organization ID');
  // IDs come from an explicitly supplied official card, never guessed by name.
  return `${BASE}org/${id}`;
}
export function routeUrl(origin: Point, destination: Point, mode: RouteMode): string {
  if(!MODES.has(mode)) throw new TypeError('Route mode');
  return url({rtext:`${yx(origin)}~${yx(destination)}`,rtt:mode});
}
function parsePair(s:string, order:'xy'|'yx'):Point {
  if(!/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(s)) throw new TypeError('Pair');
  const parts=s.split(','); if(parts.length!==2||parts.some(x=>!x)) throw new TypeError('Pair');
  const [a,b]=parts.map(Number);return point(order==='xy'?{lon:a,lat:b}:{lat:a,lon:b});
}
export function isAllowedMapUrl(value: string): boolean {
  try {
    if(typeof value!=='string'||value.length>2048||/[\u0000-\u0020\u007f]/u.test(value)) return false;
    if(!value.startsWith(BASE)) return false;
    const u=new URL(value);
    if(u.protocol!=='https:'||u.hostname!=='yandex.ru'||u.port||u.username||u.password||u.hash) return false;
    if(/^\/maps\/org\/\d{1,32}$/.test(u.pathname)) return !u.search;
    if(u.pathname!=='/maps/')return false;
    const keys=[...u.searchParams.keys()]; if(new Set(keys).size!==keys.length) return false;
    const get=(k:string)=>u.searchParams.get(k)??'';
    if(keys.length===1&&keys[0]==='text') return !!text(get('text'),'query',402);
    if(keys.length===2&&keys.includes('rtext')&&keys.includes('rtt')) {
      const p=get('rtext').split('~'); if(p.length!==2||!MODES.has(get('rtt')))return false;
      parsePair(p[0]!,'yx');parsePair(p[1]!,'yx');return true;
    }
    if(keys.length===4&&['ll','pt','z','l'].every(k=>keys.includes(k))) {
      parsePair(get('ll'),'xy');parsePair(get('pt'),'xy');
      const z=Number(get('z'));return get('l')==='map'&&/^\d+$/.test(get('z'))&&z>=1&&z<=19;
    }
    return false;
  } catch {return false;}
}
export function requestExternalOpen(value:string, bridge?:Bridge, onAsyncFailure?:()=>void):
    'BRIDGE_REQUESTED'|'MANUAL_FALLBACK_REQUIRED'|'REJECTED' {
  if(!isAllowedMapUrl(value)) return 'REJECTED';
  if(typeof bridge?.openLink!=='function')return 'MANUAL_FALLBACK_REQUIRED';
  try {
    // Caller MUST invoke synchronously from a real click; no await before this.
    // Bridge return is not navigation/installation/success confirmation.
    const pending=bridge.openLink(value);
    if(pending && typeof (pending as PromiseLike<unknown>).then==='function') {
      Promise.resolve(pending).catch(()=>onAsyncFailure?.());
    }
    return 'BRIDGE_REQUESTED';
  } catch {return 'MANUAL_FALLBACK_REQUIRED';}
}
