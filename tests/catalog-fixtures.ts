/** Locally authored SYNTHETIC data. No provider response, inventory, price or rights claim. */
import type {Candidate,Price} from '../modules/search/core/types.ts';
import {priceFromQuote} from '../modules/search/core/price.ts';
import {parseCandidate} from '../modules/search/core/candidate.ts';
export function itemizedPrice(observation='synthetic-500-30'):Price {
 return priceFromQuote({kind:'EXACT',exact_minor:'50000',basis:'PER_PERSON',currency:'RUB',fees_known:true,fee_mode:'ITEMIZED',fee_evidence_ref:'OWNED_TEST_ONLY',extras:[{label:'Синтетический обязательный сбор',required:true,price:{knownness:'KNOWN',basis:'PER_PERSON',currency:'RUB',amount:{kind:'EXACT',exact_minor:'3000',min_minor:null,max_minor:null}},source_field:'owned_fixture.fee'}],warnings:[]},observation);
}
export function syntheticCandidate(now='2026-09-16T10:00:00.000Z',id='synthetic-500-30'):Candidate {
 const n=Date.parse(now),iso=(offset:number)=>new Date(n+offset).toISOString();
 return parseCandidate({schema_version:'max.event-occurrence/3-candidate',ref:{kind:'EXTERNAL',provider_id:'ManualProvider',event_id:id,occurrence_id:id+'-session',native_occurrence_id:null},
  untrusted_title:'ТЕСТ: персональная афиша — 500 + 30',untrusted_description:'Подготовленный синтетический пример команды The Boys. Не реальное мероприятие; билеты не продаются.',city_id:'msk',starts_at:iso(4*86400000),ends_at:iso(4*86400000+7200000),time_precision:'EXACT_OCCURRENCE',categories:{known:['THEATRE'],complete:true,mapping_verified:true},price:itemizedPrice(id),inventory:{remaining:null,observed_at:null},indoor:true,wheelchair_accessible:null,status:'SCHEDULED',listing_state:'PRESENT',provider_health:'OK',
  venue:{id:'synthetic-venue',address:'Синтетическое место — не использовать для поездки',coordinates:null,coordinate_meaning:'UNKNOWN'},
  provenance:{observation_id:id,observed_at:now,fetched_at:now,provider_updated_at:null,source_url:null,payload_sha256:null,transform_version:'owned-fixture26.1',field_sources:{price:['owned_fixture.base','owned_fixture.fee'],date:['owned_fixture.session']},data_mode:'SYNTHETIC'},
  rights:{policy_id:'owned-synthetic26',policy_revision:'1',reviewed_at:iso(-60000),review_due_at:iso(86400000),revoked_at:null,display_facts:'ALLOWED',display_text:'ALLOWED',display_images:'DENIED',persist_minimal:'ALLOWED',ad_clearance:'CLEARED',evidence_refs:['OWNED_SYNTHETIC_TEST_ONLY']},warnings:[{code:'SYNTHETIC_TEST_DATA',field:'event',message:'Подготовленный тестовый пример, не реальная афиша.'}]});
}
