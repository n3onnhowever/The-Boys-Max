import {type Candidate,CATEGORIES,type ExternalRef,type Provenance,type Rights} from './types.ts';
import {arr,bool,canonical,copy,en,fail,freeze,id,integer,keys,nullableText,obj,sourceLink,stringArray,text,utc} from './guard.ts';
import {parsePrice,parseWarnings} from './price.ts';
export function parseExternalRef(value:unknown):ExternalRef {
 const r=obj(value,'external_ref');keys(r,['kind','provider_id','event_id','occurrence_id','native_occurrence_id']);if(r.kind!=='EXTERNAL')fail('EXTERNAL_REF_REQUIRED');
 return {kind:'EXTERNAL',provider_id:en(r.provider_id,['KudaGo','Timepad','ManualProvider'] as const),event_id:id(r.event_id),occurrence_id:id(r.occurrence_id),native_occurrence_id:r.native_occurrence_id===null?null:id(r.native_occurrence_id)};
}
export function candidateKey(ref:ExternalRef):string {return canonical([ref.provider_id,ref.event_id,ref.occurrence_id]);}
export function parseRights(value:unknown):Rights {
 const r=obj(value,'rights');keys(r,['policy_id','policy_revision','reviewed_at','review_due_at','revoked_at','display_facts','display_text','display_images','persist_minimal','ad_clearance','evidence_refs']);
 utc(r.reviewed_at);utc(r.review_due_at);if(utc(r.review_due_at)<=utc(r.reviewed_at))fail('RIGHTS_REVIEW_ORDER');if(r.revoked_at!==null)utc(r.revoked_at);
 const perm=(v:unknown)=>en(v,['ALLOWED','DENIED','UNKNOWN'] as const);
 return {policy_id:id(r.policy_id),policy_revision:id(r.policy_revision),reviewed_at:r.reviewed_at as string,review_due_at:r.review_due_at as string,revoked_at:r.revoked_at as string|null,
  display_facts:perm(r.display_facts),display_text:perm(r.display_text),display_images:perm(r.display_images),persist_minimal:perm(r.persist_minimal),ad_clearance:en(r.ad_clearance,['CLEARED','UNKNOWN','BLOCKED'] as const),evidence_refs:stringArray(r.evidence_refs,'rights.evidence_refs',30)};
}
export function parseProvenance(value:unknown,ref:ExternalRef):Provenance {
 const p=obj(value,'provenance');keys(p,['observation_id','observed_at','fetched_at','provider_updated_at','source_url','payload_sha256','transform_version','field_sources','data_mode']);
 utc(p.observed_at);utc(p.fetched_at);if(p.provider_updated_at!==null)utc(p.provider_updated_at);
 if(utc(p.observed_at)>utc(p.fetched_at))fail('OBSERVATION_AFTER_FETCH');
 if(p.payload_sha256!==null&&(typeof p.payload_sha256!=='string'||! /^[a-f0-9]{64}$/.test(p.payload_sha256)))fail('INVALID_PAYLOAD_HASH');
 const fs=obj(p.field_sources),field_sources:Record<string,string[]>=Object.create(null);if(Object.keys(fs).length>30)fail('FIELD_SOURCES_BOUND');
 for(const [k,v] of Object.entries(fs)){text(k,'field_name',128);if(['__proto__','prototype','constructor'].includes(k))fail('RESERVED_FIELD_NAME');field_sources[k]=stringArray(v,'field_refs',20);}
 return {observation_id:id(p.observation_id),observed_at:p.observed_at as string,fetched_at:p.fetched_at as string,provider_updated_at:p.provider_updated_at as string|null,
  source_url:sourceLink(p.source_url,ref.provider_id),payload_sha256:p.payload_sha256 as string|null,transform_version:id(p.transform_version),field_sources,data_mode:en(p.data_mode,['LIVE','SYNTHETIC'] as const)};
}
export function parseCandidate(value:unknown):Candidate {
 const c=obj(value,'candidate');if(c.schema_version!=='max.event-occurrence/3-candidate')fail('EVENT_WIRE_VERSION_REQUIRED');
 keys(c,['schema_version','ref','untrusted_title','untrusted_description','city_id','starts_at','ends_at','time_precision','categories','price','inventory','indoor','wheelchair_accessible','status','listing_state','provider_health','venue','provenance','rights','warnings']);
 const ref=parseExternalRef(c.ref),provenance=parseProvenance(c.provenance,ref),price=parsePrice(c.price);
 if(price.provenance.observation_id!==provenance.observation_id)fail('PRICE_OBSERVATION_MISMATCH');
 const starts_at=c.starts_at===null?null:text(c.starts_at),ends_at=c.ends_at===null?null:text(c.ends_at);if(starts_at)utc(starts_at);if(ends_at)utc(ends_at);if(starts_at&&ends_at&&utc(ends_at)<=utc(starts_at))fail('OCCURRENCE_TIME_ORDER');
 const cats=obj(c.categories);keys(cats,['known','complete','mapping_verified']);const known=stringArray(cats.known,'categories',8).map(x=>en(x,CATEGORIES)),complete=bool(cats.complete),mapping_verified=bool(cats.mapping_verified);
 if(complete&&!mapping_verified)fail('UNVERIFIED_COMPLETE_TAXONOMY');
 const inv=obj(c.inventory);keys(inv,['remaining','observed_at']);const remaining=inv.remaining===null?null:integer(inv.remaining,0,1000000),observed_at=inv.observed_at===null?null:text(inv.observed_at);if(observed_at)utc(observed_at);if(remaining!==null&&observed_at===null)fail('INVENTORY_EVIDENCE_TIME_REQUIRED');
 const venue=obj(c.venue);keys(venue,['id','address','coordinates','coordinate_meaning']);let coordinates:Candidate['venue']['coordinates']=null;
 if(venue.coordinates!==null){const p=obj(venue.coordinates);keys(p,['lat','lon']);if(typeof p.lat!=='number'||!Number.isFinite(p.lat)||p.lat< -90||p.lat>90||typeof p.lon!=='number'||!Number.isFinite(p.lon)||p.lon< -180||p.lon>180)fail('INVALID_COORDINATES');coordinates={lat:p.lat,lon:p.lon};}
 const optionalBool=(v:unknown)=>v===null?null:bool(v);
 if(typeof c.untrusted_description!=='string'||c.untrusted_description.length>4000)fail('DESCRIPTION_BOUND');
 if(typeof c.untrusted_title!=='string'||c.untrusted_title.length>200)fail('TITLE_BOUND');
 return freeze({schema_version:'max.event-occurrence/3-candidate',ref,untrusted_title:c.untrusted_title,untrusted_description:c.untrusted_description,city_id:c.city_id===null?null:id(c.city_id),starts_at,ends_at,
  time_precision:en(c.time_precision,['EXACT_OCCURRENCE','EVENT_SPAN','UNKNOWN'] as const),categories:{known,complete,mapping_verified},price,inventory:{remaining,observed_at},indoor:optionalBool(c.indoor),wheelchair_accessible:optionalBool(c.wheelchair_accessible),
  status:en(c.status,['SCHEDULED','POSTPONED','CANCELLED','UNKNOWN'] as const),listing_state:en(c.listing_state,['PRESENT','MISSING_FROM_FEED','UNKNOWN'] as const),provider_health:en(c.provider_health,['OK','UNREACHABLE','UNKNOWN'] as const),
  venue:{id:venue.id===null?null:id(venue.id),address:nullableText(venue.address,'address',500),coordinates,coordinate_meaning:en(venue.coordinate_meaning,['VENUE','MEETING_POINT','UNKNOWN'] as const)},provenance,rights:parseRights(c.rights),warnings:parseWarnings(c.warnings)});
}
