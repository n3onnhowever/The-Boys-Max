import type {Event,Occurrence,Price} from './event.ts';
export type OccurrenceView={
  id:string;eventId:string;title:string;categories:string[];categoriesComplete:boolean;categoryMappingVerified:boolean;
  startsAt:string;endsAt:string|null;timeZone:string;timeState:'UPCOMING'|'ENDED'|'IN_PROGRESS'|'STARTED_END_UNKNOWN';
  venue:{state:'VENUE'|'PARTIAL_ADDRESS'|'ONLINE'|'UNKNOWN';name:string|null;address:string|null;coordinates:{lat:number;lon:number}|null};
  price:{kind:Price['kind'];label:string;conditions:string[];totalMinMinor:string|null;totalMaxMinor:string|null;currency:string|null;basis:Price['basis'];evidenceScope:Price['evidenceScope']};
  source:{providerId:string;providerEventId:string;url:string|null;canOpen:boolean;fetchedAt:string};
  lifecycle:Occurrence['lifecycle'];confirmation:Occurrence['confirmation'];warnings:string[];
};
function money(minor:string,currency:string|null){if(currency!=='RUB')return minor+' '+(currency??'');const value=BigInt(minor),kopecks=value%100n;return String(value/100n)+(kopecks===0n?'':','+String(kopecks).padStart(2,'0'))+' \u20bd';}
function priceLabel(price:Price):string {
  if(price.kind==='UNKNOWN')return 'Цена не указана';
  if(price.kind==='FREE')return 'Бесплатно';
  if(price.kind==='CONDITIONAL')return price.conditions.length?'Условия: '+price.conditions.join('; '):'Цена с условиями';
  if(price.kind==='FROM')return 'От '+money(price.quoteMinMinor!,price.currency)+(price.feesKnown?'':' (итог не подтверждён)');
  if(price.kind==='RANGE')return money(price.quoteMinMinor!,price.currency)+'–'+money(price.quoteMaxMinor!,price.currency)+(price.feesKnown?'':' (итог не подтверждён)');
  const quote=money(price.quoteMinMinor!,price.currency);
  return price.feesKnown?quote:quote+' (итог не подтверждён)';
}
export function toOccurrenceView(event:Event,occurrence:Occurrence,asOf:string):OccurrenceView {
  if(occurrence.eventId!==event.id)throw Error('EVENT_OCCURRENCE_MISMATCH');
  const now=Date.parse(asOf);if(!Number.isFinite(now))throw Error('AS_OF_INVALID');
  const timeState=Date.parse(occurrence.startsAt)>now?'UPCOMING':
    occurrence.endsAt===null?'STARTED_END_UNKNOWN':
    Date.parse(occurrence.endsAt)<=now?'ENDED':'IN_PROGRESS';
  const sourceUrl=occurrence.provenance.sourceUrl;
  let canOpen=false;
  if(sourceUrl){try{const url=new URL(sourceUrl);canOpen=['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;}catch{/* unavailable */}}
  const warnings:string[]=[];
  if(occurrence.endsAt===null)warnings.push('END_UNKNOWN');
  if(occurrence.place.kind==='UNKNOWN')warnings.push('PLACE_UNKNOWN');
  if(occurrence.price.kind==='UNKNOWN')warnings.push('PRICE_UNKNOWN');
  if(occurrence.price.kind==='CONDITIONAL')warnings.push('PRICE_CONDITIONAL');
  if(occurrence.price.feeMode==='UNKNOWN')warnings.push('FEES_UNKNOWN');
  if(occurrence.lifecycle==='UNKNOWN')warnings.push('LIFECYCLE_UNKNOWN');
  if(!canOpen)warnings.push('SOURCE_UNAVAILABLE');
  return {
    id:occurrence.id,eventId:event.id,title:event.title,categories:event.categories,categoriesComplete:event.categoriesComplete,categoryMappingVerified:event.categoryMappingVerified,
    startsAt:occurrence.startsAt,endsAt:occurrence.endsAt,timeZone:occurrence.timeZone,timeState,
    venue:{state:occurrence.place.kind,name:occurrence.place.venueName,address:occurrence.place.address,coordinates:occurrence.place.coordinates},
    price:{kind:occurrence.price.kind,label:priceLabel(occurrence.price),conditions:occurrence.price.conditions,
      totalMinMinor:occurrence.price.totalMinMinor,totalMaxMinor:occurrence.price.totalMaxMinor,
      currency:occurrence.price.currency,basis:occurrence.price.basis,evidenceScope:occurrence.price.evidenceScope},
    source:{providerId:occurrence.provenance.providerId,providerEventId:occurrence.provenance.providerEventId,
      url:canOpen?sourceUrl:null,canOpen,fetchedAt:occurrence.provenance.fetchedAt},
    lifecycle:occurrence.lifecycle,confirmation:occurrence.confirmation,warnings,
  };
}
