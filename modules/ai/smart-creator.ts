import type {Candidate,Eligibility} from '../search/core/types.ts';
import {rightsCheck} from '../search/core/eligibility.ts';

/** Read-only creator input. The canonical adapter must supply the admission receipt.
 * No transport call is made here; Follow persistence and creator scheduling need a later ticket. */
export interface SmartCreatorInput {
 actorId:string;followedTopic:'Выставки';canonicalOccurrenceId:string;canonicalRevision:number;
 admissionState:'APPROVED'|'BLOCKED';eventRef:string;candidate:Candidate;eligibility:Eligibility;now:string;
}
export function eligibleExhibitionFollow(input:SmartCreatorInput):boolean {
 const c=input.candidate;
 return input.admissionState==='APPROVED'&&input.canonicalRevision>0&&/^[a-f0-9]{32}$/.test(input.eventRef)
  &&c.provenance.data_mode==='LIVE'&&c.city_id==='msk'&&c.categories.mapping_verified&&c.categories.known.includes('MUSEUM')
  &&c.time_precision==='EXACT_OCCURRENCE'&&c.starts_at!==null&&Date.parse(c.starts_at)>Date.parse(input.now)
  &&input.eligibility.status==='PASS'&&rightsCheck(c.rights,'display_facts',input.now).status==='PASS'
  &&rightsCheck(c.rights,'display_text',input.now).status==='PASS';
}
