import {createHash} from 'node:crypto';

export const NORMALIZATION_VERSION = 'povod-event/1' as const;
export type DataMode = 'SYNTHETIC' | 'LIVE';
export type PriceKind = 'KNOWN' | 'FREE' | 'FROM' | 'RANGE' | 'CONDITIONAL' | 'UNKNOWN';
export type PlaceKind = 'VENUE' | 'PARTIAL_ADDRESS' | 'ONLINE' | 'UNKNOWN';
export type Format = 'OFFLINE' | 'ONLINE' | 'UNKNOWN';
export type Outcome = 'ACCEPT' | 'PARTIAL_ACCEPT' | 'QUARANTINE' | 'REJECT';
export type Reason = {code:string; path:string; fieldHash?:string};
export type Coordinates = {lat:number; lon:number};
export type Place = {
  kind:PlaceKind; format:Format; providerVenueId:string|null; venueName:string|null;
  address:string|null; coordinates:Coordinates|null; coordinateMeaning:'VENUE'|'MEETING_POINT'|'UNKNOWN';
  evidencePaths:string[];
};
export type Price = {
  kind:PriceKind; currency:string|null; basis:'PER_PERSON'|'GROUP_TOTAL'|'UNKNOWN';
  evidenceScope:'EVENT'|'OCCURRENCE'|'UNKNOWN'; scopeAppliesToOccurrence:boolean|null;
  quoteMinMinor:string|null; quoteMaxMinor:string|null; mandatoryExtraMinMinor:string|null;
  totalMinMinor:string|null; totalMaxMinor:string|null;
  feeMode:'UNKNOWN'|'NONE'|'INCLUDED'|'ITEMIZED'; feesKnown:boolean;
  rawPriceText:string|null; isFreeClaimedBySource:boolean|null;
  conditions:string[]; parsedConfidence:'HIGH'|'MEDIUM'|'LOW'|'UNKNOWN';
  evidencePaths:string[]; feeEvidencePaths:string[]; freeEvidencePath:string|null;
};
export type Provenance = {
  providerId:string; providerEventId:string; sourceId:string; dataMode:DataMode;
  requestId:string; recordOrdinal:number; fetchedAt:string; sourceUrl:string|null;
  responseSha256:string; projectionSha256:string; transformVersion:string; rightsRevision:string;
  observationId:string|null; fragmentPath:string|null; timePaths:string[]; placePaths:string[];
};
export type Event = {
  id:string; sourceId:string; providerEventId:string; title:string; categories:string[]; categoriesComplete:boolean; categoryMappingVerified:boolean;
  sourceUrl:string|null; provenance:Provenance; semanticHash:string;
};
export type Occurrence = {
  id:string; eventId:string; nativeSessionId:string|null; aliasType:'NATIVE'|'ANON'; aliasValue:string;
  startsAt:string; endsAt:string|null; timeZone:string; timeEvidence:Record<string,string|null>; place:Place; price:Price;
  lifecycle:'UNKNOWN'|'SCHEDULED'|'POSTPONED'|'CANCELLED';
  confirmation:'CONFIRMED'|'UNCONFIRMED'; listing:'PRESENT'|'MISSING_FROM_FEED'|'UNKNOWN';
  revision:number; semanticHash:string; provenance:Provenance;
};
export type SourcePrice = {
  kind:Exclude<PriceKind,'CONDITIONAL'>; currency:string|null; basis:Price['basis'];
  evidenceScope:Price['evidenceScope']; scopeAppliesToOccurrence:boolean|null;
  quoteMinMinor:string|null; quoteMaxMinor:string|null; feeMode:Price['feeMode'];
  explicitFree:boolean|null; mandatoryExtras:{label:string; minMinor:string|null; path:string}[];
  conditions:string[]; rawPriceText:string|null; evidencePaths:string[]; feeEvidencePaths:string[]; freeEvidencePath:string|null;
  parsedConfidence:Price['parsedConfidence'];
};
export type SourcePlace = Place;
export type SourceSession = {
  path:string; precision:'EXACT'|'SPAN'|'RECURRING'; startsAt:string|null; endsAt:string|null;
  timeZone:string|null; nativeSessionId:string|null; nativeIdVerified:boolean;
  place:SourcePlace; price:SourcePrice|null; timePaths:string[]; timeEvidence?:Record<string,string|null>;
  unsupportedReason:string|null;
};
/** The adapter creates this bounded, provider-neutral projection. No raw body or media enters it. */
export type SourceRecord = {
  sourceId:string; providerId:string; dataMode:DataMode; providerEventId:string;
  requestId:string; recordOrdinal:number; fetchedAt:string; sourceUrl:string|null;
  responseSha256:string; apiVersion:string; transformVersion:string; rightsRevision:string;
  title:string; categories:string[]; categoriesComplete:boolean; categoryMappingVerified:boolean; price:SourcePrice; sessions:SourceSession[];
  lifecycle:'UNKNOWN'|'SCHEDULED'|'POSTPONED'|'CANCELLED';
};
export type FragmentOutcome = {path:string; outcome:Outcome|'DUPLICATE'|'UNSUPPORTED'; reasons:Reason[]; aliasValue:string|null};
export type EventProposal = Pick<Event,'sourceId'|'providerEventId'|'title'|'categories'|'categoriesComplete'|'categoryMappingVerified'|'sourceUrl'> & {provenance:Omit<Provenance,'observationId'|'fragmentPath'|'projectionSha256'>};
export type OccurrenceProposal = Omit<Occurrence,'id'|'eventId'|'revision'|'semanticHash'|'provenance'> & {path:string; timePaths:string[]};
export type NormalizedRecord = {outcome:Outcome; event:EventProposal|null; occurrences:OccurrenceProposal[]; fragments:FragmentOutcome[]; reasons:Reason[]; projectionSha256:string|null};

export function hash(value:unknown):string {return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
export function plainText(value:unknown,limit:number):string|null {
  if(typeof value!=='string')return null;
  const text=value.normalize('NFC').trim().replace(/\s+/gu,' ');
  return text.length>0&&text.length<=limit&&!/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)?text:null;
}
export function safeSourceUrl(value:unknown,allowedHosts:readonly string[]):string|null {
  if(typeof value!=='string'||value.length>2000||value.trim()!==value||/[\u0000-\u0020]/u.test(value))return null;
  try {const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.hash||!allowedHosts.includes(url.hostname.toLowerCase()))return null;return value;}
  catch{return null;}
}
export function validZone(value:unknown):value is string {
  if(typeof value!=='string'||value.length>80)return false;
  try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}
}
/** Round-trip local components and offset; Date.parse alone accepts impossible calendar dates. */
export function exactInstant(value:unknown,zone:unknown):string|null {
  if(typeof value!=='string'||!validZone(zone))return null;
  const m=/^(20\d\d|21\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,3})?(Z|[+-]\d\d:\d\d)$/.exec(value);
  if(!m)return null;
  const ms=Date.parse(value);if(!Number.isFinite(ms)||ms<Date.UTC(2000,0,1)||ms>=Date.UTC(2100,0,1))return null;
  const offset=m[7]==='Z'?0:(Number(m[7]!.slice(1,3))*60+Number(m[7]!.slice(4)))*(m[7]![0]==='+'?1:-1);
  if(Math.abs(offset)>14*60)return null;
  const local=new Date(ms+offset*60000);
  if(local.getUTCFullYear()!==Number(m[1])||local.getUTCMonth()+1!==Number(m[2])||local.getUTCDate()!==Number(m[3])||local.getUTCHours()!==Number(m[4])||local.getUTCMinutes()!==Number(m[5])||local.getUTCSeconds()!==Number(m[6]))return null;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(ms);
  const part=(name:string)=>Number(parts.find(p=>p.type===name)?.value);
  if(m[7]!=='Z'&&(part('year')!==Number(m[1])||part('month')!==Number(m[2])||part('day')!==Number(m[3])||part('hour')!==Number(m[4])||part('minute')!==Number(m[5])||part('second')!==Number(m[6])))return null;
  return new Date(ms).toISOString();
}
export function occurrenceAlias(session:Pick<OccurrenceProposal,'startsAt'|'timeZone'|'place'|'nativeSessionId'>):{type:'NATIVE'|'ANON';value:string} {
  if(session.nativeSessionId)return {type:'NATIVE',value:session.nativeSessionId};
  const p=session.place;
  const anchor=p.providerVenueId?['VENUE',p.providerVenueId]:p.address?['ADDRESS',p.address.normalize('NFC').trim().replace(/\s+/gu,' ')]:p.kind==='ONLINE'?['ONLINE']:['UNKNOWN'];
  return {type:'ANON',value:hash(['anon/1',session.startsAt,session.timeZone,p.format,anchor])};
}
