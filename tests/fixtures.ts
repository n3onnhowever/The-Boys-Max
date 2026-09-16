import {priceFromQuote} from '../modules/search/core/price.ts';
import {createHmac} from 'node:crypto';
import type {Terms,Slot} from '../packages/contracts/domain.ts';
export const O='10000000-0000-4000-8000-000000000001',A='10000000-0000-4000-8000-000000000002',B='10000000-0000-4000-8000-000000000003',P='20000000-0000-4000-8000-000000000001',SID='30000000-0000-4000-8000-000000000001',OID='40000000-0000-4000-8000-000000000001';
export const NOW='2026-09-16T10:00:00.000Z',DEC='2026-09-17T10:00:00.000Z',COM='2026-09-18T10:00:00.000Z';
export const terms:Terms={title:'Синтетическая встреча',activityIdentity:'owned-test',startsAt:'2026-09-20T15:30:00.000Z',endsAt:'2026-09-20T17:00:00.000Z',timeZone:'Europe/Moscow',place:'Тестовый адрес; не афиша',participationUrl:null,obligations:'',price:priceFromQuote({kind:'FREE',basis:'PER_PERSON',currency:'RUB',fees_known:true,fee_mode:'NONE',fee_evidence_ref:'owned-synthetic-fixture'},'test-free'),warnings:['SYNTHETIC_TEST_DATA']};
export const self:Slot={slotId:SID,label:'O',required:true,actorId:O,state:'ACTIVE'};
export function sign(token:string,userJson:string,nowSeconds:number,extra:Record<string,string>={}){
 const fields={auth_date:String(nowSeconds),user:userJson,query_id:'test-query',...extra};
 const canonical=Object.entries(fields).sort(([a],[b])=>a<b?-1:1).map(([k,v])=>k+'='+v).join('\n');
 const secret=createHmac('sha256','WebAppData').update(token).digest();const hash=createHmac('sha256',secret).update(canonical).digest('hex');
 return new URLSearchParams({...fields,hash}).toString();
}
