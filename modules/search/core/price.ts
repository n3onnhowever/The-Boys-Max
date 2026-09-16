import {type Amount,type Basis,type Extra,type Money,type Price,type PriceQuote,type Warning} from './types.ts';
import {arr,bool,canonical,copy,currency,en,fail,freeze,id,integer,keys,minor,minorString,nullableText,obj,text} from './guard.ts';
const BASES:readonly Basis[]=['PER_PERSON','GROUP_TOTAL','UNKNOWN'];
export function parseMoney(value:unknown):Money {
 const p=obj(value,'money');keys(p,['knownness','basis','amount','currency']);
 const knownness=en(p.knownness,['KNOWN','UNKNOWN'] as const),basis=en(p.basis,BASES),cur=currency(p.currency);
 if(knownness==='UNKNOWN'){if(p.amount!==null)fail('UNKNOWN_AMOUNT_MUST_BE_NULL');return {knownness,basis,currency:cur,amount:null};}
 const a=obj(p.amount,'amount');keys(a,['kind','exact_minor','min_minor','max_minor']);const kind=en(a.kind,['FREE','EXACT','RANGE'] as const);
 if(kind==='FREE'){if([a.exact_minor,a.min_minor,a.max_minor].some(v=>v!==null))fail('FREE_AMOUNT_FIELDS');}
 if(kind==='EXACT'){minor(a.exact_minor);if(a.min_minor!==null||a.max_minor!==null)fail('EXACT_AMOUNT_FIELDS');}
 if(kind==='RANGE'){if(a.exact_minor!==null||minor(a.min_minor)>minor(a.max_minor))fail('RANGE_AMOUNT_FIELDS');}
 if(kind!=='FREE'&&cur===null)fail('PRICE_CURRENCY_REQUIRED');
 return {knownness,basis,currency:cur,amount:copy(a) as Amount};
}
export function parseWarnings(value:unknown):Warning[] {
 return arr(value,'warnings',100).map(v=>{const w=obj(v);keys(w,['code','field','message']);return {code:id(w.code),field:text(w.field,'field',128),message:text(w.message,'message',1000)};});
}
export function warning(code:string,field:string,message:string):Warning{return {code,field,message};}
export function parseQuote(value:unknown):PriceQuote {
 const q=obj(value,'quote');keys(q,['kind'],['basis','currency','exact_minor','min_minor','max_minor','raw_label','source_field','fees_known','fee_mode','fee_evidence_ref','extras','warnings']);
 const kind=en(q.kind,['UNKNOWN','FREE','EXACT','RANGE','FROM','TEXT'] as const),basis=en((Object.hasOwn(q,'basis')?q.basis:'UNKNOWN'),BASES),cur=currency(q.currency??null);
 const fees_known=Object.hasOwn(q,'fees_known')?bool(q.fees_known,'fees_known'):false;
 const fee_mode=en((Object.hasOwn(q,'fee_mode')?q.fee_mode:'UNKNOWN'),['UNKNOWN','NONE','INCLUDED','ITEMIZED'] as const);
 if(fees_known!==(fee_mode!=='UNKNOWN'))fail('FEE_COVERAGE_CONFLICT');
 const fee_evidence_ref=q.fee_evidence_ref==null?null:text(q.fee_evidence_ref,'fee_evidence_ref',256);
 if(fees_known&&!fee_evidence_ref)fail('FEE_EVIDENCE_REQUIRED');
 const fields=kind==='EXACT'?['exact_minor']:kind==='RANGE'?['min_minor','max_minor']:kind==='FROM'?['min_minor']:[];
 for(const k of ['exact_minor','min_minor','max_minor']) {if(fields.includes(k))minor(q[k]);else if(q[k]!=null)fail('IRRELEVANT_AMOUNT_FIELD',k);}
 if(kind==='RANGE'&&minor(q.min_minor)>minor(q.max_minor))fail('RANGE_ORDER');
 const extras:Extra[]=arr((Object.hasOwn(q,'extras')?q.extras:[]),'extras',30).map(v=>{const e=obj(v);keys(e,['label','required','price','source_field']);return {label:text(e.label,'label',200),required:bool(e.required),price:parseMoney(e.price),source_field:text(e.source_field,'source_field',256)};});
 if(fee_mode==='NONE'&&extras.some(e=>e.required))fail('NONE_WITH_MANDATORY_FEE');
 if(fee_mode==='ITEMIZED'&&extras.some(e=>e.required&&(e.price.knownness!=='KNOWN'||e.price.basis!==basis||e.price.currency!==cur)))fail('INCOMPARABLE_ITEMIZED_FEE');
 return {kind,basis,currency:cur,...Object.fromEntries(['exact_minor','min_minor','max_minor'].filter(k=>Object.hasOwn(q,k)).map(k=>[k,q[k]])),
  raw_label:q.raw_label==null?null:nullableText(q.raw_label,'raw_label',2000),source_field:q.source_field==null?null:text(q.source_field,'source_field',256),
  fees_known,fee_mode,fee_evidence_ref,extras,warnings:parseWarnings((Object.hasOwn(q,'warnings')?q.warnings:[]))} as PriceQuote;
}
export function unknownMoney(basis:Basis='UNKNOWN',cur:string|null=null):Money {return {knownness:'UNKNOWN',basis,currency:cur,amount:null};}
export function bounds(m:Money):[bigint,bigint]|null {
 if(m.knownness==='UNKNOWN')return null;const a=m.amount;
 return a.kind==='FREE'?[0n,0n]:a.kind==='EXACT'?[minor(a.exact_minor),minor(a.exact_minor)]:[minor(a.min_minor),minor(a.max_minor)];
}
function amountMoney(kind:'FREE'|'EXACT'|'RANGE',basis:Basis,cur:string|null,lo:bigint,hi:bigint):Money {
 return parseMoney({knownness:'KNOWN',basis,currency:cur,amount:{kind,exact_minor:kind==='EXACT'?minorString(lo):null,min_minor:kind==='RANGE'?minorString(lo):null,max_minor:kind==='RANGE'?minorString(hi):null}});
}
/** The sole financial calculator. Adapters and AI must use this function, not add extras. */
export function priceFromQuote(raw:unknown,observation_id:string,group_size_at_quote:number|null=null):Price {
 id(observation_id);if(group_size_at_quote!==null)integer(group_size_at_quote,1,1000,'group_size_at_quote');
 const q=parseQuote(raw);let base:Money=unknownMoney(q.basis,q.currency);
 if(['FREE','EXACT','RANGE'].includes(q.kind))base=amountMoney(q.kind as 'FREE'|'EXACT'|'RANGE',q.basis,q.currency,q.kind==='EXACT'?minor(q.exact_minor):q.kind==='RANGE'?minor(q.min_minor):0n,q.kind==='RANGE'?minor(q.max_minor):q.kind==='EXACT'?minor(q.exact_minor):0n);
 let total:Money=unknownMoney(q.basis,q.currency);
 if(q.fees_known&&base.knownness==='KNOWN'){
  total=copy(base);
  if(q.fee_mode==='ITEMIZED'&&q.extras.some(e=>e.required)){
   let [lo,hi]=bounds(base)!;
   for(const e of q.extras.filter(e=>e.required)){const b=bounds(e.price)!;lo+=b[0];hi+=b[1];}
   const explicitlyFree=base.amount.kind==='FREE'&&q.extras.filter(e=>e.required).every(e=>e.price.knownness==='KNOWN'&&e.price.amount.kind==='FREE');
   total=amountMoney(explicitlyFree?'FREE':lo===hi?'EXACT':'RANGE',q.basis,q.currency,lo,hi);
  }
 }
 const warnings=copy(q.warnings),add=(code:string,field:string,message:string)=>{if(!warnings.some(w=>w.code===code))warnings.push(warning(code,field,message));};
 if(base.knownness==='UNKNOWN')add(q.kind==='FROM'?'LOWER_BOUND_ONLY':'BASE_PRICE_UNKNOWN','price.base_price','Полная базовая цена не подтверждена.');
 if(!q.fees_known)add('MANDATORY_FEES_UNKNOWN','price.mandatory_fees','Обязательные доплаты не подтверждены; конкретный сбор не предполагается.');
 if(total.knownness==='UNKNOWN')add('PAYABLE_TOTAL_UNKNOWN','price.total_price','Итог к оплате неизвестен.');
 if(q.basis==='UNKNOWN')add('PRICE_BASIS_UNKNOWN','price.base_price.basis','Неизвестно, указана цена за человека или за группу.');
 return freeze({schema_version:'max.price/3-candidate',source_quote:q,quoted_amount_role:q.fee_mode==='INCLUDED'?'ALL_IN':'BASE',base_price:base,fees_known:q.fees_known,
  mandatory_fees:{mode:q.fee_mode,items:copy(q.extras),evidence_ref:q.fee_evidence_ref??null},total_price:total,warnings,provenance:{observation_id,group_size_at_quote}});
}
export function parsePrice(raw:unknown):Price {
 const p=obj(raw,'price');if(p.schema_version!=='max.price/3-candidate')fail('PRICE_WIRE_VERSION_REQUIRED');
 keys(p,['schema_version','source_quote','quoted_amount_role','base_price','fees_known','mandatory_fees','total_price','warnings','provenance']);
 const provenance=obj(p.provenance);keys(provenance,['observation_id','group_size_at_quote']);
 const expected=priceFromQuote(p.source_quote,id(provenance.observation_id),provenance.group_size_at_quote===null?null:integer(provenance.group_size_at_quote,1,1000));
 if(canonical(p)!==canonical(expected))fail('PRICE_DERIVATION_MISMATCH');return expected;
}
/** Native EVENTS v2 output, not an invented fixture projection. Version is mandatory. */
export function importEventsV2Pricing(raw:unknown,observation_id:string,group_size_at_quote:number|null=null):Price {
 const p=obj(raw);if(p.schema_version!=='price-observation/2-proposed')fail('LEGACY_PRICE_ENVELOPE_REQUIRED');
 keys(p,['schema_version','source_quote','base_price','fees_known','mandatory_fees','total_price','warnings']);
 const expected=priceFromQuote(p.source_quote,observation_id,group_size_at_quote);
 if(canonical(parseMoney(p.base_price))!==canonical(expected.base_price)||canonical(parseMoney(p.total_price))!==canonical(expected.total_price)||p.fees_known!==expected.fees_known||canonical(p.mandatory_fees)!==canonical(expected.mandatory_fees))fail('LEGACY_PRICE_DERIVATION_MISMATCH');
 const inheritedWarnings=parseWarnings(p.warnings);
 // Preserve all original warnings in source_quote; calculator deduplicates known codes.
 const quote={...copy(expected.source_quote),warnings:[...inheritedWarnings,...expected.source_quote.warnings.filter(w=>!inheritedWarnings.some(x=>canonical(x)===canonical(w)))]};
 return priceFromQuote(quote,observation_id,group_size_at_quote);
}
/** Canonical I/1 cannot prove fee completeness. No empty extras -> no-fees assumption. */
export function importCanonicalV1(raw:unknown,observation_id:string):Price {
 const p=obj(raw);keys(p,['knownness','basis','amount','currency','extras']);const knownness=en(p.knownness,['KNOWN','UNKNOWN'] as const),basis=en(p.basis,BASES);
 const amount=obj(p.amount);keys(amount,['kind','exact_minor','min_minor','max_minor']);en(amount.kind,['FREE','EXACT','RANGE'] as const);
 if(knownness==='UNKNOWN'&&(amount.kind==='FREE'||[amount.exact_minor,amount.min_minor,amount.max_minor].some(v=>v!==null)))fail('LEGACY_UNKNOWN_HAS_VALUE');
 const base=parseMoney({knownness,basis,currency:p.currency,amount:knownness==='UNKNOWN'?null:amount});
 const extras=arr(p.extras).map(v=>{const e=obj(v);keys(e,['label','required','knownness','amount','currency']);let a=e.amount;
  if(e.knownness==='UNKNOWN'){const x=obj(a);keys(x,['kind','exact_minor','min_minor','max_minor']);en(x.kind,['FREE','EXACT','RANGE'] as const);if(x.kind==='FREE'||[x.exact_minor,x.min_minor,x.max_minor].some(v=>v!==null))fail('LEGACY_UNKNOWN_HAS_VALUE');a=null;}
  return {label:text(e.label),required:bool(e.required),price:parseMoney({knownness:e.knownness,basis,currency:e.currency,amount:a}),source_field:'legacy.extras'};});
 return priceFromQuote({kind:base.knownness==='UNKNOWN'?'UNKNOWN':base.amount.kind,basis,currency:p.currency,
  ...(base.knownness==='KNOWN'?{exact_minor:base.amount.exact_minor,min_minor:base.amount.min_minor,max_minor:base.amount.max_minor}:{}),
  source_field:'canonical-I/1.amount',raw_label:null,fees_known:false,fee_mode:'UNKNOWN',fee_evidence_ref:null,extras,
  warnings:[warning('LEGACY_FEE_COVERAGE_UNPROVEN','price','Старый формат не доказывает полноту обязательных доплат.')]},observation_id);
}
