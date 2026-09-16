import {type Approval,type EventProvider,INTENT_FIELDS,type Page,type ProviderProfile,type ProviderQuery,type SemanticContext} from './types.ts';
import {canonical,copy,fail,freeze,id,integer,keys,obj,text} from './guard.ts';
import {assertApproval} from './authority.ts';
import {activeField} from './search.ts';
/** Query is issued only from the server-confirmed object, not a model-produced JSON. */
/** Pure compilation only. Caller must check persisted approval + current ACL before I/O. */
export function compileProviderQuery(a:Approval,p:ProviderProfile,ctx:SemanticContext,maxItems=100):ProviderQuery {
 assertApproval(a,ctx);integer(maxItems,1,100);if(!p.active)fail('PROVIDER_DISABLED');
 const i=a.hard;if(!i.city||!Object.hasOwn(p.city_map,i.city.id))fail('PROVIDER_CITY_NEEDS_CLARIFICATION','city');
 const remote:Record<string,string>=p.id==='KudaGo'?{location:p.city_map[i.city.id]!,lang:'ru',page_size:String(Math.min(20,maxItems)),expand:'dates,place',fields:'id,title,dates,location,place,categories,price,is_free,site_url'}:
  {'cities[0]':p.city_map[i.city.id]!,limit:String(Math.min(20,maxItems)),'fields[0]':'id','fields[1]':'name','fields[2]':'starts_at','fields[3]':'ends_at','fields[4]':'location','fields[5]':'categories','fields[6]':'url','fields[7]':'ticket_types'};
 // Do NOT push a lossy date/span filter: an event start date is not a session filter.
 // Verified exclusions narrow only when ALL requested mappings are known.
 const mapped=i.excluded_categories.map(c=>p.category_map[c]);
 let pushedExclusions=false;
 if(p.mapping_evidence_ref&&mapped.length&&mapped.every((x):x is string=>typeof x==='string')){
  if(p.id==='KudaGo'){if(mapped.some(x=>!/^[a-z][a-z0-9-]*$/.test(x)))fail('INVALID_TAXONOMY_MAPPING');remote.categories=mapped.map(x=>'-'+x).join(',');}
  else {mapped.forEach((x,j)=>{if(!/^[1-9]\d{0,8}$/.test(x))fail('INVALID_TAXONOMY_MAPPING');remote[`category_ids_exclude[${j}]`]=x;});}
  pushedExclusions=true;
 }
 const q:ProviderQuery={schema_version:'max.provider-query/3-candidate',provider_id:p.id,approval_id:a.approval_id,hard:copy(i),canonical_hard_json:a.canonical_hard_json,
  coverage:INTENT_FIELDS.filter(f=>activeField(i,f)).map(field=>({field,enforcement:field==='interested_count'?'CONTEXT_ONLY':field==='city'||field==='excluded_categories'&&pushedExclusions?'PUSH_DOWN_AND_RECHECK':'POST_CHECK'})),remote_params:remote,max_items:maxItems};
 return freeze(q);
}
const HOSTS={KudaGo:'https://kudago.com/public-api/v1.4/events/',Timepad:'https://api.timepad.ru/v1/events'} as const;
/** Provider next URLs are never accepted. Cursor is an integer page/offset only. */
export function fixedProviderUrl(q:ProviderQuery,cursor:string|null):string {
 if(q.schema_version!=='max.provider-query/3-candidate'||q.canonical_hard_json!==canonical(q.hard)||!Object.hasOwn(HOSTS,q.provider_id))fail('INVALID_PROVIDER_QUERY');
 integer(q.max_items,1,100);id(q.approval_id);const params=obj(q.remote_params);
 const u=new URL(HOSTS[q.provider_id]);
 for(const [k,v] of Object.entries(params)){
  const allowed=q.provider_id==='KudaGo'?['location','lang','page_size','expand','fields','categories'].includes(k):/^(limit|cities\[0\]|fields\[[0-7]\]|category_ids_exclude\[[0-7]\])$/.test(k);
  if(!allowed)fail('REMOTE_PARAM_NOT_ALLOWED');const value=text(v,'param',512);if(/[\u0000-\u001f]/.test(value))fail('REMOTE_PARAM_NOT_ALLOWED');u.searchParams.append(k,value);
 }
 const c=cursor===null?(q.provider_id==='KudaGo'?'1':'0'):cursor;
 if(typeof c!=='string'||!/^(0|[1-9]\d{0,5})$/.test(c)||q.provider_id==='KudaGo'&&c==='0')fail('INVALID_CURSOR');
 u.searchParams.set(q.provider_id==='KudaGo'?'page':'skip',c);return u.toString();
}
export interface ReadOnlyTransport {
 /** Owner 23 implements fixed-host TLS, public-IP pinning, redirect rejection, timeout,
  * body limit, response MIME checking and quota handling. This port carries NO token. */
 get(request:{url:string;method:'GET';redirect:'error';max_bytes:number;timeout_ms:number},signal:AbortSignal):Promise<{status:number;body:unknown;retry_after_seconds:number|null}>;
}
export class MappedEventProvider implements EventProvider {
 readonly profile:ProviderProfile;
private readonly transport:ReadOnlyTransport;
private readonly normalize:(raw:unknown,query:ProviderQuery,cursor:string|null)=>Page;
constructor( profile:ProviderProfile,  transport:ReadOnlyTransport,  normalize:(raw:unknown,query:ProviderQuery,cursor:string|null)=>Page){this.profile=profile;this.transport=transport;this.normalize=normalize;}
 async search(query:ProviderQuery,cursor:string|null,signal:AbortSignal):Promise<Page>{
  if(query.provider_id!==this.profile.id||!this.profile.active)fail('PROVIDER_DISABLED_OR_MISMATCH');
  if(signal.aborted)fail('SEARCH_ABORTED');
  const response=await this.transport.get({url:fixedProviderUrl(query,cursor),method:'GET',redirect:'error',max_bytes:262144,timeout_ms:10000},signal);
  if(signal.aborted)fail('SEARCH_ABORTED');
  if(response.status===429)fail('PROVIDER_RATE_LIMITED');if(response.status!==200)fail('PROVIDER_HTTP_NOT_OK');
  return this.normalize(response.body,query,cursor);
 }
}
/** A page list is bounded, not a promise to exhaust a live mutable feed. */
export function parsePageEnvelope(raw:unknown):Page {
 const p=obj(raw);keys(p,['items','next_cursor','coverage','warnings']);if(!Array.isArray(p.items)||p.items.length>100)fail('PAGE_BOUND');
 const c=obj(p.coverage);keys(c,['scope_id','all_pages_consumed','snapshot_consistent','truncated']);id(c.scope_id);
 for(const k of ['all_pages_consumed','snapshot_consistent','truncated'])if(typeof c[k]!=='boolean')fail('BOOLEAN_REQUIRED');
 if(p.next_cursor!==null&&(typeof p.next_cursor!=='string'||!/^(0|[1-9]\d{0,5})$/.test(p.next_cursor)))fail('INVALID_CURSOR');
 if(c.all_pages_consumed===true&&(p.next_cursor!==null||c.truncated===true))fail('CONTRADICTORY_PAGE_COVERAGE');
 if(!Array.isArray(p.warnings))fail('ARRAY_REQUIRED');return copy(p) as unknown as Page;
}
