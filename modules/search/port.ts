import type {Terms} from '../../packages/contracts/domain.ts';
import type {Plan} from '../../packages/contracts/domain.ts';
import {capabilities} from '../../packages/domain/plan.ts';
import {requireThat} from '../../packages/domain/errors.ts';
export type SearchScope={kind:'PERSONAL';actorId:string}|{kind:'PLAN';actorId:string;planId:string};
export interface ApprovedFiltersV1 {version:'search-boundary.23.candidate.v1';city:string;dates:{from:string;through:string};timeWindow:{from:string;through:string;zone:string;wholeActivity:boolean}|null;excludedCategories:string[];partySize:number|null;budget:{maxMinor:string;currency:string;basis:'PER_PERSON'|'GROUP_TOTAL'}|null;inventoryRequired:boolean;}
export interface ProviderCandidate {providerId:string;externalEventId:string;externalSessionId:string|null;terms:Terms;eligibility:'PASS'|'FAIL'|'UNKNOWN';warnings:string[];}
export interface EventProvider {readonly contractVersion:string;search(filters:ApprovedFiltersV1,signal:AbortSignal):Promise<{items:ProviderCandidate[];nextCursor:string|null}>;}
export function authorizeSearch(scope:SearchScope,verifiedActorId:string,plan?:Plan){
 requireThat(scope.actorId===verifiedActorId,'FORBIDDEN',403);
 if(scope.kind==='PERSONAL')return {canSearch:true,canAddToPlan:false};
 requireThat(plan&&plan.planId===scope.planId,'NOT_FOUND',404);const cap=capabilities(plan,verifiedActorId);
 requireThat(cap.canRead,'NOT_FOUND',404);return {canSearch:true,canAddToPlan:cap.canPropose};
}
// No live provider, no fallback result, no provider receives actor/plan IDs. Owner19 must replace this candidate.
