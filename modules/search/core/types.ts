/** Candidate interfaces owned by direction 19. Never accept authority from an LLM/HTTP body. */
export const VERSION = 'max.search/3-candidate' as const;
export const CATEGORIES = ['CINEMA','THEATRE','CONCERT','MUSEUM','SPORT','OUTDOOR','VOLUNTEER','OTHER'] as const;
export type Category = typeof CATEGORIES[number];
export type Verdict = 'PASS'|'FAIL'|'UNKNOWN';
export type Basis = 'PER_PERSON'|'GROUP_TOTAL'|'UNKNOWN';
export type Amount =
 | {kind:'FREE';exact_minor:null;min_minor:null;max_minor:null}
 | {kind:'EXACT';exact_minor:string;min_minor:null;max_minor:null}
 | {kind:'RANGE';exact_minor:null;min_minor:string;max_minor:string};
export type Money =
 | {knownness:'UNKNOWN';basis:Basis;currency:string|null;amount:null}
 | {knownness:'KNOWN';basis:Basis;currency:string|null;amount:Amount};
export interface Warning {code:string;field:string;message:string}
export interface Extra {label:string;required:boolean;price:Money;source_field:string}
export type FeeMode = 'UNKNOWN'|'NONE'|'INCLUDED'|'ITEMIZED';
export interface PriceQuote {
 kind:'UNKNOWN'|'FREE'|'EXACT'|'RANGE'|'FROM'|'TEXT'; basis:Basis;currency:string|null;
 exact_minor?:string|null;min_minor?:string|null;max_minor?:string|null;
 raw_label?:string|null;source_field?:string|null;fees_known:boolean;fee_mode:FeeMode;
 fee_evidence_ref?:string|null;extras:Extra[];warnings:Warning[];
}
export interface Price {
 schema_version:'max.price/3-candidate';
 source_quote:PriceQuote;
 /** Source amount; in INCLUDED mode this is already all-in, NOT an exclusive base. */
 quoted_amount_role:'BASE'|'ALL_IN';base_price:Money;
 fees_known:boolean;mandatory_fees:{mode:FeeMode;items:Extra[];evidence_ref:string|null};
 total_price:Money;warnings:Warning[];
 provenance:{observation_id:string;group_size_at_quote:number|null};
}
export interface SearchIntent {
 city:{id:string;label:string}|null;
 date:{kind:'EXACT';on:string}|{kind:'RANGE';from:string;through:string}|null;
 timezone:string|null;
 time_window:{start:string;end:string;end_day_offset:0|1;mode:'STARTS_WITHIN'|'FULLY_WITHIN'|'UNKNOWN'}|null;
 included_categories:Category[];excluded_categories:Category[];
 interested_count:number|null;
 inventory_requirement:{kind:'NOT_REQUESTED'}|{kind:'AT_LEAST';quantity:number};
 budget:{max_minor:string;currency:string;basis:'PER_PERSON'|'GROUP_TOTAL'}|null;
 indoor:boolean|null;wheelchair_required:boolean|null;
}
export const INTENT_FIELDS = ['city','date','timezone','time_window','included_categories','excluded_categories','interested_count','inventory_requirement','budget','indoor','wheelchair_required'] as const;
export type IntentField = typeof INTENT_FIELDS[number];
export interface SearchDraft {
 schema_version:typeof VERSION;state:'DRAFT'|'NEEDS_CLARIFICATION'|'REFUSED';intent:SearchIntent;
 coverage:Record<IntentField,'SET'|'NOT_MENTIONED'|'CLARIFY'|'UNSUPPORTED'>;
 issues:{field:IntentField;code:string;question:string}[];
}
export type SearchScope = {kind:'PERSONAL';search_context_id:string}|{kind:'PLAN_PRIVATE';search_context_id:string;plan_id:string};
export type Binding = {acl_revision:number;search_context_revision:number;plan:null|{config_revision:number;electorate_version:number;selection_revision:number;candidate_set_revision:number}};
export type Action = 'SEARCH'|'CONFIRM_SEARCH'|'PROPOSE_OPTION'|'PUBLISH_OPTION'|'READ_OWN_RESPONSE'|'READ_RESPONSE_MATRIX';
export interface Subject {actor_id:string;session_id:string}
/** Returned only by the injected, server-owned policy adapter (owner 23). */
export interface Capability {
 actor_id:string;scope:SearchScope;binding:Binding;actions:readonly Action[];
 session_active:boolean;expires_at:string;external_enabled:boolean;policy_version:string;
}
export interface PolicyPort {load(subject:Subject,scope:SearchScope):Promise<Capability>}
export interface Approval {
 schema_version:'max.approved-search/3-candidate';approval_id:string;actor_id:string;
 scope:SearchScope;binding:Binding;hard:SearchIntent;canonical_hard_json:string;approved_at:string;
}
export interface ExternalRef {kind:'EXTERNAL';provider_id:'KudaGo'|'Timepad'|'ManualProvider';event_id:string;occurrence_id:string;native_occurrence_id:string|null}
export interface PlanOptionRef {kind:'PLAN_OPTION';plan_id:string;option_id:string;snapshot_id:string}
export type Permission = 'ALLOWED'|'DENIED'|'UNKNOWN';
export interface Rights {
 policy_id:string;policy_revision:string;reviewed_at:string;review_due_at:string;revoked_at:string|null;
 display_facts:Permission;display_text:Permission;display_images:Permission;persist_minimal:Permission;
 ad_clearance:'CLEARED'|'UNKNOWN'|'BLOCKED';evidence_refs:string[];
}
export interface Provenance {
 observation_id:string;observed_at:string;fetched_at:string;provider_updated_at:string|null;
 source_url:string|null;payload_sha256:string|null;transform_version:string;
 field_sources:Record<string,string[]>;data_mode:'LIVE'|'SYNTHETIC';
}
/** Exactly one occurrence. Provider dates that are only event spans are not sessions. */
export interface Candidate {
 schema_version:'max.event-occurrence/3-candidate';ref:ExternalRef;
 untrusted_title:string;untrusted_description:string;
 city_id:string|null;starts_at:string|null;ends_at:string|null;
 time_precision:'EXACT_OCCURRENCE'|'EVENT_SPAN'|'UNKNOWN';
 categories:{known:Category[];complete:boolean;mapping_verified:boolean};
 price:Price;inventory:{remaining:number|null;observed_at:string|null};
 indoor:boolean|null;wheelchair_accessible:boolean|null;
 status:'SCHEDULED'|'POSTPONED'|'CANCELLED'|'UNKNOWN';
 listing_state:'PRESENT'|'MISSING_FROM_FEED'|'UNKNOWN';provider_health:'OK'|'UNREACHABLE'|'UNKNOWN';
 venue:{id:string|null;address:string|null;coordinates:{lat:number;lon:number}|null;coordinate_meaning:'VENUE'|'MEETING_POINT'|'UNKNOWN'};
 provenance:Provenance;rights:Rights;warnings:Warning[];
}
export interface Check {field:string;status:Verdict;reason:string}
export interface Eligibility {
 schema_version:'max.eligibility/3-candidate';policy_version:'eligibility-policy/3-candidate';
 status:Verdict;checks:Check[];warnings:Warning[];evaluated_at:string;
}
export interface SemanticContext {
 now_utc:string;cities:ReadonlyMap<string,{label:string;timezones:readonly string[]}>;
 max_future_days:number;freshness_ttl_seconds:number;inventory_ttl_seconds:number;
}
export interface ProviderProfile {
 id:'KudaGo'|'Timepad';active:boolean;city_map:Readonly<Record<string,string>>;
 /** Map only after taxonomy evidence review. Unknown mapping must not be pushed. */
 category_map:Readonly<Partial<Record<Category,string>>>;mapping_evidence_ref:string|null;
}
export interface ProviderQuery {
 schema_version:'max.provider-query/3-candidate';provider_id:'KudaGo'|'Timepad';
 approval_id:string;hard:SearchIntent;canonical_hard_json:string;
 coverage:{field:IntentField;enforcement:'PUSH_DOWN_AND_RECHECK'|'POST_CHECK'|'CONTEXT_ONLY'}[];
 remote_params:Readonly<Record<string,string>>;max_items:number;
}
export interface Page {items:Candidate[];next_cursor:string|null;coverage:{scope_id:string;all_pages_consumed:boolean;snapshot_consistent:boolean;truncated:boolean};warnings:Warning[]}
export interface EventProvider {
 readonly profile:ProviderProfile;
 search(query:ProviderQuery,cursor:string|null,signal:AbortSignal):Promise<Page>;
}
export interface OptionSnapshot {
 schema_version:'max.option-snapshot/3-candidate';ref:PlanOptionRef;external_ref:ExternalRef;
 terms_revision:number;presentation_revision:number;created_at:string;
 terms:{starts_at:string|null;ends_at:string|null;venue:Candidate['venue'];price:Price};
 provenance:Provenance;rights:Rights;warnings:Warning[];eligibility:Eligibility;
 interested_count_at_proposal:number|null;state:'DRAFT';terms_complete:false;
}
export interface ProposalCommitGuard {
 subject:Subject;source_scope:SearchScope;source_binding:Binding;target_scope:SearchScope;target_binding:Binding;
 idempotency_key:string;request_fingerprint:string;rights_policy_revision:string;
}
/** The DB implementation MUST lock/check BOTH ACLs + revisions, enforce the scoped
 * idempotency fingerprint, recheck rights, then append in one serializable transaction. */
export interface OptionTransaction {
 assertIssued(offerId:string,subject:Subject,now:string,canonicalRecord:string):Promise<void>;
 loadCapability(subject:Subject,scope:SearchScope):Promise<Capability>;
 allocateIds():Promise<{option_id:string;snapshot_id:string}>;
 appendImmutable(snapshot:OptionSnapshot,guard:ProposalCommitGuard):Promise<OptionSnapshot>;
}
export interface OptionStore {transaction<T>(fn:(tx:OptionTransaction)=>Promise<T>):Promise<T>}
