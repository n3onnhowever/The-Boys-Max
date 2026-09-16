import type {Admission, ModelConfig, ModelsSnapshot} from './types.ts';
export const GATES = ['account','geography','zero_budget','data_handling','end_user_terms','case_009'] as const;
/** Admission is trusted operator configuration, NOT a browser/LLM object or a legal conclusion.
 * Module callers must obtain it through server 23; eval runner additionally binds its SHA-256. */
export function admissionErrors(a:Admission|undefined,c:ModelConfig,credential:string|undefined,now=Date.now()):string[] {
  if(!a)return ['ADMISSION_MISSING'];const errors:string[]=[];
  if(a.schema_version!=='max.ai.admission.v1'||a.enabled!==true||a.purpose!=='SYNTHETIC_EVAL')errors.push('ADMISSION_DISABLED');
  if(typeof a.quota_group!=='string'||! /^(?:[a-zA-Z0-9_-]){1,80}$/.test(a.quota_group))errors.push('QUOTA_GROUP_MISSING');
  if(a.provider!==c.provider||a.model!==c.model)errors.push('ADMISSION_MODEL_MISMATCH');
  if(typeof a.approved_by!=='string'||!a.approved_by.trim()||!Array.isArray(a.evidence_refs)||a.evidence_refs.length===0||a.evidence_refs.some(s=>typeof s!=='string'||!s.trim()))errors.push('ADMISSION_EVIDENCE');
  const expiry=typeof a.valid_until==='string'?Date.parse(a.valid_until):NaN;if(!Number.isFinite(expiry)||expiry<=now)errors.push('ADMISSION_EXPIRED');
  for(const g of GATES)if(a.gates?.[g]!=='PASS')errors.push('GATE_'+g.toUpperCase());
  if(a.no_paid_overage!==true)errors.push('PAID_OVERAGE_NOT_DISABLED');
  for(const key of ['remaining_calls','remaining_total_tokens','request_interval_ms','max_reserved_tokens_per_call'] as const){
    const n=a[key];if(typeof n!=='number'||!Number.isSafeInteger(n)||n<=0)errors.push('QUOTA_'+key.toUpperCase());
  }
  if(a.expected_reported_model!==null&&(typeof a.expected_reported_model!=='string'||!a.expected_reported_model))errors.push('EXPECTED_MODEL_TYPE');
  if(typeof credential!=='string'||credential.length<8||credential.length>8192||/[\r\n\x00-\x20]/.test(credential))errors.push('CREDENTIAL_MISSING_OR_INVALID');
  return errors;
}
export function catalogErrors(s:ModelsSnapshot|undefined,c:ModelConfig,now=Date.now()):string[] {
  if(!s)return ['CATALOG_NOT_RUN'];const age=typeof s.fetched_at==='string'?now-Date.parse(s.fetched_at):NaN;
  if(s.source!=='AUTHORIZED_MODELS_GET'||s.provider!==c.provider||s.requested_model!==c.model)return ['CATALOG_BINDING'];
  if(!Number.isFinite(age)||age<0||age>86400000)return ['CATALOG_STALE'];
  if(!Array.isArray(s.model_ids)||!s.model_ids.every(x=>typeof x==='string')||!s.model_ids.includes(c.model))return ['EXACT_MODEL_NOT_IN_CATALOG'];
  return [];
}
/** Local single-process benchmark reservations, not the application's governor or a queue.
 * The CLI persists reservations before each call; never refunds an unknown remote outcome. */
export function reserve(current:{calls:number;tokens:number},limits:{calls:number;tokens:number},tokens:number):{calls:number;tokens:number} {
  if(![current.calls,current.tokens,limits.calls,limits.tokens,tokens].every(n=>Number.isSafeInteger(n)&&n>=0)||tokens===0)throw new Error('RESERVATION_TYPE');
  if(current.calls+1>limits.calls||current.tokens+tokens>limits.tokens)throw new Error('BUDGET_EXHAUSTED');
  return {calls:current.calls+1,tokens:current.tokens+tokens};
}
