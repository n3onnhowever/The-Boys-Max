import type {OccurrenceView} from '../../../../packages/domain/occurrence-view.ts';
import type {SavedViewModel} from './saved.ts';
import type {SearchEventViewModel} from './search.ts';
import type {DetailViewModel} from './detail.ts';
import {safeDemoSourceUrl,safeExternalUrl} from '../core/links.ts';
import {RUNTIME_CATEGORY_OPTIONS} from './search.ts';
import {artworkCategory,categoryArtwork} from './category-artwork.ts';

export interface SavedResponse {items:{savedAt:string;occurrence:OccurrenceView}[]}
const DAY=86400000;
export function savedToViewModel(response:SavedResponse,now=new Date()):SavedViewModel{
 const upcoming:SearchEventViewModel[]=[],later:SearchEventViewModel[]=[];
 for(const {occurrence:o} of response.items){
  const start=Date.parse(o.startsAt);
  if(!Number.isFinite(start)||start<=now.getTime())continue;
  const dateTimeLabel=new Intl.DateTimeFormat('ru-RU',{timeZone:o.timeZone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(start));
  const categoryLabel=RUNTIME_CATEGORY_OPTIONS.find(option=>o.categories.includes(option.id))?.label;
  const artwork=categoryArtwork(artworkCategory(o.categories)),demo=o.source.sourceId?.startsWith('synthetic:povod-demo:')??false;
  const event={id:o.id,title:o.title,dateTimeLabel,venue:o.venue.name??o.venue.address??(o.venue.state==='ONLINE'?'Онлайн':'Место уточняется'),priceLabel:o.price.kind==='CONDITIONAL'?'Цена с условиями':o.price.label,
   artwork:artwork.url,artworkAlt:artwork.alt,categoryLabel,sourceLabel:demo?'Демо-каталог':undefined,saved:true};
  (start-now.getTime()<=30*DAY?upcoming:later).push(event);
 }
 return {provenance:'SERVER_ADAPTER',title:'Сохранённое',segments:[{id:'upcoming',label:'Ближайшие'},{id:'later',label:'Позже'}],events:{upcoming,later}};
}
export function savedOccurrenceToDetail(occurrence:OccurrenceView,origins:readonly string[]):DetailViewModel{
 const o=occurrence;
 const start=new Intl.DateTimeFormat('ru-RU',{timeZone:o.timeZone,day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(o.startsAt));
 const end=o.endsAt?new Intl.DateTimeFormat('ru-RU',{timeZone:o.timeZone,hour:'2-digit',minute:'2-digit'}).format(new Date(o.endsAt)):null;
 const venue=o.venue.name??o.venue.address??(o.venue.state==='ONLINE'?'Онлайн':'Место уточняется');
 const artwork=categoryArtwork(artworkCategory(o.categories));
 const demoUrl=safeDemoSourceUrl(o.source.url,typeof window==='undefined'?null:window.location.origin);
 const demo=Boolean(demoUrl);
 const url=demoUrl??safeExternalUrl(o.source.url,origins);
 return {provenance:'SERVER_ADAPTER',id:o.id,title:o.title,heroDateTimeLabel:start,heroVenueLabel:o.venue.name??o.venue.address,
  heroArtwork:artwork.url,heroArtworkAlt:artwork.alt,tags:o.categories.map(category=>RUNTIME_CATEGORY_OPTIONS.find(option=>option.id===category)?.label??'Другое'),description:'Актуальное описание сейчас недоступно. Это сохранённые сведения об источнике и времени события.',
  occurrence:{dateLabel:null,startLabel:start,endLabel:end},
  venue:{name:o.venue.name,address:o.venue.address,displayLabel:venue},
  price:{label:o.price.label,displayLabel:o.price.label,note:o.warnings.includes('FEES_UNKNOWN')?'Итоговая стоимость не подтверждена':null},
  source:{label:demo?'Демо-каталог':'Источник события',freshnessLabel:null,url,availability:url?'AVAILABLE':'UNAVAILABLE',statusLabel:url?'Открыть источник':'Ссылка на источник недоступна'},
  primaryAction:url?{kind:'SOURCE_LINK',label:'Перейти к источнику',href:url}:{kind:'UNAVAILABLE',label:'Источник недоступен',href:null},
  saveCapability:'AVAILABLE',shareCapability:'UNAVAILABLE',planCapability:'UNAVAILABLE',saved:true,attendance:null};
}
