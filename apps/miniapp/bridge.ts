import {validStartParam} from '../../packages/platform/launch.ts';
export {validStartParam} from '../../packages/platform/launch.ts';
export interface MaxBridge {
 initData?:string;
 /** Untrusted presentation/context only. Never read for identity or permission. */
 initDataUnsafe?:unknown;
 platform?:string;version?:string;deviceName?:string;
 getLaunchContext?:()=>Promise<{entryPoint:'tabbar'|'default'}>;
 getViewportSize?:()=>Promise<{height:string;width:string}>;
 BackButton?:{show?:()=>void;hide?:()=>void;onClick?:(fn:()=>void)=>void;offClick?:(fn:()=>void)=>void};
 openLink?:(url:string)=>unknown;openMaxLink?:(url:string)=>unknown;
 shareContent?:(params:{text:string;link:string})=>unknown;
 shareMaxContent?:(params:{text:string;link:string})=>unknown;
}
declare global {interface Window {WebApp?:MaxBridge}}
export function bridge():MaxBridge|null {
 if(typeof window==='undefined')return null;
 const value=window.WebApp;
 return value&&typeof value==='object'?value:null;
}
const method=(value:unknown)=>typeof value==='function';
function atLeast(version:unknown,minimum:readonly number[]):boolean {
 if(typeof version!=='string'||!/^\d{2}\.\d{1,6}\.\d{1,6}$/.test(version))return false;
 const parts=version.split('.').map(Number);
 for(let i=0;i<3;i++){if(parts[i]!>minimum[i]!)return true;if(parts[i]!<minimum[i]!)return false;}
 return true;
}
/** Capability hints are never authentication evidence; even a CDN-created WebApp can exist outside MAX. */
export function capabilities(b:MaxBridge|null=bridge()){
 const platform=b?.platform;
 const launched=typeof b?.initData==='string'&&b.initData.length>0;
 const host=launched&&['web','android','ios','desktop'].includes(platform??'');
 const mobile=host&&(platform==='android'||platform==='ios');
 return {
  platform:host?platform!:'external',
  version:typeof b?.version==='string'?b.version:null,
  hasInitData:launched,
  openLink:host&&method(b?.openLink),openMaxLink:host&&method(b?.openMaxLink),
  shareMaxContent:host&&method(b?.shareMaxContent),
  shareContent:mobile&&method(b?.shareContent),
  getLaunchContext:mobile&&method(b?.getLaunchContext)&&atLeast(b?.version,platform==='android'?[26,19,2]:[26,20,0]),
  getViewportSize:host&&method(b?.getViewportSize),
  back:host&&[b?.BackButton?.show,b?.BackButton?.hide,b?.BackButton?.onClick,b?.BackButton?.offClick].every(method)
 };
}
function parameters(raw:string):Map<string,string>{
 const result=new Map<string,string>();
 if(!raw)return result;
 for(const field of raw.split('&')){
  const index=field.indexOf('=');if(index<1)throw new Error('LAUNCH_FORMAT');
  let key:string,value:string;
  try{key=decodeURIComponent(field.slice(0,index).replace(/\+/g,' '));value=decodeURIComponent(field.slice(index+1).replace(/\+/g,' '));}
  catch{throw new Error('LAUNCH_ENCODING');}
  if(result.has(key))throw new Error('LAUNCH_DUPLICATE');
  result.set(key,value);
 }
 return result;
}
/** Read the official signed string; reject ambiguous outer WebAppData before sending it to the server. */
export function launchData(b:MaxBridge|null=bridge(),hash=typeof window==='undefined'?'':window.location.hash):string|null {
 if(hash.length>262144)throw new Error('LAUNCH_SIZE');
 const fields=hash.includes('=')?parameters(hash.replace(/^#/,'')):new Map<string,string>();
 const fromHash=fields.get('WebAppData');
 const fromBridge=typeof b?.initData==='string'&&b.initData.length?b.initData:undefined;
 if(fromHash!==undefined&&!fromHash)throw new Error('LAUNCH_EMPTY');
 if(fromHash&&fromBridge&&fromHash!==fromBridge)throw new Error('LAUNCH_CONFLICT');
 const raw=fromHash??fromBridge;
 if(raw&&new TextEncoder().encode(raw).length>65536)throw new Error('LAUNCH_SIZE');
 return raw??null;
}
/** Context only, including when signed: never carries actor, role, membership, or permission. */
export function startParam(raw:string|null,search:string):string|null {
 try{
  const signed=raw?parameters(raw).get('start_param'):undefined;
  if(signed!==undefined)return signed===''||validStartParam(signed)?signed:null;
  const params=new URLSearchParams(search),values=['WebAppStartParam','startapp','launch'].flatMap(key=>params.getAll(key));
  return values.length===1&&(values[0]===''||validStartParam(values[0]))?values[0]:null;
 }catch{return null;}
}
export function hasSignedStartParam(raw:string|null):boolean {
 if(!raw)return false;
 try{return parameters(raw).has('start_param')}catch{return true;}
}
async function bounded(call:()=>unknown,timeoutMs=1500):Promise<unknown>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve(call()),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('BRIDGE_TIMEOUT')),timeoutMs);})]);}
 finally{clearTimeout(timer);}
}
export async function launchContext(timeoutMs=1500):Promise<{entryPoint:'tabbar'|'default'}|null>{
 const b=bridge();if(!capabilities(b).getLaunchContext)return null;
 try{const value=await bounded(()=>b!.getLaunchContext!(),timeoutMs) as {entryPoint?:unknown}|null;
  return value&&(value.entryPoint==='tabbar'||value.entryPoint==='default')?{entryPoint:value.entryPoint}:null;
 }catch{return null;}
}
export async function viewportSize(timeoutMs=1500):Promise<{height:number;width:number}|null>{
 const b=bridge();if(!capabilities(b).getViewportSize)return null;
 try{
  const value=await bounded(()=>b!.getViewportSize!(),timeoutMs) as {height?:unknown;width?:unknown}|null;
  const dimension=(v:unknown)=>typeof v==='string'&&/^\d{1,5}(?:\.\d+)?(?:px)?$/.test(v)?Number.parseFloat(v):NaN;
  const height=dimension(value?.height),width=dimension(value?.width);
  return height>0&&height<=20000&&width>0&&width<=20000?{height,width}:null;
 }catch{return null;}
}
export function attachBack(back:()=>void){
 const app=bridge(),b=app?.BackButton;if(!capabilities(app).back||!b)return ()=>{};
 try{b.onClick!(back);b.show!();}catch{try{b.offClick!(back);b.hide!();}catch{}return ()=>{};}
 return ()=>{try{b.offClick!(back);b.hide!();}catch{/* Browser/history controls remain available. */}};
}
function safeLink(link:string):URL|null{
 try{const url=new URL(link);return url.protocol==='https:'&&!url.username&&!url.password?url:null;}catch{return null;}
}
export type BridgeResult='INVOKED'|'UNSUPPORTED'|'FAILED'|'INVALID';
const nativeError=(value:unknown)=>value===false||(typeof value==='object'&&value!==null&&'error' in value&&Boolean(value.error));
/** Call directly from the user click; no await precedes the native invocation. */
export async function openLink(link:string):Promise<BridgeResult>{
 const url=safeLink(link);if(!url)return 'INVALID';
 const b=bridge(),c=capabilities(b),inside=url.origin==='https://max.ru';
 const fn=inside&&c.openMaxLink?b?.openMaxLink:c.openLink?b?.openLink:undefined;
 if(!fn)return 'UNSUPPORTED';
 try{return nativeError(await bounded(()=>fn.call(b,url.href)))?'FAILED':'INVOKED';}catch{return 'FAILED';}
}
export async function share(text:string,link:string):Promise<BridgeResult>{
 if(!safeLink(link)||!text||text.length>4000)return 'INVALID';
 const b=bridge();if(!capabilities(b).shareMaxContent)return 'UNSUPPORTED';
 try{return nativeError(await bounded(()=>b!.shareMaxContent!({text,link})))?'FAILED':'INVOKED';}catch{return 'FAILED';}
}
// No fabricated WebApp, ready(), theme event, or authentication fallback.
