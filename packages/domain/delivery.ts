import type {DeliveryState,WireOutcome} from '../contracts/domain.ts';
// Possible submission is a point of no safe retry. UNKNOWN never expires into a safe state.
export function recoverAttempt(state:DeliveryState,wireStarted:boolean,expired:boolean):DeliveryState {
 if(state==='UNKNOWN')return 'UNKNOWN';
 if(['SUCCEEDED','DEAD','EXPIRED','CANCELLED'].includes(state))return state;
 if(state==='RUNNING'&&wireStarted)return 'UNKNOWN';
 return expired?'EXPIRED':'READY';
}
export function classifyHttp(status:number,logicalSuccess:boolean,mid:string|null,retryAfterMs:number):WireOutcome{
 if(status===200&&logicalSuccess&&mid)return {kind:'SUCCEEDED',providerMessageId:mid};
 if(status===429)return {kind:'RETRY_WAIT',retryAfterMs:Math.max(1000,retryAfterMs),reason:'PROVIDER_429'};
 if(status>=400&&status<500)return {kind:'DEAD',reason:'PROVIDER_REJECTED'};
 // 5xx / redirects / undecodable 200 may follow submission. No generic retry of unsafe POST.
 if(status===200&&!logicalSuccess)return {kind:'DEAD',reason:'LOGICAL_FAILURE'};
 return {kind:'UNKNOWN',reason:'POSSIBLE_SUBMISSION'};
}
