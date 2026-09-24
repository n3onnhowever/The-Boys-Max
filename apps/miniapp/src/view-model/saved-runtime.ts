import type {OccurrenceView} from '../../../../packages/domain/occurrence-view.ts';
import type {SavedViewModel} from './saved.ts';
import type {SearchEventViewModel} from './search.ts';
import type {DetailViewModel} from './detail.ts';
import {safeExternalUrl} from '../core/links.ts';

export interface SavedResponse {items:{savedAt:string;occurrence:OccurrenceView}[]}
const DAY=86400000;
export function savedToViewModel(response:SavedResponse,now=new Date()):SavedViewModel{
 const upcoming:SearchEventViewModel[]=[],later:SearchEventViewModel[]=[];
 for(const {occurrence:o} of response.items){
  const start=Date.parse(o.startsAt);
  if(!Number.isFinite(start)||start<=now.getTime())continue;
  const dateTimeLabel=new Intl.DateTimeFormat('ru-RU',{timeZone:o.timeZone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(start));
  const event={id:o.id,title:o.title,dateTimeLabel,venue:o.venue.name??o.venue.address??(o.venue.state==='ONLINE'?'Онлайн':'Место уточняется'),priceLabel:o.price.label,
   artwork:null,artworkAlt:'',saved:true};
  (start-now.getTime()<=30*DAY?upcoming:later).push(event);
 }
 return {provenance:'SERVER_ADAPTER',title:'Сохранённое',segments:[{id:'upcoming',label:'Ближайшие'},{id:'later',label:'Позже'}],events:{upcoming,later}};
}
export function savedOccurrenceToDetail(occurrence:OccurrenceView,origins:readonly string[]):DetailViewModel{
 const o=occurrence;
 const start=new Intl.DateTimeFormat('ru-RU',{timeZone:o.timeZone,day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(o.startsAt));
 const end=o.endsAt?new Intl.DateTimeFormat('ru-RU',{timeZone:o.timeZone,hour:'2-digit',minute:'2-digit'}).format(new Date(o.endsAt)):null;
 const venue=o.venue.name??o.venue.address??(o.venue.state==='ONLINE'?'Онлайн':'Место уточняется');
 const url=safeExternalUrl(o.source.url,origins);
 return {provenance:'SERVER_ADAPTER',id:o.id,title:o.title,heroDateTimeLabel:start,heroVenueLabel:o.venue.name??o.venue.address,
  heroArtwork:null,heroArtworkAlt:'',tags:o.categories,description:'Описание отсутствует',
  occurrence:{dateLabel:null,startLabel:start,endLabel:end},
  venue:{name:o.venue.name,address:o.venue.address,displayLabel:venue},
  price:{label:o.price.label,displayLabel:o.price.label,note:o.warnings.includes('FEES_UNKNOWN')?'Итоговая стоимость не подтверждена':null},
  source:{label:o.source.providerId,freshnessLabel:null,url,availability:url?'AVAILABLE':'UNAVAILABLE',statusLabel:url?'Открыть источник':'Ссылка на источник недоступна'},
  primaryAction:url?{kind:'SOURCE_LINK',label:'Перейти к источнику',href:url}:{kind:'UNAVAILABLE',label:'Источник недоступен',href:null},
  saveCapability:'AVAILABLE',shareCapability:'UNAVAILABLE',planCapability:'UNAVAILABLE',saved:true,attendance:null};
}
