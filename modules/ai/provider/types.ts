export type Category = 'CINEMA'|'THEATRE'|'CONCERT'|'MUSEUM'|'SPORT'|'OUTDOOR'|'VOLUNTEER'|'OTHER';
export type SearchIntent = {
  city:{id:string;label:string}|null;
  date:{kind:'EXACT';on:string}|{kind:'RANGE';from:string;through:string}|null;
  time_window:{start:string;end:string;end_day_offset:0|1;mode:'STARTS_WITHIN'|'FULLY_WITHIN'|'UNKNOWN'}|null;
  timezone:string|null;
  excluded_categories:Category[];included_categories:Category[];
  /** Search quantity only. Never a membership or inventory mutation. */
  party_size:number|null;
  /** User ceiling, not an event price. All fee/eligibility work belongs to shared module 19. */
  budget:{max_minor:string;currency:string;basis:'PER_PERSON'|'GROUP_TOTAL'|'UNKNOWN'}|null;
  indoor:boolean|null;wheelchair_required:boolean|null;
  /** Null means NOT REQUESTED, not an inventory check inferred from party_size. */
  require_available:boolean|null;
};
export type Field = keyof SearchIntent;
export type Issue = {field:Field|'request';code:'AMBIGUOUS'|'MISSING'|'CONTRADICTION'|'INVALID_DATE'|'INVALID_QUANTITY'|'UNSUPPORTED'|'TIMEZONE'|'DST'|'WRITE_REQUEST'|'UNTRUSTED_INSTRUCTION'|'REFUSAL'};
export type Candidate = {
  version:'ai-candidate/3';state:'DRAFT'|'NEEDS_CLARIFICATION'|'REFUSED';intent:SearchIntent;
  coverage:Record<Field,'SET'|'NOT_MENTIONED'|'CLARIFY'|'UNSUPPORTED'>;issues:Issue[];
  /** A proposal only: transport does not execute it, no scope/IDs/URLs in LLM arguments. */
  read_tool:null|{name:'request_approved_search';arguments:Record<string,never>};
};
export type PublicCity = {id:string;label:string;timezone:string};
export type ParseContext = {
  local_date:string;timezone:string|null;cities:PublicCity[];
  locked_intent?:Partial<SearchIntent>;
  /** Public, bounded SOURCE DATA, never authority or instructions. Not private group answers. */
  public_descriptions?:string[];
};
export type Validation = {schema_ok:boolean;semantic_ok:boolean|null;errors:string[];candidate?:Candidate};
export type Provider = 'groq'|'mistral'|'gigachat';
export type ModelConfig = {id:string;provider:Provider;model:string;endpoint:string;models_endpoint:string;credential_env:string;request_parameters:Record<string,unknown>};
export type Usage = {input_tokens:number|null;output_tokens:number|null;total_tokens:number|null;reasoning_tokens:number|null;cached_input_tokens:number|null};
export type Observation = {
  status:'OK'|'BLOCKED'|'TIMEOUT'|'NETWORK_ERROR'|'RATE_LIMITED'|'REFUSED'|'AUTH_FAILED'|'HTTP_ERROR'|'TRUNCATED'|'INVALID_RESPONSE'|'INVALID_JSON'|'INVALID_SCHEMA'|'INVALID_SEMANTICS'|'TOOL_ERROR'|'MODEL_MISMATCH';
  provider:Provider;requested_model:string;reported_model:string|null;checkpoint_identity:'NOT_VERIFIED';
  elapsed_ms:number;time_to_usable_candidate_ms:number|null;ttft_ms:null;
  http_status:number|null;retry_after_ms:number|null;attempts:number;repair_attempts:0;
  usage:Usage;cost_amount:null;cost_currency:null;billing_verification:'NOT_OBSERVED';
  validation:Validation|null;candidate?:Candidate;raw_content?:string;
  unexpected_tool_calls:boolean|null;errors:string[];
};
export type Admission = {
  schema_version:'max.ai.admission.v1';provider:Provider;model:string;enabled:boolean;
  purpose:'SYNTHETIC_EVAL';quota_group:string;approved_by:string;valid_until:string;evidence_refs:string[];
  gates:Record<'account'|'geography'|'zero_budget'|'data_handling'|'end_user_terms'|'case_009', 'PASS'|'HOLD'|'UNKNOWN'>;
  no_paid_overage:boolean;remaining_calls:number|null;remaining_total_tokens:number|null;
  request_interval_ms:number|null;max_reserved_tokens_per_call:number|null;
  expected_reported_model:string|null;
};
export type ModelsSnapshot = {provider:Provider;requested_model:string;fetched_at:string;model_ids:string[];admission_sha256:string;source:'AUTHORIZED_MODELS_GET'};
export type TrustedScope = {kind:'PERSONAL'}|{kind:'PLAN_PRIVATE';plan_id:string};
export type ServerCapabilities = {actor_id:string;scope:TrustedScope;revision:string;can_search:boolean;external_enabled:boolean};
export type AiProvider = {parse(text:string,context:ParseContext):Promise<Observation>};
