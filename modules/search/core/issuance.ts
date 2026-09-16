import type {Approval,Candidate,Subject} from './types.ts';
export interface IssuedOffer {approval:Approval;candidate:Candidate;subject:Subject;expires_at:string}
/** Implementations are server-owned. HTTP only supplies an opaque ID, never these records. */
export interface IssuancePort {
 saveApproval(a:Approval,subject:Subject,expiresAt:string):Promise<void>;
 loadApproval(id:string,subject:Subject,now:string):Promise<Approval|null>;
 saveOffer(id:string,record:IssuedOffer):Promise<void>;
 loadOffer(id:string,subject:Subject,now:string):Promise<IssuedOffer|null>;
}
