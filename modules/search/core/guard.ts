export class CoreError extends Error {
 public readonly code:string;
public readonly field:string;
constructor(  code:string,  field='payload') {super(`${code}:${field}`);this.code=code;this.field=field;this.name='CoreError';}
}
export function fail(code:string,field='payload'):never {throw new CoreError(code,field);}
export function obj(v:unknown,field='payload'):Record<string,unknown> {
 if(v===null||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v) as object|null))fail('OBJECT_REQUIRED',field);
 return v as Record<string,unknown>;
}
export function keys(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[],field='payload'):void {
 const allowed=new Set([...required,...optional]);
 if(required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!allowed.has(k)))fail('EXACT_KEYS',field);
}
export function text(v:unknown,field='text',max=4000):string {
 if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v))fail('STRING_REQUIRED',field);
 return v;
}
export function id(v:unknown,field='id'):string {const s=text(v,field,128);if(!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(s))fail('INVALID_ID',field);return s;}
export function bool(v:unknown,field='boolean'):boolean {if(typeof v!=='boolean')fail('BOOLEAN_REQUIRED',field);return v;}
export function integer(v:unknown,min:number,max:number,field='integer'):number {if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)fail('INTEGER_REQUIRED',field);return v;}
export function en<T extends string>(v:unknown,allowed:readonly T[],field='enum'):T {if(typeof v!=='string'||!allowed.includes(v as T))fail('ENUM_STRING_REQUIRED',field);return v as T;}
export function arr(v:unknown,field='array',max=100):unknown[] {if(!Array.isArray(v)||v.length>max)fail('ARRAY_REQUIRED',field);return v;}
export function stringArray(v:unknown,field='array',max=100):string[] {const a=arr(v,field,max).map(x=>text(x,field,256));if(new Set(a).size!==a.length)fail('DUPLICATE_ARRAY_ITEM',field);return a;}
export function nullableText(v:unknown,field:string,max=4000):string|null {return v===null?null:text(v,field,max);}
export function minor(v:unknown):bigint {if(typeof v!=='string'||!/^(0|[1-9][0-9]{0,17})$/.test(v))fail('MONEY_DECIMAL_STRING');return BigInt(v);}
export function minorString(n:bigint):string {const s=n.toString();minor(s);return s;}
export function currency(v:unknown):string|null {if(v===null)return null;if(typeof v!=='string'||!/^([A-Z]{3})$/.test(v))fail('CURRENCY_FORMAT');return v;}
export function canonical(v:unknown):string {
 if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
 if(typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 const o=obj(v);return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}';
}
export function freeze<T>(value:T):T {if(value!==null&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
export function copy<T>(value:T):T{return structuredClone(value);}
export function utc(v:unknown,field='instant'):number {
 const s=text(v,field,30);
 if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s))fail('UTC_INSTANT_REQUIRED',field);
 const n=Date.parse(s);if(!Number.isFinite(n)||new Date(n).toISOString()!==s.replace(/(?<!\.\d{3})Z$/,'.000Z'))fail('INVALID_INSTANT',field);return n;
}
/** This is an outbound navigation allowlist only; it never triggers a fetch. */
export function sourceLink(v:unknown,provider:'KudaGo'|'Timepad'|'ManualProvider'):string|null {
 if(v===null)return null;const s=text(v,'source_url',2048);let u:URL;try{u=new URL(s);}catch{fail('INVALID_SOURCE_URL');}
 const host=u.hostname.toLowerCase();
 const allowed=provider==='KudaGo'?host==='kudago.com':provider==='Timepad'?(host==='timepad.ru'||/^[a-z0-9-]+\.timepad\.ru$/.test(host)):false;
 if(!allowed||!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||u.hash||/[\u0000-\u0020\\]/.test(s))fail('SOURCE_URL_NOT_ALLOWED');
 // Link retained exactly for attribution. No insecure HTTP request is made by this module.
 return s;
}
