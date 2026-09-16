import type {Admission,AiProvider,ModelConfig,ModelsSnapshot,Observation,ParseContext,Usage} from './types.ts';
import {modelConfig} from './config.ts';
import {admissionErrors,catalogErrors} from './admission.ts';
import {prepareMessages,redact} from './prompt.ts';
import {schema,strictJson,validateCandidate} from './validation.ts';
export type FetchLike = (url:string,init:RequestInit)=>Promise<Response>;
export type WireMode='prompt_only'|'native_schema';
const emptyUsage=():Usage=>({input_tokens:null,output_tokens:null,total_tokens:null,reasoning_tokens:null,cached_input_tokens:null});
const asRecord=(x:unknown):Record<string,unknown>|null=>x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:null;
const numberOrNull=(n:unknown):number|null=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?n:null;
export function extractUsage(raw:unknown):Usage {
  const o=asRecord(raw);if(!o)return emptyUsage();const details=asRecord(o.completion_tokens_details),cache=asRecord(o.prompt_tokens_details);
  return {input_tokens:numberOrNull(o.prompt_tokens),output_tokens:numberOrNull(o.completion_tokens),total_tokens:numberOrNull(o.total_tokens),reasoning_tokens:numberOrNull(details?.reasoning_tokens),cached_input_tokens:numberOrNull(cache?.cached_tokens??o.precached_prompt_tokens)};
}
export function requestBody(c:ModelConfig,text:string,context:ParseContext,mode:WireMode,secrets:readonly string[]=[]):Record<string,unknown> {
  if(mode!=='prompt_only'&&mode!=='native_schema')throw new Error('WIRE_MODE');
  const body:Record<string,unknown>={model:c.model,messages:prepareMessages(text,context,secrets),...c.request_parameters};
  if(mode==='native_schema'){
    // Provider support for this FULL schema remains a separate live smoke test, never assumed.
    const wireSchema=structuredClone(schema) as Record<string,unknown>;delete wireSchema.$id;delete wireSchema.$schema;
    body.response_format=c.provider==='gigachat'?{type:'json_schema',schema:wireSchema,strict:true}:{type:'json_schema',json_schema:{name:'max_ai_candidate_v3',schema:wireSchema,strict:true}};
  }
  return body;
}
export function retryAfterMs(header:string|null,now=Date.now()):number|null {
  if(header===null)return null;const value=header.trim();
  const ms=/^\d+(?:\.\d+)?$/.test(value)?Number(value)*1000:Date.parse(value)-now;
  return Number.isFinite(ms)&&ms>=0?Math.min(86400000,Math.ceil(ms)):null;
}
class WireError extends Error {readonly code:string;
readonly httpStatus:number|null;
readonly retryAfter:number|null;
constructor( code:string, httpStatus:number|null=null, retryAfter:number|null=null){super(code);this.code=code;this.httpStatus=httpStatus;this.retryAfter=retryAfter;}}
/** One request including body read. No redirects, TLS bypass, retries, OAuth refresh or fallback.
 * No credential/body/header values appear in an error. */
async function wire(url:string,credential:string,body:Record<string,unknown>|null,fetcher:FetchLike,timeoutMs:number,maxBytes:number):Promise<{data:unknown;status:number}> {
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  const operation=async()=>{
    const response=await fetcher(url,{method:body===null?'GET':'POST',redirect:'error',signal:controller.signal,
      headers:{Authorization:'Bearer '+credential,Accept:'application/json',...(body===null?{}:{'Content-Type':'application/json'})},...(body===null?{}:{body:JSON.stringify(body)})});
    if(response.status===429){void response.body?.cancel().catch(()=>{});throw new WireError('RATE_LIMITED',429,retryAfterMs(response.headers.get('retry-after')));}
    if(response.status===401||response.status===403){void response.body?.cancel().catch(()=>{});throw new WireError('AUTH_FAILED',response.status);}
    if(!response.ok){void response.body?.cancel().catch(()=>{});throw new WireError('HTTP_ERROR',response.status);}
    const ct=response.headers.get('content-type')??'';
    if(!/^application\/(?:[a-z0-9.+-]*\+)?json(?:;|$)/i.test(ct)){void response.body?.cancel().catch(()=>{});throw new WireError('INVALID_RESPONSE',response.status);}
    const length=response.headers.get('content-length');if(length&&/^\d+$/.test(length)&&Number(length)>maxBytes){void response.body?.cancel().catch(()=>{});throw new WireError('INVALID_RESPONSE',response.status);}
    if(!response.body)throw new WireError('INVALID_RESPONSE',response.status);
    const reader=response.body.getReader();let size=0,txt='';const decoder=new TextDecoder('utf-8',{fatal:true});
    try {while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>maxBytes)throw new WireError('INVALID_RESPONSE',response.status);txt+=decoder.decode(part.value,{stream:true});}txt+=decoder.decode();}
    finally {void reader.cancel().catch(()=>{});reader.releaseLock();}
    let data:unknown;try{data=strictJson(txt,maxBytes);}catch{throw new WireError('INVALID_RESPONSE',response.status);}
    return {data,status:response.status};
  };
  try {return await Promise.race([operation(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new WireError('TIMEOUT'));},timeoutMs);})]);}
  catch(error){if(error instanceof WireError)throw error;throw new WireError('NETWORK_ERROR');}
  finally {if(timer)clearTimeout(timer);controller.abort();}
}
export type ProviderOptions={model_id:string;admission?:Admission;catalog?:ModelsSnapshot;credential?:string;mode?:WireMode;timeout_ms?:number;fetcher?:FetchLike;retain_synthetic_content?:boolean};
export function createProvider(options:ProviderOptions):AiProvider {
  const config=modelConfig(options.model_id),timeout=options.timeout_ms??20000;
  if(!Number.isInteger(timeout)||timeout<1||timeout>60000)throw new Error('TIMEOUT_CONFIG');
  const fetcher=options.fetcher??((url,init)=>fetch(url,init));
  return {async parse(text:string,context:ParseContext):Promise<Observation>{
    const start=performance.now();const out:Observation={status:'BLOCKED',provider:config.provider,requested_model:config.model,reported_model:null,checkpoint_identity:'NOT_VERIFIED',elapsed_ms:0,time_to_usable_candidate_ms:null,ttft_ms:null,http_status:null,retry_after_ms:null,attempts:0,repair_attempts:0,usage:emptyUsage(),cost_amount:null,cost_currency:null,billing_verification:'NOT_OBSERVED',validation:null,unexpected_tool_calls:null,errors:[]};
    const finish=()=>{out.elapsed_ms=Math.round((performance.now()-start)*1000)/1000;if(out.status==='OK')out.time_to_usable_candidate_ms=out.elapsed_ms;return out;};
    out.errors=[...admissionErrors(options.admission,config,options.credential),...catalogErrors(options.catalog,config)];
    if(out.errors.length)return finish();
    let body:Record<string,unknown>,snapshot:ParseContext;
    try {snapshot=structuredClone(context);body=requestBody(config,text,snapshot,options.mode??'prompt_only',[options.credential!]);}catch{out.errors=['INPUT_OR_CONTEXT_REJECTED'];return finish();}
    out.attempts=1;
    try{
      const r=await wire(config.endpoint,options.credential!,body,fetcher,timeout,262144);out.http_status=r.status;
      const root=asRecord(r.data);if(!root)throw new WireError('INVALID_RESPONSE',r.status);out.usage=extractUsage(root.usage);
      out.reported_model=typeof root.model==='string'?root.model:null;
      if(!out.reported_model||out.reported_model.length>200)throw new WireError('INVALID_RESPONSE',r.status);
      if(options.admission!.expected_reported_model!==null&&options.admission!.expected_reported_model!==out.reported_model)throw new WireError('MODEL_MISMATCH',r.status);
      const choices=Array.isArray(root.choices)?root.choices:null,choice=choices?.length===1?asRecord(choices[0]):null,message=asRecord(choice?.message);
      if(!choice||!message)throw new WireError('INVALID_RESPONSE',r.status);
      if(['blacklist','content_filter','refusal'].includes(choice.finish_reason as string)||message.refusal)throw new WireError('REFUSED',r.status);
      if(choice.finish_reason==='length')throw new WireError('TRUNCATED',r.status);
      out.unexpected_tool_calls=Object.hasOwn(message,'function_call')&&message.function_call!==null||Object.hasOwn(message,'tool_calls')&&message.tool_calls!==null&&!(Array.isArray(message.tool_calls)&&message.tool_calls.length===0);
      if(out.unexpected_tool_calls||choice.finish_reason==='tool_calls'||choice.finish_reason==='function_call')throw new WireError('TOOL_ERROR',r.status);
      if(choice.finish_reason!=='stop'||typeof message.content!=='string')throw new WireError('INVALID_RESPONSE',r.status);
      if(options.retain_synthetic_content)out.raw_content=redact(message.content,[options.credential!]);
      let value:unknown;try {value=strictJson(message.content);}catch {throw new WireError('INVALID_JSON',r.status);}
      out.validation=validateCandidate(value,snapshot);
      if(!out.validation.schema_ok)throw new WireError('INVALID_SCHEMA',r.status);
      if(!out.validation.semantic_ok)throw new WireError('INVALID_SEMANTICS',r.status);
      out.candidate=out.validation.candidate;out.status='OK';
    }catch(error){const e=error instanceof WireError?error:new WireError('INVALID_RESPONSE');out.status=e.code as Observation['status'];out.http_status=e.httpStatus??out.http_status;out.retry_after_ms=e.retryAfter;out.errors=[e.code,...(out.validation?.errors??[])];}
    // Reported model string is untrusted provider metadata; redact before retaining it.
    if(out.reported_model)out.reported_model=redact(out.reported_model,[options.credential!]);
    return finish();
  }};
}
export async function probeModels(options:Omit<ProviderOptions,'catalog'>):Promise<{status:string;model_ids:string[];fetched_at:string;errors:string[]}> {
  const c=modelConfig(options.model_id),errors=admissionErrors(options.admission,c,options.credential);
  if(errors.length)return {status:'BLOCKED',model_ids:[],fetched_at:new Date().toISOString(),errors};
  const timeout=options.timeout_ms??20000;if(!Number.isInteger(timeout)||timeout<1||timeout>60000)throw new Error('TIMEOUT_CONFIG');
  try{const {data}=await wire(c.models_endpoint,options.credential!,null,options.fetcher??((url,init)=>fetch(url,init)),timeout,262144);
    const root=asRecord(data),rows=root?.data;if(!Array.isArray(rows))throw new Error('CATALOG_SHAPE');
    const ids=rows.map(x=>asRecord(x)?.id);if(!ids.every(x=>typeof x==='string'&&x.length>0&&x.length<=200))throw new Error('CATALOG_SHAPE');
    if(ids.some(x=>redact(x as string,[options.credential!])!==x))throw new Error('CATALOG_UNSAFE');
    return {status:'OK',model_ids:[...new Set(ids as string[])].sort(),fetched_at:new Date().toISOString(),errors:[]};
  }catch(error){return {status:error instanceof WireError?error.code:'INVALID_RESPONSE',model_ids:[],fetched_at:new Date().toISOString(),errors:[error instanceof WireError?error.code:'CATALOG_SHAPE']};}
}
