import type {Field,ParseContext,SearchIntent,Validation} from './types.ts';
import {emptyIntent,manualCandidate} from './validation.ts';
export type ManualValues={city_id:string;date_kind:''|'EXACT'|'RANGE';date_from:string;date_through:string;start:string;end:string;next_day:boolean;time_mode:'STARTS_WITHIN'|'FULLY_WITHIN'|'UNKNOWN';timezone:string;included:SearchIntent['included_categories'];excluded:SearchIntent['excluded_categories'];party_size:string;budget_rub:string;budget_basis:'PER_PERSON'|'GROUP_TOTAL'|'UNKNOWN';indoor:''|'true'|'false';wheelchair:''|'true'|'false';available:''|'true'|'false'};
export const MANUAL_DEFAULTS:ManualValues={city_id:'',date_kind:'',date_from:'',date_through:'',start:'',end:'',next_day:false,time_mode:'UNKNOWN',timezone:'',included:[],excluded:[],party_size:'',budget_rub:'',budget_basis:'UNKNOWN',indoor:'',wheelchair:'',available:''};
export const FIELD_LABELS:Record<Field,string>={city:'Город',date:'Дата или диапазон дат',time_window:'Время и правило окна',timezone:'Часовой пояс',excluded_categories:'Исключить категории',included_categories:'Категории',party_size:'Число желающих (состав плана не меняется)',budget:'Бюджет и база цены',indoor:'В помещении',wheelchair_required:'Доступность для коляски',require_available:'Проверять наличие билетов отдельно'};
export function rublesToMinor(x:string):string {
  if(typeof x!=='string'||! /^(?:0|[1-9]\d{0,9})(?:[.,]\d{1,2})?$/.test(x))throw new Error('FORM_BUDGET_FORMAT');
  const [whole,fraction='']=x.replace(',','.').split('.');
  return (BigInt(whole!)*100n+BigInt(fraction.padEnd(2,'0'))).toString();
}
export function fromManualForm(values:ManualValues,context:ParseContext):Validation {
  try{
    if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).length!==Object.keys(MANUAL_DEFAULTS).length||Object.keys(values).some(k=>!Object.hasOwn(MANUAL_DEFAULTS,k)))throw new Error('FORM_FIELDS');
    for(const key of Object.keys(MANUAL_DEFAULTS) as (keyof ManualValues)[]){
      if(key==='included'||key==='excluded'){if(!Array.isArray(values[key]))throw new Error('FORM_CATEGORY_TYPE');}
      else if(key==='next_day'){if(typeof values[key]!=='boolean')throw new Error('FORM_NEXT_DAY_TYPE');}
      else if(typeof values[key]!=='string')throw new Error('FORM_VALUE_TYPE');
    }
    const x=emptyIntent();
    if(values.city_id){const city=context.cities.find(c=>c.id===values.city_id);if(!city)throw new Error('FORM_CITY');x.city={id:city.id,label:city.label};}
    if(values.date_kind==='EXACT')x.date={kind:'EXACT',on:values.date_from};
    else if(values.date_kind==='RANGE')x.date={kind:'RANGE',from:values.date_from,through:values.date_through};
    else if(values.date_kind!==''||values.date_from||values.date_through)throw new Error('FORM_DATE_KIND');
    if(values.start||values.end)x.time_window={start:values.start,end:values.end,end_day_offset:values.next_day?1:0,mode:values.time_mode};
    else if(values.next_day||values.time_mode!=='UNKNOWN')throw new Error('FORM_WINDOW_INCOMPLETE');
    x.timezone=values.timezone||null;x.included_categories=values.included;x.excluded_categories=values.excluded;
    if(values.party_size){if(!/^(?:[1-9]\d?|100)$/.test(values.party_size))throw new Error('FORM_PARTY_SIZE');x.party_size=Number(values.party_size);}
    if(values.budget_rub)x.budget={max_minor:rublesToMinor(values.budget_rub),currency:'RUB',basis:values.budget_basis};
    else if(values.budget_basis!=='UNKNOWN')throw new Error('FORM_BUDGET_INCOMPLETE');
    const bool=(v:string)=>{if(v==='')return null;if(v==='true')return true;if(v==='false')return false;throw new Error('FORM_BOOL');};
    x.indoor=bool(values.indoor);x.wheelchair_required=bool(values.wheelchair);x.require_available=bool(values.available);
    return manualCandidate(x,context);
  }catch(e){return {schema_ok:false,semantic_ok:null,errors:[e instanceof Error?e.message:'FORM_INVALID']};}
}
