/** View-only boundary candidate. Replace mapping with owners 19/23 adapters on merge.
 * Not a second Price/Eligibility/Membership evaluator. No authority is persisted here. */
export const CONTRACT = 'the-boys.visual-port.26.v1-candidate' as const;
export type Scope = { kind: 'PERSONAL' } | { kind: 'PLAN'; planId: string };
export type Route = { kind: 'CATALOG'; scope: Scope }
  | { kind: 'EVENT'; sourceId: string; externalEventId: string; occurrenceId: string | null; scope: Scope }
  | { kind: 'PLAN'; planId: string } | { kind: 'INVITE'; inviteRef: string };
export interface Revision {
  state_version: number;
  search_context_revision: number | null;
  config_revision: number;
  electorate_version: number;
  selection_revision: number;
  snapshot_id: string | null;
  terms_revision: number | null;
}
export interface SearchDraft {
  text: string; city: string; date: string; startLocal: string; endLocal: string;
  timeZone: string; excludeCategories: string[]; includedCategories: string[]; participants: string;
  budgetText: string; budgetCurrency: 'RUB'; priceBasis: 'PER_PERSON' | 'GROUP_TOTAL' | 'UNKNOWN';
}
export interface PriceView {
  baseLabel: string;
  totalLabel: string | null;
  basisLabel: string;
  fees_known: boolean;
  warnings: string[];
}
export interface PlaceView {
  address: string;
  coordinates: { lat: number; lon: number } | null;
  navigationUrl: string | null;
  attribution: string | null;
  geoView?: import('../../../../modules/maps/component/core/geo.ts').GeoMapView;
}
export interface ExternalRef {
  offerId: string; contextRevision: number; sourceId: string; externalEventId: string; occurrenceId: string | null; observationId: string;
}
export interface EventCardView {
  ref: ExternalRef; title: string; startLabel: string; categoryLabel: string;
  place: PlaceView; price: PriceView; sourceLabel: string; sourceUrl: string | null;
  freshnessLabel: string; eligibilityLabel: string; description: string;
}
export type Feasibility = 'CAN' | 'CANNOT' | 'UNKNOWN';
export type ActionName = 'SEARCH' | 'ADD_TO_PLAN' | 'CREATE_OWNED_OPTION' | 'CREATE_INVITE'
  | 'REQUEST_JOIN' | 'APPROVE_JOIN' | 'SAVE_ANSWER' | 'SELECT_OPTION'
  | 'CONFIRM_SELECTED' | 'EDIT_OPTION' | 'START_COLLECTION';
interface BaseView {
  contract: typeof CONTRACT; actorId: string; route: Route; actions: ActionName[];
  revision: Revision | null; notice: string | null;
}
export interface CatalogView extends BaseView {
  kind: 'CATALOG'; query: SearchDraft; approvedFilterLabels: string[];
  events: EventCardView[]; aiState: 'AVAILABLE' | 'UNAVAILABLE'; aiMessage: string;
}
export interface EventView extends BaseView {
  kind: 'EVENT'; event: EventCardView; targetPlanId: string | null; unknownReasons:string[];
}
export interface InviteView extends BaseView {
  kind: 'INVITE'; state: 'REQUESTABLE' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';
  inviteRef: string; activePlanId: string | null;
  context?:{organizerName:string;planTitle:string;eventTitle:string|null;startsAt:string|null;venue:string|null}|null;
}
export interface OptionView {
  optionId: string; snapshotId: string; termsRevision: number; presentationRevision: number;
  title: string; startLabel: string; startLocal: string; timeZone: string;
  price: PriceView; place: PlaceView; description: string;
  eligibility: 'READY' | 'PROVISIONAL' | 'BLOCKED'; eligibilityMessage: string;
  aggregate: { CAN: number; CANNOT: number; UNKNOWN: number; MISSING: number; STALE: number };
  selfAnswer: Feasibility | 'MISSING' | 'STALE';
}
export interface OrganizerView {
  slots: { slotId: string; label: string; required: boolean; boundActorId: string | null }[];
  joinRequests: { requestId: string; actorId: string; displayName: string; state: 'PENDING' | 'ACTIVE' }[];
  responseRows: { displayName: string; optionId: string; value: Feasibility | 'MISSING' | 'STALE' }[];
}
export interface PlanView extends BaseView {
  kind: 'PLAN'; planId: string; title: string; phase: 'DRAFT' | 'COLLECTING' | 'SELECTED' | 'CLOSED' | 'CANCELLED';
  role: 'ORGANIZER' | 'PARTICIPANT'; organizerParticipates: boolean; organizer: OrganizerView | null;
  options: OptionView[]; selectedOptionId: string | null; ruleLabel: string; resultLabel: string;
  decisionMessage: string; expectedCount: number; unboundCount: number;
  selfCommitment: 'CONFIRMED' | 'DECLINED' | 'MISSING' | 'STALE' | 'NOT_PARTICIPATING';
  inviteUrl: string | null;
}
export type View = CatalogView | EventView | InviteView | PlanView;
export interface NewPlan {title:string;participantSlots:number;organizerParticipates:boolean;decisionLocal:string;commitmentLocal:string;timeZone:string;}
export type Command =
  | { type: 'SEARCH'; scope: Scope; draft: SearchDraft }
  | { type: 'ADD_TO_PLAN'; eventRef: ExternalRef; targetPlanId: string | null; newPlan:NewPlan|null; ackUnknownReasons:string[] }
  | { type: 'CREATE_OWNED_OPTION'; scope: Scope; title: string; startLocal: string; timeZone: string; address: string; priceNote: string }
  | { type: 'CREATE_INVITE'; planId: string }
  | { type: 'REQUEST_JOIN'; inviteRef: string }
  | { type: 'APPROVE_JOIN'; planId: string; requestId: string; actorId: string; slotId: string }
  | { type: 'SAVE_ANSWER'; planId: string; optionId: string; value: Feasibility }
  | { type: 'SELECT_OPTION'; planId: string; optionId: string; provisionalReason: string | null }
  | { type: 'CONFIRM_SELECTED'; planId: string; value: 'CONFIRMED' | 'DECLINED' }
  | { type: 'EDIT_OPTION'; planId: string; optionId: string; patch: { title: string; startLocal: string; timeZone: string } }
  | { type: 'START_COLLECTION'; planId: string };
export interface Envelope {
  contract: typeof CONTRACT; idempotencyKey: string; expected: Revision | null; command: Command;
}
export interface Receipt {
  idempotencyKey: string; outcome: 'APPLIED' | 'REPLAYED' | 'NO_CHANGE'; view: View;
}
export interface VisualPort {
  read(route: Route, signal: AbortSignal): Promise<View>;
  execute(envelope: Envelope): Promise<Receipt>;
}
export interface Codec {
  view(input: unknown): View;
  receipt(input: unknown): Receipt;
}
