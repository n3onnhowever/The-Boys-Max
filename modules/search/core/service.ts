import {randomUUID} from 'node:crypto';
import type {IssuancePort} from './issuance.ts';
import {type Approval,type Candidate,type Eligibility,type EventProvider,type OptionSnapshot,type OptionStore,type PolicyPort,type ProposalCommitGuard,type Rights,type SearchScope,type SemanticContext,type Subject,type Warning} from './types.ts';
import {assertIssuedApproval,assertBinding,loadCapability,requireCapability} from './authority.ts';
import {candidateKey,parseCandidate,parseRights} from './candidate.ts';
import {canonical,copy,fail,freeze,id,integer} from './guard.ts';
import {evaluateEligibility,rightsCheck} from './eligibility.ts';
import {compileProviderQuery,parsePageEnvelope} from './provider.ts';
import {parseBinding,parseScope} from './search.ts';
import {warning} from './price.ts';
export interface RightsPort {load(provider:Candidate['ref']['provider_id']):Promise<Rights>}
export interface Offer {offer_id:string;ref:Candidate['ref'];title:string|null;price:Candidate['price'];starts_at:string|null;ends_at:string|null;source_url:string|null;eligibility:Eligibility}
export interface SearchResult {matched:Offer[];unconfirmed:Offer[];rejected:{key:string;reasons:string[]}[];warnings:Warning[];complete:false;pages_read:number}
/** Durable-port service. HTTP adapters must keep these objects server-side; never trust a
 * serialized client offer as authority. Durable issuance/receipts are owned by 23. */
export class SearchService {
 private readonly policy:PolicyPort;
private readonly rights:RightsPort;
private readonly context:()=>SemanticContext;
private readonly issuance:IssuancePort;
constructor(  policy:PolicyPort,  rights:RightsPort,  context:()=>SemanticContext,  issuance:IssuancePort){this.policy=policy;this.rights=rights;this.context=context;this.issuance=issuance;}
 private async authorize(a:Approval,subject:Subject,action:'SEARCH'|'PROPOSE_OPTION') {
  await assertIssuedApproval(a,subject,this.context(),this.issuance);const c=await this.policy.load(subject,a.scope);
  const valid=requireCapability(c,subject,a.scope,action,this.context().now_utc);assertBinding(a,valid);return valid;
 }
 async search(a:Approval,subject:Subject,provider:EventProvider,options:{max_pages:number;max_items:number;signal:AbortSignal}):Promise<SearchResult>{
  integer(options.max_pages,1,5);integer(options.max_items,1,100);
  const cap=await this.authorize(a,subject,'SEARCH');if(!cap.external_enabled)fail('EXTERNAL_SEARCH_DISABLED');
  const q=compileProviderQuery(a,provider.profile,this.context(),options.max_items);
  const seen=new Map<string,Candidate>(),conflicts=new Set<string>(),cursors=new Set<string>();
  const warnings:Warning[]=[],rejected:SearchResult['rejected']=[];let cursor:string|null=null,pages=0;
  do {
   if(options.signal.aborted)fail('SEARCH_ABORTED');
   const page=parsePageEnvelope(await provider.search(q,cursor,options.signal));pages++;
   const after=await this.authorize(a,subject,'SEARCH');if(!after.external_enabled)fail('EXTERNAL_SEARCH_DISABLED');
   if(options.signal.aborted)fail('SEARCH_ABORTED');
   for(const raw of page.items){const c=parseCandidate(raw);if(c.ref.provider_id!==provider.profile.id)fail('PROVIDER_REF_MISMATCH');const key=candidateKey(c.ref),prior=seen.get(key);
    if(prior&&canonical(prior)!==canonical(c)){conflicts.add(key);continue;}
    if(!prior&&seen.size<options.max_items)seen.set(key,c);
   }
   warnings.push(...page.warnings);cursor=page.next_cursor;
   if(cursor!==null){if(cursors.has(cursor))fail('PAGINATION_LOOP');cursors.add(cursor);}
  }while(cursor!==null&&pages<options.max_pages&&seen.size<options.max_items);
  const rights=parseRights(await this.rights.load(provider.profile.id));
  // A withdrawal while awaiting provider/rights must not leak even the returned result.
  const finalCap=await this.authorize(a,subject,'SEARCH');if(!finalCap.external_enabled)fail('EXTERNAL_SEARCH_DISABLED');
  const result:SearchResult={matched:[],unconfirmed:[],rejected,warnings,complete:false,pages_read:pages};
  for(const [key,raw] of seen){
   if(conflicts.has(key)){rejected.push({key:'redacted',reasons:['DUPLICATE_OCCURRENCE_CONFLICT']});continue;}
   const c=parseCandidate({...copy(raw),rights});const e=evaluateEligibility(a.hard,c,this.context());
   // Unknown/denied rights are NOT permission to expose unconfirmed content.
   const r=rightsCheck(rights,'display_facts',this.context().now_utc);
   if(r.status!=='PASS'){rejected.push({key:'redacted',reasons:[r.reason]});continue;}
   if(e.status==='FAIL'){rejected.push({key,reasons:e.checks.filter(x=>x.status==='FAIL').map(x=>x.reason)});continue;}
   const offer:Offer=freeze({offer_id:randomUUID(),ref:copy(c.ref),title:rightsCheck(rights,'display_text',this.context().now_utc).status==='PASS'?c.untrusted_title:null,
    price:copy(c.price),starts_at:c.starts_at,ends_at:c.ends_at,source_url:c.provenance.source_url,eligibility:e});
   await this.issuance.saveOffer(offer.offer_id,{approval:a,candidate:c,subject:copy(subject),expires_at:new Date(Math.min(Date.parse(finalCap.expires_at),Date.parse(this.context().now_utc)+900000)).toISOString()});
   (e.status==='PASS'?result.matched:result.unconfirmed).push(offer);
  }
  result.warnings.push(warning('BOUNDED_DISCOVERY_NOT_COMPLETE','coverage','Поиск ограничен страницами; отсутствие результата не доказывает отсутствие события.'));
  return freeze(result);
 }
 /** Explicit proposal creates ONLY an immutable draft. No vote, consent, roster, selection,
  * booking, notification or queue mutation is performed here. */
 async propose(offerId:string,subject:Subject,targetScope:SearchScope,expectedTargetBinding:unknown,ackUnknownReasons:readonly string[],idempotencyKey:string,store:OptionStore):Promise<OptionSnapshot>{
  id(idempotencyKey);const issued=await this.issuance.loadOffer(id(offerId),subject,this.context().now_utc);
  if(!issued||canonical(issued.subject)!==canonical(subject))fail('UNTRUSTED_OR_FOREIGN_OFFER');
  const a=issued.approval;await this.authorize(a,subject,'SEARCH');parseScope(targetScope);
  if(targetScope.kind!=='PLAN_PRIVATE')fail('TARGET_PLAN_REQUIRED');
  if(a.scope.kind==='PLAN_PRIVATE'&&a.scope.plan_id!==targetScope.plan_id)fail('CROSS_PLAN_OFFER_FORBIDDEN');
  const binding=parseBinding(expectedTargetBinding,targetScope);
  const cap=await loadCapability(this.policy,subject,targetScope,'PROPOSE_OPTION',this.context().now_utc);
  if(canonical(cap.binding)!==canonical(binding))fail('STALE_TARGET_BINDING');
  return store.transaction(async tx=>{
   // Adapter must lock the persisted offer and authority in this same PG transaction.
   await tx.assertIssued(offerId,subject,this.context().now_utc,canonical(issued));
   const policy=parseRights(await this.rights.load(issued.candidate.ref.provider_id));
   if(rightsCheck(policy,'persist_minimal',this.context().now_utc).status!=='PASS'||rightsCheck(policy,'display_facts',this.context().now_utc).status!=='PASS')fail('RIGHTS_NOT_CONFIRMED_FOR_SNAPSHOT');
   const c=parseCandidate({...copy(issued.candidate),rights:policy});const e=evaluateEligibility(a.hard,c,this.context());
   if(e.status==='FAIL')fail('INELIGIBLE_OFFER');
   const required=[...new Set(e.checks.filter(x=>x.status==='UNKNOWN').map(x=>x.reason))].sort();
   if(!Array.isArray(ackUnknownReasons)||ackUnknownReasons.some(x=>typeof x!=='string')||canonical([...new Set(ackUnknownReasons)].sort())!==canonical(required))fail('UNKNOWN_ACK_REQUIRED');
   // Store is server-owned and must verify key scope + payload fingerprint atomically.
   const ids=await tx.allocateIds();id(ids.option_id);id(ids.snapshot_id);
   const current= requireCapability(await tx.loadCapability(subject,targetScope),subject,targetScope,'PROPOSE_OPTION',this.context().now_utc);
   if(canonical(current.binding)!==canonical(binding))fail('STALE_TARGET_BINDING');
   // Also check personal/source authority in this SAME transaction immediately before append.
   const source=requireCapability(await tx.loadCapability(subject,a.scope),subject,a.scope,'SEARCH',this.context().now_utc);assertBinding(a,source);
   const finalRights=parseRights(await this.rights.load(c.ref.provider_id));
   if(canonical(finalRights)!==canonical(policy))fail('RIGHTS_CHANGED_DURING_PROPOSAL');
   const finalCap=requireCapability(await tx.loadCapability(subject,targetScope),subject,targetScope,'PROPOSE_OPTION',this.context().now_utc);
   if(canonical(finalCap.binding)!==canonical(binding))fail('STALE_TARGET_BINDING');
   const finalEligibility=evaluateEligibility(a.hard,c,this.context());
   if(canonical(finalEligibility.checks)!==canonical(e.checks)||finalEligibility.status!==e.status)fail('ELIGIBILITY_CHANGED_DURING_PROPOSAL');
   const snapshot:OptionSnapshot=freeze({schema_version:'max.option-snapshot/3-candidate',ref:{kind:'PLAN_OPTION',plan_id:targetScope.plan_id,option_id:ids.option_id,snapshot_id:ids.snapshot_id},external_ref:copy(c.ref),terms_revision:1,presentation_revision:1,created_at:this.context().now_utc,
    terms:{starts_at:c.starts_at,ends_at:c.ends_at,venue:copy(c.venue),price:copy(c.price)},provenance:copy(c.provenance),rights:finalRights,warnings:copy(finalEligibility.warnings),eligibility:finalEligibility,interested_count_at_proposal:a.hard.interested_count,state:'DRAFT',terms_complete:false});
   const guard:ProposalCommitGuard=freeze({subject:copy(subject),source_scope:copy(a.scope),source_binding:copy(a.binding),target_scope:copy(targetScope),target_binding:copy(binding),idempotency_key:idempotencyKey,rights_policy_revision:finalRights.policy_revision,
    request_fingerprint:canonical({approval_id:a.approval_id,source_binding:a.binding,target_scope:targetScope,target_binding:binding,external_ref:c.ref,observation_id:c.provenance.observation_id,unknown_ack:required})});
   return tx.appendImmutable(snapshot,guard);
  });
 }
}
