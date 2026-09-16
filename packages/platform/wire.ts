import {requireThat} from '../domain/errors.ts';
// This scanner only enforces JSON depth/decoded duplicate keys. Native JSON.parse remains the grammar parser.
// Number values are wrapped from the native reviver source lexeme, never recovered from a rounded Number.
export class NumericLexeme {readonly raw:string; constructor(raw:string){this.raw=raw;} }
export function strictJson(text:string,lossless=false):unknown {
 requireThat(Buffer.byteLength(text)<=1048576,'BODY_TOO_LARGE',413);
 const tokens=text.match(/"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[\da-fA-F]{4}))*"|[{}\[\]:,]|[^\s{}\[\]:,]+/g)??[];
 const stack:{object:boolean;keys:Set<string>;expectKey:boolean}[]=[];
 for(const token of tokens){
  if(token==='{'||token==='['){stack.push({object:token==='{',keys:new Set(),expectKey:token==='{'});requireThat(stack.length<=32,'JSON_DEPTH');}
  else if(token==='}'||token===']')stack.pop();
  else {const top=stack.at(-1);if(top?.object&&top.expectKey&&token.startsWith('"')){
    const key:unknown=JSON.parse(token);requireThat(typeof key==='string','JSON_KEY');
    requireThat(!['__proto__','prototype','constructor'].includes(key)&&!top.keys.has(key),'JSON_DUPLICATE_OR_UNSAFE_KEY');top.keys.add(key);top.expectKey=false;
   }else if(top?.object&&token===',')top.expectKey=true;
  }
 }
 try {
  // context.source is standard JSON.parse source-text access. Fail closed on a runtime without it.
  return JSON.parse(text,(key:string,value:unknown,context?:{source?:string})=>{
   if(typeof value==='number'&&lossless){requireThat(typeof context?.source==='string','RUNTIME_JSON_SOURCE_REQUIRED',503);return new NumericLexeme(context.source);}
   if(typeof value==='number')requireThat(Number.isFinite(value)&&(!Number.isInteger(value)||Number.isSafeInteger(value)),'UNSAFE_NUMBER');
   return value;
  });
 }catch(err){if(err instanceof SyntaxError)requireThat(false,'JSON_SYNTAX');throw err;}
}
export function obj(v:unknown):Record<string,unknown>{requireThat(v!==null&&typeof v==='object'&&!Array.isArray(v)&&!(v instanceof NumericLexeme),'OBJECT_REQUIRED');return v as Record<string,unknown>;}
export function int64(v:unknown,positive=false):string {
 requireThat(v instanceof NumericLexeme && /^-?(0|[1-9]\d*)$/.test(v.raw),'INT64_TOKEN_REQUIRED');
 const n=BigInt(v.raw);requireThat(n>=-9223372036854775808n&&n<=9223372036854775807n&&(!positive||n>0n),'INT64_RANGE');return n.toString();
}
export function boundedText(v:unknown,max=160):string{requireThat(typeof v==='string'&&v.length>0&&v.length<=max,'STRING_REQUIRED');return v;}
export function fatalUtf8(bytes:Uint8Array):string{try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{requireThat(false,'INVALID_UTF8');}}
