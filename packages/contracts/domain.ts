export const CONTRACT_VERSION = 'the-boys.backend.26.v1-candidate' as const;
export type ActorId = string;
export type {Price,Amount as PriceAmount} from '../../modules/search/core/types.ts';
import type {Price,Candidate} from '../../modules/search/core/types.ts';
/** Immutable, minimal source record. No personal query/history, party size, consent or member list. */
export type SourceSnapshot=Pick<Candidate,'ref'|'provenance'|'price'|'venue'|'rights'|'warnings'|'starts_at'|'ends_at'>;
export interface Terms {title:string; activityIdentity:string; startsAt:string|null; endsAt:string|null; timeZone:string;
  place:string|null; participationUrl:string|null; obligations:string; price:Price; warnings:string[];}
export interface Snapshot {snapshotId:string; termsRevision:number; presentationRevision:number; terms:Terms; source?:SourceSnapshot;}
export interface Option {optionId:string; snapshots:Snapshot[];}
export interface Slot {slotId:string; label:string; required:boolean; actorId:string|null; state:'UNBOUND'|'ACTIVE'|'LEFT';}
export type Rule = {kind:'ALL'}|{kind:'MIN';n:number};
export interface Response {actorId:string;slotId:string;optionId:string;answeredSnapshotId:string;termsRevision:number;value:'CAN'|'CANNOT'|'UNKNOWN';acceptedAt:string;}
export interface Commitment {actorId:string;slotId:string;selectionRevision:number;selectedSnapshotId:string;value:'CONFIRMED'|'DECLINED';acceptedAt:string;}
export interface Plan {version:typeof CONTRACT_VERSION;planId:string;organizerId:string;title:string;stateVersion:number;configRevision:number;
  electorateVersion:number;selectionRevision:number;phase:'DRAFT'|'COLLECTING'|'SELECTED'|'CLOSED'|'CANCELLED';
  slots:Slot[];rule:Rule;options:Option[];responses:Response[];commitments:Commitment[];
  selectedOptionId:string|null;decisionDeadline:string;commitmentDeadline:string;}
export type Command =
 | {kind:'ADD_OPTION';expectedStateVersion:number;optionId:string;snapshotId:string;terms:Terms}
 | {kind:'EDIT_OPTION';expectedStateVersion:number;optionId:string;snapshotId:string;terms:Terms;cosmetic:boolean;reason:string}
 | {kind:'START';expectedStateVersion:number}
 | {kind:'RESPOND';expectedStateVersion:number;optionId:string;termsRevision:number;value:Response['value']}
 | {kind:'SELECT';expectedStateVersion:number;optionId:string;allowProvisional:boolean;reason:string}
 | {kind:'COMMIT';expectedStateVersion:number;selectionRevision:number;value:Commitment['value']}
 | {kind:'ROSTER';expectedStateVersion:number;slots:Slot[];rule:Rule;decisionDeadline:string;reason:string}
 | {kind:'EXTEND';expectedStateVersion:number;decisionDeadline:string;commitmentDeadline:string;reason:string}
 | {kind:'CANCEL';expectedStateVersion:number;reason:string};
export type DeliveryState='READY'|'QUEUED'|'RUNNING'|'SUCCEEDED'|'RETRY_WAIT'|'UNKNOWN'|'DEAD'|'CANCELLED'|'EXPIRED';
export type WireOutcome={kind:'SUCCEEDED';providerMessageId:string}|{kind:'RETRY_WAIT';retryAfterMs:number;reason:string}|{kind:'UNKNOWN'|'DEAD';reason:string};
